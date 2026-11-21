import "server-only";
import type { Permission, StaffMember } from "@/types";
import { can } from "./permissions";

/**
 * ─────────────────────────────  AUTHENTICATION BOUNDARY  ─────────────────────────────
 * Phase 1: NOT AUTHENTICATED. The admin UI runs on local state in "preview mode" and
 * lets you switch the previewed role client-side purely to review permission-gated UI.
 * Hiding a button is NOT security.
 *
 * Phase 2 (Supabase):
 *  - `getStaffSession()` reads the Supabase session from cookies (@supabase/ssr), loads the
 *    staff member + role, and returns null for customers/anonymous users.
 *  - `src/proxy.ts` (Next 16 request proxy) redirects unauthenticated /admin requests to /admin/login.
 *  - Every Server Action / Route Handler that mutates admin data calls `requirePermission()`
 *    first, and RLS policies enforce the same matrix in the database.
 */
export async function getStaffSession(): Promise<StaffMember | null> {
  return null; // intentionally unauthenticated in Phase 1
}

export async function requirePermission(permission: Permission): Promise<StaffMember> {
  const member = await getStaffSession();
  if (!member || !can(member, permission)) {
    throw new Error(`Forbidden: missing ${permission}`);
  }
  return member;
}
