# Security checklist

✅ means implemented and verified by tests or by inspection. 🟡 means it needs configuration or a manual check at deploy time. ⬜ means not done.

## Authentication & sessions
- ✅ Passwords are hashed with Argon2id (`@node-rs/argon2`). Policy: 10–128 characters, letters plus numbers or symbols, and must not contain the email name.
- ✅ Session tokens are 256-bit random values (32 bytes). Only their SHA-256 is stored. Cookies are HttpOnly, SameSite=Lax and Secure in production.
- ✅ Staff and customer sessions are separate. The staff cookie is scoped to `/admin` and has a shorter lifetime.
- ✅ Sign-in lockout and rate limits per IP and per email. Error messages are generic, so they don't reveal whether an account exists.
- ✅ Password reset, verification and invitation tokens are single-use, hashed and short-lived. A password reset revokes all sessions.
- ✅ "Sign out everywhere" (`revokeAllSessions`).
- ⬜ 2FA for staff (recommended before more staff are invited).

## Authorisation
- ✅ Every Studio page calls `staffPage(permission)` and every Studio action uses `studioAction(permission, …)`. Checks happen on the server; the proxy check is only an optimisation.
- ✅ Customers can only read their own orders and addresses. Guest order tracking requires the order number **and** the email.
- ✅ Staff management guards: only a Super Admin can grant or remove Super Admin or edit role permissions, you can't remove your own Super Admin role, and at least one active Super Admin must remain.
- ✅ Admin actions are recorded in `audit_logs` (actor, IP, user agent, before/after summary).

## Input & output
- ✅ zod validation on every route handler and action. JSON body limit of 64 KB.
- ✅ Drizzle uses parameterised queries; raw SQL uses `sql` template parameters only.
- ✅ React escapes output. Email templates escape all interpolated values.
- ✅ CSV exports are guarded against formula injection.
- ✅ Uploads are re-encoded by sharp (EXIF stripped). Size and type limits apply. Files are stored under random keys and never executed.

## Commerce integrity
- ✅ Prices, discounts, shipping and tax are recomputed on the server at checkout. Client totals are ignored.
- ✅ Stock uses atomic guarded updates and reservations, so it can't be oversold. This is covered by a concurrent-checkout integration test.
- ✅ Each checkout has an idempotency key, so a double submit creates only one order.
- ✅ Payment success comes only from a verified webhook plus a server-to-server status lookup. The return URL can't mark an order paid.
- ✅ Webhooks are signature-checked (constant-time compare) and deduplicated per event.
- ✅ The test gateway is impossible in production (`isProduction()`).
- ✅ The COD order value limit is enforced on the server.

## Transport & headers
- ✅ CSP (`default-src 'self'`, explicit image/connect/frame sources, `frame-ancestors 'none'`), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, and HSTS in production.
- 🟡 The CSP allows `'unsafe-inline'` for scripts, because Next.js streaming and JSON-LD need it without a nonce. Moving to nonce-based CSP would make every page dynamic, so it is a conscious trade-off.
- ✅ CSRF: same-origin check on every state-changing route handler. Server Actions have Next's built-in origin check.
- 🟡 SSL in Full (strict) mode at Cloudflare, if used.

## Privacy & indexing
- ✅ `/admin`, `/account`, cart, checkout, wishlist and search are `noindex` and disallowed in robots. `/admin` and `/account` also send an `X-Robots-Tag` header.
- ✅ Newsletter uses double opt-in. Customers can opt out in Account → Notifications.
- ⬜ One-click unsubscribe link (`List-Unsubscribe`) is needed before any marketing campaign is sent. The app does not send campaigns yet.
- ✅ Account deletion requests are queued for staff. Order records are kept for accounting, and personal data is anonymised on completion.
- ✅ No development labels ("demo", "preview") appear in the production storefront.

## Secrets & configuration
- ✅ No secrets in `NEXT_PUBLIC_*`. Only the site URL and the Turnstile site key are public.
- ✅ `.env*` is git-ignored. `.env.example` contains placeholders only.
- ✅ Studio → Settings → Service status shows *whether* each integration is configured, never the value.
- 🟡 Rotate `CRON_SECRET`, the Safepay and Stripe secrets, the Resend key and the R2 keys if they are ever exposed. Rotating any of them needs no code change.

## Operations
- ✅ DB-backed rate limits on register, login, reset, checkout, newsletter and contact.
- ✅ Errors are returned without stack traces. Details go to server logs only.
- 🟡 Backups and a tested restore (DEPLOYMENT_GUIDE §9).
- ⬜ Error monitoring (Sentry SDK not installed).
- ⬜ Dependency audit in CI (`npm audit --omit=dev`) and Dependabot.
- ⬜ External penetration test before scaling marketing spend.
