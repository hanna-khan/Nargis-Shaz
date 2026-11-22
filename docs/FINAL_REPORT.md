# Final report: Nargis & Shaz platform

Date: 22 November 2026. Nothing has been committed, pushed or deployed. All changes are uncommitted in the project folder, on top of `66cb293`.

## 1. Executive summary
- The Phase 1 storefront has kept its design and now runs on a real backend. That backend is MySQL with Drizzle and covers customer and staff authentication, a server-side cart and checkout with stock reservation, COD, a payment-provider abstraction with signed webhooks, order operations, a full Studio, a homepage CMS, a media pipeline, email logging, and reports.
- Everything that can be verified without third-party credentials **has been verified**: 47 unit and integration tests, 9 browser journeys, lint, types and a production build.
- **Not production-ready yet.** Safepay, Resend, R2 and Turnstile need credentials and live checks. Photography and legal texts are placeholders.

## 2. Completion by area (honest estimate)

| Area | % | Notes |
|---|---|---|
| Database, migrations, seed | 95 | Production backup and restore not yet rehearsed |
| Customer accounts | 95 | No social login (not requested) |
| Staff auth & RBAC | 90 | No 2FA |
| Catalogue & storefront on DB | 95 | |
| Inventory & reservations | 95 | |
| Cart, wishlist, coupons | 95 | |
| Checkout & COD | 95 | |
| Online payments | 55 | Test gateway is end-to-end tested; Safepay and Stripe are written but unverified |
| Orders, shipments, returns, refunds | 85 | Refund money moves manually; no courier APIs |
| Studio (admin) | 90 | |
| Homepage CMS & content | 90 | |
| Media library | 75 | Local driver tested; R2 unverified |
| Email | 70 | Templates, log and retry tested; no Resend key, so nothing has actually been delivered |
| Reports & CSV | 90 | |
| Security | 85 | See SECURITY_CHECKLIST open items |
| SEO & performance | 90 | 114 prerendered routes; Lighthouse on production not measured |
| Tests | 85 | No load test |
| Deployment readiness | 60 | Guide written; Hostinger itself not exercised |
| **Overall** | **≈ 82** | Code is largely complete; launch depends on credentials, verification and content |

## 3. Architecture
- Next.js 16 App Router with Cache Components. Public pages are prerendered, and dynamic parts are streamed inside `<Suspense>`.
- `src/server/*` holds server-only domain modules. The storefront reads through tagged `"use cache"` repositories, which Studio actions invalidate with `updateTag`.
- Details: README, DATABASE_SCHEMA, API_DOCUMENTATION.

## 4. Database
77 tables, FKs and indexes, two forward-only migrations, and an idempotent seed that never overwrites existing rows. See `DATABASE_SCHEMA.md`.

## 5. Authentication & permissions
- Argon2id hashing, hashed DB sessions, lockout and rate limits.
- Separate staff sessions, 10 roles and a permission matrix, all enforced on the server and audited.

## 6. Commerce
- Prices are recomputed on the server.
- Stock is reserved with guarded atomic updates; tested with 5 concurrent buyers for the last units.
- Checkout is idempotent, and coupons are locked during checkout.

## 7. Payments
- **COD:** works.
- **Test gateway:** used to verify approve and decline flows, stock release and the bag being kept. It is impossible to enable in production.
- **Safepay:** implemented from the public documentation (`X-SFPY-SIGNATURE` HMAC webhook plus a server-side status lookup) but **not verified**. It is seeded disabled; the sandbox checklist is in DEPLOYMENT_GUIDE §8.
- **Stripe:** only if a UK/EU entity is approved; unverified.
- Return URLs never mark an order paid.

## 8. Operations (Studio)
- Orders: state machine, notes, shipments and tracking, COD collection, returns, refund records, invoices and packing slips, bulk actions, CSV.
- Plus: customers, inventory, coupons, shipping, payment methods with reconciliation and webhook log, staff, settings and the audit log.

## 9. Content & media
- The homepage CMS supports draft, preview and publish. Navigation, policies and FAQs are editable.
- Uploads become WebP renditions stored in R2 (or local disk in development). MySQL holds metadata only.

## 10. Email
- 16 templates, each send logged, with retry via cron.
- With no provider key, emails are recorded as **skipped**, never "sent". Studio says so, for example when an invitation email could not be sent.

## 11. Testing (all passing on 22 Nov)
- `npm test`: 47 tests (pricing unit tests, plus integration tests for commerce, auth, inventory, orders, catalogue and reports) against an isolated `*_test` DB.
- `npm run test:e2e`: 9 journeys. They cover:
  - register, then sign in
  - browse, filter, bag, coupon and COD checkout
  - Studio processing and shipping
  - customer order status
  - guest UK GBP approved payment
  - declined payment
  - Studio protection
  - storefront regression (navigation, search, SEO, redirects)
  - mobile
- Lint, `tsc` and `next build` are clean.

## 12. Security
See `SECURITY_CHECKLIST.md`. Open items: staff 2FA, Sentry, a one-click unsubscribe link before campaigns, a dependency audit in CI, and a penetration test. The CSP uses `'unsafe-inline'` for scripts as a documented trade-off.

## 13. Deployment
See `DEPLOYMENT_GUIDE.md` for the Hostinger Cloud Node.js web app (Node 22), MySQL, environment variables, migration and seed, a 5-minute cron, Cloudflare, Resend, R2, Turnstile, the Safepay checklist, backups and rollback. Not executed against Hostinger.

## 14. Remaining work before launch
1. Safepay sandbox account, then run the checklist. This decides whether online payments launch.
2. Resend domain and key; R2 bucket and keys; optional Turnstile.
3. Real product photography. The current images are Pexels stock and are **not** Nargis & Shaz photographs.
4. Legal review of the policy pages; store legal details in Settings.
5. Staging deploy on Hostinger, then a full manual pass, then production.
6. Recommended: staff 2FA, Sentry, a load test of checkout.
