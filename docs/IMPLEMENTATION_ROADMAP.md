# Implementation roadmap

Status as of 22 November 2026. ✅ means done and tested. 🟡 means the code is done but waits on credentials or verification. ⬜ means not started.

## Phase A — Foundation ✅
- ✅ MySQL schema (77 tables), Drizzle migrations, idempotent seed (`db:seed`, `db:seed:reference`)
- ✅ Core libraries: ids, tokens, HMAC, errors, request metadata, same-origin checks, rate limiting
- ✅ Settings store and audit log

## Phase B — Identity ✅
- ✅ Customer accounts (register, verify, login with lockout, reset, profile, addresses, delete request)
- ✅ Staff accounts, invitations, 10 default roles, permission matrix, server-side guards on every Studio page and action

## Phase C — Catalogue & storefront on real data ✅
- ✅ Products, variants, prices, images, categories, collections, size guides, related products
- ✅ Storefront reads from cached repositories (`cacheTag` catalog/content/commerce, invalidated by Studio)
- ✅ Server-side filtering, facets, sorting, pagination, live search
- ✅ Configurable homepage with draft, preview and publish

## Phase D — Commerce ✅
- ✅ Server cart and wishlist with guest merge
- ✅ Coupons, shipping zones and methods, tax, markets and currencies
- ✅ Atomic checkout with stock reservation and idempotency
- ✅ COD
- ✅ Payment provider abstraction, webhooks, reconciliation, expiry of unpaid orders
- 🟡 Safepay sandbox verification (needs merchant sandbox keys)
- 🟡 Stripe (only if eligible)

## Phase E — Operations ✅
- ✅ Orders (state machine, notes, bulk actions, CSV), shipments and tracking events, returns, refund records
- ✅ Invoices and packing slips (print)
- ✅ Customer management with notes
- ✅ Inventory adjustments and low-stock reporting

## Phase F — Communication 🟡
- ✅ 16 email templates, delivery log, retry queue
- 🟡 Resend domain verification and API key
- ✅ Newsletter with double opt-in; contact form

## Phase G — Media 🟡
- ✅ Upload pipeline (sharp WebP renditions), library, usage tracking
- 🟡 R2 bucket, public domain and keys
- ⬜ Real Nargis & Shaz product photography to replace the Pexels placeholders

## Phase H — Hardening & launch
- ✅ Security headers and CSP, noindex on private routes, rate limits
- ✅ Unit, integration and e2e tests
- ✅ Docs: audit, schema, API, deployment, security
- 🟡 Turnstile keys (optional)
- ⬜ Sentry SDK (add `@sentry/nextjs` when a DSN exists)
- ⬜ Legal review of policy pages
- ⬜ Staging deploy on Hostinger, Safepay sandbox run-through, then production cut-over
- ⬜ Load test of checkout (k6 or similar) and an external security review

## After launch (suggested)
- Courier API integration (TCS/Leopards/PostEx) for automatic tracking
- Provider refund APIs from Studio
- Abandoned-cart emails (the `abandoned_carts` table already exists)
- Back-in-stock notifications
- Multi-image per colour reordering via drag and drop in Studio
