import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "../db";
import { rolePermissions, roles, staffRoleAssignments, staffUsers, userSessions, users } from "../db/schema";
import { AppError, newId, randomToken, sha256 } from "../lib/core";
import { requestMeta } from "../lib/request";
import { hasPermission, type Permission } from "./permissions";
import type { Actor } from "../audit";

/**
 * Cookie-based sessions stored in MySQL (user_sessions). The cookie holds a random 256-bit token;
 * the database stores only its SHA-256, so a database leak doesn't expose live sessions.
 * Customer and staff sessions use separate cookies; the staff cookie is scoped to /admin.
 */
export const COOKIE = {
  customer: { name: "ns_session", path: "/", maxAge: 60 * 60 * 24 * 30 },
  staff: { name: "ns_staff", path: "/admin", maxAge: 60 * 60 * 12 },
} as const;

const secure = () => process.env.NODE_ENV === "production" && !process.env.APP_URL?.startsWith("http://");

export async function createSession(subject: "customer" | "staff", subjectId: string) {
  const token = randomToken();
  const meta = await requestMeta();
  const cfg = COOKIE[subject];
  const now = new Date();
  await db.insert(userSessions).values({
    id: newId("ses"), tokenHash: sha256(token), subject,
    userId: subject === "customer" ? subjectId : null, staffUserId: subject === "staff" ? subjectId : null,
    ip: meta.ip, userAgent: meta.userAgent, expiresAt: new Date(now.getTime() + cfg.maxAge * 1000), lastSeenAt: now,
  });
  (await cookies()).set(cfg.name, token, { httpOnly: true, secure: secure(), sameSite: "lax", path: cfg.path, maxAge: cfg.maxAge, priority: "high" });
  return token;
}

export async function destroySession(subject: "customer" | "staff") {
  const jar = await cookies();
  const cfg = COOKIE[subject];
  const token = jar.get(cfg.name)?.value;
  if (token) await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.tokenHash, sha256(token)));
  jar.set(cfg.name, "", { httpOnly: true, secure: secure(), sameSite: "lax", path: cfg.path, maxAge: 0 });
}

export async function revokeAllSessions(subject: "customer" | "staff", subjectId: string) {
  await db.update(userSessions).set({ revokedAt: new Date() })
    .where(and(subject === "customer" ? eq(userSessions.userId, subjectId) : eq(userSessions.staffUserId, subjectId), isNull(userSessions.revokedAt)));
}

async function readSession(subject: "customer" | "staff") {
  const token = (await cookies()).get(COOKIE[subject].name)?.value;
  if (!token || token.length > 100) return null;
  // Session validity depends on the current time: always evaluate at request time, never in a prerender.
  await connection().catch(() => undefined);
  const [s] = await db.select().from(userSessions)
    .where(and(eq(userSessions.tokenHash, sha256(token)), eq(userSessions.subject, subject), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, new Date())))
    .limit(1);
  if (!s) return null;
  // Touch at most every 5 minutes to keep writes low.
  if (Date.now() - s.lastSeenAt.getTime() > 5 * 60_000) await db.update(userSessions).set({ lastSeenAt: new Date() }).where(eq(userSessions.id, s.id));
  return s;
}

/* ───────────────────────────── Customers ───────────────────────────── */

export interface CustomerSession { id: string; email: string; firstName: string; lastName: string; emailVerified: boolean; sessionId: string }

export const getCustomer = cache(async (): Promise<CustomerSession | null> => {
  const s = await readSession("customer");
  if (!s?.userId) return null;
  const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
  if (!u || u.status !== "active") return null;
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, emailVerified: !!u.emailVerifiedAt, sessionId: s.id };
});

export async function requireCustomer() {
  const c = await getCustomer();
  if (!c) throw new AppError("Please sign in to continue.", "unauthenticated", 401);
  return c;
}

/* ───────────────────────────── Staff ───────────────────────────── */

export interface StaffSession {
  id: string; email: string; name: string; isSuperAdmin: boolean; roles: { id: string; key: string; name: string }[];
  permissions: Set<string>; sessionId: string;
}

export async function loadStaffPermissions(staffUserId: string) {
  const rows = await db.select({ roleId: roles.id, key: roles.key, name: roles.name, perm: rolePermissions.permissionKey })
    .from(staffRoleAssignments)
    .innerJoin(roles, eq(roles.id, staffRoleAssignments.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(eq(staffRoleAssignments.staffUserId, staffUserId));
  const roleMap = new Map<string, { id: string; key: string; name: string }>();
  const perms = new Set<string>();
  for (const r of rows) {
    roleMap.set(r.roleId, { id: r.roleId, key: r.key, name: r.name });
    if (r.perm) perms.add(r.perm);
  }
  return { roles: [...roleMap.values()], permissions: perms };
}

export const getStaff = cache(async (): Promise<StaffSession | null> => {
  const s = await readSession("staff");
  if (!s?.staffUserId) return null;
  const [u] = await db.select().from(staffUsers).where(eq(staffUsers.id, s.staffUserId)).limit(1);
  if (!u || u.status !== "active") return null;
  const { roles: rs, permissions } = await loadStaffPermissions(u.id);
  return { id: u.id, email: u.email, name: u.name, isSuperAdmin: u.isSuperAdmin, roles: rs, permissions, sessionId: s.id };
});

export const can = (staff: StaffSession | null, p: Permission) => !!staff && hasPermission(staff.permissions, p, staff.isSuperAdmin);

/**
 * Server-side authorization for every admin Server Action, Route Handler and page.
 * Never rely on hidden buttons — this is the security boundary.
 */
export async function requireStaff(permission?: Permission): Promise<StaffSession> {
  const staff = await getStaff();
  if (!staff) throw new AppError("Your session has expired. Please sign in again.", "unauthenticated", 401);
  if (permission && !hasPermission(staff.permissions, permission, staff.isSuperAdmin)) {
    throw new AppError("You don't have permission to do this.", "forbidden", 403);
  }
  return staff;
}

export const staffActor = (s: Pick<StaffSession, "id" | "name" | "email">): Actor => ({ type: "staff", id: s.id, label: `${s.name} <${s.email}>` });
export const customerActor = (c: Pick<CustomerSession, "id" | "email">): Actor => ({ type: "customer", id: c.id, label: c.email });
