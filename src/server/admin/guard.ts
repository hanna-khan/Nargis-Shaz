import "server-only";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getStaff, requireStaff, type StaffSession } from "../auth/session";
import { hasPermission, type Permission } from "../auth/permissions";
import { rethrowIfNext, toFailure, type ActionResult } from "../lib/core";

/** For Studio pages (inside <Suspense>): redirects to sign-in; returns null when the permission is missing. */
export async function staffPage(permission?: Permission): Promise<{ staff: StaffSession; allowed: boolean }> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return { staff, allowed: !permission || hasPermission(staff.permissions, permission, staff.isSuperAdmin) };
}

export const staffCan = (staff: StaffSession, p: Permission) => hasPermission(staff.permissions, p, staff.isSuperAdmin);

/**
 * Wraps a Studio Server Action: authenticates, checks the permission on the server, converts errors
 * into a form result and never leaks internals. Every mutation in Studio goes through this.
 */
export function studioAction(permission: Permission, fn: (staff: StaffSession, form: FormData) => Promise<string | void | ActionResult>) {
  return async (_prev: ActionResult | null, form: FormData): Promise<ActionResult> => {
    try {
      const staff = await requireStaff(permission);
      const r = await fn(staff, form);
      if (r && typeof r === "object") return r;
      return { ok: true, message: r || "Saved" };
    } catch (e) {
      rethrowIfNext(e);
      return toFailure(e);
    }
  };
}

/** Read-your-own-writes invalidation of storefront caches after Studio edits. */
export function invalidate(...tags: ("catalog" | "content" | "commerce")[]) {
  for (const t of tags) updateTag(t);
}

/* FormData helpers */
export const f = {
  str: (form: FormData, k: string, max = 5000) => String(form.get(k) ?? "").trim().slice(0, max),
  opt: (form: FormData, k: string, max = 5000) => { const v = String(form.get(k) ?? "").trim().slice(0, max); return v || null; },
  bool: (form: FormData, k: string) => form.get(k) === "on" || form.get(k) === "true" || form.get(k) === "1",
  int: (form: FormData, k: string) => { const v = String(form.get(k) ?? "").trim(); if (!v) return null; const n = Number(v); return Number.isFinite(n) ? Math.round(n) : null; },
  /** Money input in major units ("1,250.50") → minor units. */
  money: (form: FormData, k: string) => { const v = String(form.get(k) ?? "").replace(/[,\s]/g, "").trim(); if (!v) return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null; },
  list: (form: FormData, k: string) => form.getAll(k).map(String).map((x) => x.trim()).filter(Boolean),
  lines: (form: FormData, k: string) => String(form.get(k) ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
  date: (form: FormData, k: string) => { const v = String(form.get(k) ?? "").trim(); if (!v) return null; const d = new Date(v.length === 16 ? `${v}:00+05:00` : v); return Number.isNaN(d.getTime()) ? null : d; },
};
