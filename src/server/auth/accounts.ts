import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { customerProfiles, emailVerificationTokens, orders, passwordResetTokens, staffUsers, users } from "../db/schema";
import { audit, SYSTEM } from "../audit";
import { sendEmail } from "../email";
import { AppError, newId, normaliseEmail, randomToken, sha256, siteUrl } from "../lib/core";
import { requestMeta } from "../lib/request";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { limit, resetLimit } from "./rate-limit";
import { createSession, destroySession, revokeAllSessions } from "./session";

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const name = z.string().trim().min(1, "Required").max(80);

export const registerSchema = z.object({
  firstName: name, lastName: name, email: emailSchema,
  password: z.string().min(1, "Choose a password").max(128),
  marketingConsent: z.boolean().default(false),
});

/* ───────────────────────────── Customers ───────────────────────────── */

export async function registerCustomer(input: z.input<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const meta = await requestMeta();
  await limit(`register:${meta.ip}`, 10, 3600);
  const problem = passwordProblem(data.password, data.email);
  if (problem) throw new AppError(problem);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing) throw new AppError("An account with this email already exists. Sign in or reset your password.");
  const id = newId("usr");
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ id, email: data.email, passwordHash: await hashPassword(data.password), firstName: data.firstName, lastName: data.lastName, marketingConsent: data.marketingConsent });
    await tx.insert(customerProfiles).values({ userId: id, notificationPrefs: { orderUpdates: true, newsletter: data.marketingConsent, backInStock: true }, tags: [] });
  });
  await createSession("customer", id);
  await sendVerification(id, data.email, data.firstName);
  await sendEmail("welcome", data.email, { firstName: data.firstName, actionUrl: siteUrl("/account"), actionLabel: "Your account" });
  await audit({ type: "customer", id, label: data.email }, "customer.registered", "user", id, `Customer account created for ${data.email}`);
  return { id };
}

export async function sendVerification(userId: string, email: string, firstName: string) {
  const token = randomToken();
  await db.insert(emailVerificationTokens).values({ id: newId("evt"), tokenHash: sha256(token), subject: "customer", userId, purpose: "verify", expiresAt: new Date(Date.now() + 24 * 3600_000) });
  await sendEmail("email_verification", email, { firstName, actionUrl: siteUrl(`/account/verify-email?token=${token}`), actionLabel: "Confirm email" });
}

export async function verifyEmail(token: string) {
  const [t] = await db.select().from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, sha256(token)), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date()))).limit(1);
  if (!t?.userId) throw new AppError("This confirmation link is invalid or has expired.");
  await db.transaction(async (tx) => {
    await tx.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, t.id));
    await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, t.userId!));
    // Guest orders placed with this (now verified) address join the customer's order history.
    const [u] = await tx.select({ email: users.email }).from(users).where(eq(users.id, t.userId!));
    await tx.update(orders).set({ userId: t.userId! }).where(and(eq(orders.email, u.email), isNull(orders.userId)));
  });
}

export async function loginCustomer(emailRaw: string, password: string) {
  const email = normaliseEmail(emailRaw);
  const meta = await requestMeta();
  await limit(`login:ip:${meta.ip}`, 30, 900);
  await limit(`login:email:${email}`, 10, 900);
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (u?.lockedUntil && u.lockedUntil > new Date()) throw new AppError(`Too many failed attempts. Try again after ${LOCK_MINUTES} minutes or reset your password.`);
  const ok = await verifyPassword(u?.passwordHash, password);
  if (!u || !ok) {
    if (u) {
      const failed = u.failedLoginCount + 1;
      await db.update(users).set({ failedLoginCount: failed, lockedUntil: failed >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null }).where(eq(users.id, u.id));
    }
    throw new AppError("The email or password is incorrect.");
  }
  if (u.status !== "active") throw new AppError("This account is not active. Please contact client care.");
  await db.update(users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, u.id));
  await resetLimit(`login:email:${email}`);
  await createSession("customer", u.id);
  return { id: u.id };
}

export const logoutCustomer = () => destroySession("customer");

