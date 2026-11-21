# Supabase repositories (Phase 2 — not implemented)

Implement the interfaces in `../types.ts` here (`supabaseRepositories: Repositories`) and switch
`DATA_SOURCE=supabase` in `../index.ts`. No UI changes are required.

Planned approach:

- `@supabase/ssr` server client created per request inside repository functions (never in components).
- Public catalogue reads (`catalog`, `commerce`, `content`) use the anon key + RLS policies that only
  expose `status = 'active' | 'published'` rows. Wrap them with `"use cache"` + `cacheTag('products')`
  and call `revalidateTag` from admin mutations / database webhooks.
- `operations` reads/writes run only in Server Actions / Route Handlers after `requirePermission()`
  (`src/lib/auth/guard.ts`) resolves the staff member from the Supabase session. RLS mirrors the
  permission matrix in `src/lib/auth/permissions.ts` (a `staff_roles` table + `has_permission(perm)` SQL function).
- Every mutation writes an `audit_log` row in the same transaction (see `src/lib/audit`).
- Payment webhooks (Route Handlers under `app/api/payments/[provider]/webhook`) verify signatures
  server-side and are the ONLY code path allowed to set `payment_status = 'paid'`.