/** Always responds the same way whether or not the account exists (no account enumeration). */
export async function requestPasswordReset(subject: "customer" | "staff", emailRaw: string) {
  const email = normaliseEmail(emailRaw);
  const meta = await requestMeta();
  await limit(`reset:ip:${meta.ip}`, 10, 3600);
  await limit(`reset:email:${subject}:${email}`, 3, 3600);
  const row = subject === "customer"
    ? (await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.email, email)).limit(1))[0]
    : (await db.select({ id: staffUsers.id, status: staffUsers.status }).from(staffUsers).where(eq(staffUsers.email, email)).limit(1))[0];
  if (!row || row.status !== "active") return;
  const token = randomToken();
  await db.insert(passwordResetTokens).values({
    id: newId("prt"), tokenHash: sha256(token), subject, purpose: "reset", expiresAt: new Date(Date.now() + 3600_000),
    userId: subject === "customer" ? row.id : null, staffUserId: subject === "staff" ? row.id : null,
  });
  const path = subject === "customer" ? `/account/reset-password?token=${token}` : `/admin/reset-password?token=${token}`;
  await sendEmail("password_reset", email, { actionUrl: siteUrl(path), actionLabel: "Choose a new password" });
  if (subject === "staff") await audit(SYSTEM, "staff.password_reset_requested", "staff_user", row.id, `Password reset requested for ${email}`);
}

/** Consumes a reset or invitation token and sets the password. Revokes every existing session. */
export async function resetPassword(token: string, password: string) {
  const [t] = await db.select().from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, sha256(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
  if (!t) throw new AppError("This link is invalid or has expired. Please request a new one.");
  const email = t.subject === "customer"
    ? (await db.select({ e: users.email }).from(users).where(eq(users.id, t.userId!)))[0]?.e
    : (await db.select({ e: staffUsers.email }).from(staffUsers).where(eq(staffUsers.id, t.staffUserId!)))[0]?.e;
  const problem = passwordProblem(password, email);
  if (problem) throw new AppError(problem);
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, t.id));
    if (t.subject === "customer") await tx.update(users).set({ passwordHash: hash, failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, t.userId!));
    else await tx.update(staffUsers).set({ passwordHash: hash, failedLoginCount: 0, lockedUntil: null, ...(t.purpose === "invite" ? { status: "active" as const } : {}) }).where(eq(staffUsers.id, t.staffUserId!));
  });
  await revokeAllSessions(t.subject, (t.userId ?? t.staffUserId)!);
  if (t.subject === "staff") await audit(SYSTEM, t.purpose === "invite" ? "staff.invite_accepted" : "staff.password_reset", "staff_user", t.staffUserId, `${email} ${t.purpose === "invite" ? "accepted their invitation" : "reset their password"}`);
  return { subject: t.subject };
}

export async function changeCustomerPassword(userId: string, current: string, next: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || !(await verifyPassword(u.passwordHash, current))) throw new AppError("Your current password is incorrect.");
  const problem = passwordProblem(next, u.email);
  if (problem) throw new AppError(problem);
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
  await revokeAllSessions("customer", userId);
  await createSession("customer", userId);
}

/* ───────────────────────────── Staff ───────────────────────────── */

export async function loginStaff(emailRaw: string, password: string) {
  const email = normaliseEmail(emailRaw);
  const meta = await requestMeta();
  await limit(`staff-login:ip:${meta.ip}`, 20, 900);
  const [u] = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
  const fail = async (reason: string) => {
    await audit({ type: "anonymous", id: null, label: email }, "staff.login_failed", "staff_user", u?.id ?? null, `Failed Studio sign-in for ${email} (${reason})`);
    throw new AppError("The email or password is incorrect.");
  };
  if (u?.lockedUntil && u.lockedUntil > new Date()) {
    await audit({ type: "anonymous", id: null, label: email }, "staff.login_locked", "staff_user", u.id, `Sign-in blocked for locked account ${email}`);
    throw new AppError(`This account is temporarily locked after repeated failed attempts. Try again in ${LOCK_MINUTES} minutes or reset your password.`);
  }
  const ok = await verifyPassword(u?.passwordHash, password);
  if (!u || !ok) {
    if (u) {
      const failed = u.failedLoginCount + 1;
      await db.update(staffUsers).set({ failedLoginCount: failed, lockedUntil: failed >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null }).where(eq(staffUsers.id, u.id));
    }
    return fail(u ? "wrong password" : "unknown email");
  }
  if (u.status !== "active") return fail(`account ${u.status}`);
  await db.update(staffUsers).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(staffUsers.id, u.id));
  await createSession("staff", u.id);
  await audit({ type: "staff", id: u.id, label: `${u.name} <${u.email}>` }, "staff.login", "staff_user", u.id, `${u.name} signed in to Studio`);
  return { id: u.id };
}

export const logoutStaff = () => destroySession("staff");
