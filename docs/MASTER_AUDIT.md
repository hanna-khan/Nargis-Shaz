# Master audit — Nargis & Shaz

Audit date: 22 November 2026. Baseline is the repository's first commit (`66cb293 first commit`). The audit compares it with the working tree after this round of implementation.

Each area gets one of these classes:

| Class | Meaning |
|---|---|
| **Real** | Persists to MySQL, is validated on the server and is covered by tests. |
| **Real · unverified** | The code is complete, but it depends on a third party that has not been exercised with real credentials. |
| **Placeholder** | Works, but the content is not final (for example stock photography or draft legal text). |
| **Missing** | Not built. |

---

## 1. Baseline (before this work)

| Area | State at `66cb293` | Class then |
|---|---|---|
| Storefront UI (Theme 4, Bodoni Moda + Jost, 17 products, 8 categories) | Complete and polished. Data came from `src/data/*.ts` through `lib/repositories/local`. | UI real, data static |
| Cart / wishlist | `localStorage` only. No stock check; prices could be tampered with on the client. | Placeholder |
| Checkout | Server action computed totals, but no order was persisted and no stock was reserved. | Placeholder |
| Payments | `lib/payments` described methods only. No provider was integrated. | Missing |
| Customer accounts | `/account` page shell only. Auth was "not connected". | Missing |
| Studio (admin) | Full UI running on **in-browser local state**, labelled "preview mode", with a role switcher. Nothing persisted. | Placeholder (fake persistence) |
| Database | None. `supabase/` plan only. | Missing |
| Email | None. Newsletter was validated, then discarded. | Missing |
| Media | `next/image` with Pexels photographs. No uploads. | Placeholder |
| SEO | Metadata, JSON-LD, sitemap and robots were all good. | Real |
| Tests | None. | Missing |
| Deployment docs | None. | Missing |

**Risks found in the baseline:**

- The admin looked functional but persisted nothing. That is the "fake success" pattern the brief forbids.
- Client-side cart prices were trusted in the display layer.
- There was no stock reservation, so overselling was possible.
- Nothing stopped "demo"/"preview" wording from leaking into a production build.

---

## 2. Current state (after this work)

| Area | Implementation | Class |
|---|---|---|
| Database | MySQL 8 + Drizzle ORM. 77 tables with FKs, indexes and unique constraints. Forward-only SQL migrations (`drizzle/migrations`). Idempotent seed. | **Real** |
| Customer auth | Register, verify email, sign in with lockout, forgot/reset, change password, sign out everywhere, account deletion request. Argon2id hashing; DB sessions store a SHA-256 of the token. | **Real** |
| Staff auth & RBAC | Separate `staff_users` and session cookie (path `/admin`). 10 roles, about 60 permissions, permission matrix editor, invitations, audit log. Every Studio action is checked on the server. | **Real** |
| Catalogue | Products, variants (size × colour), per-currency prices, images, categories, collections, related products, size guides. SQL filtering, facets, sort and pagination. Search suggestions. | **Real** |
| Inventory | On-hand/reserved per variant. Guarded atomic `UPDATE … WHERE on_hand - reserved >= q`. Reservations with expiry, commit and release. Movements ledger and manual adjustments. | **Real** |
| Cart & wishlist | Server-side, keyed by user or guest cookie. Guest cart/wishlist merges on sign-in. Coupon on cart. Market/currency on cart. | **Real** |
| Checkout | One DB transaction: re-prices from the DB, locks the coupon `FOR UPDATE`, reserves stock, creates the order, items, addresses and history. Idempotency key unique index. | **Real** |
| COD | Per-market availability and order limit (Rs 300,000). Collection recorded in Studio. | **Real** |
| Online payments | Provider abstraction. Webhooks are signature-verified, deduped by `(provider, event_id)` and re-verified server-to-server before marking an order paid. The return URL never marks an order paid. | Test gateway **Real**; Safepay and Stripe **Real · unverified** |
| Orders, shipments, returns, refunds | State machine with allowed transitions, notes, shipments and tracking events, returns with restock, refunds (manual record), invoices and packing slips. | **Real** (refund money movement is manual; see §3) |
| Email | 16 templates via Resend's REST API. Every send is logged in `email_logs`. Retries with backoff run through cron. Without a key, emails are logged as `skipped`, never `sent`. | **Real · unverified** (no Resend key configured) |
| Media library | sharp → WebP renditions (480/960/1600/2400) to R2 (or `public/uploads` locally). Metadata in MySQL only; usage tracking before delete. | Local driver **Real**; R2 **Real · unverified** |
| Homepage CMS | Draft sections and items, preview at `/admin/preview/homepage`, publish snapshot, unpublished-changes badge. | **Real** |
| Content | Navigation menus, policies, FAQs, store settings, SEO defaults, maintenance mode. | **Real** |
| Marketing | Newsletter with double opt-in. Coupons (%, fixed, free shipping, first order, per-customer limits). Contact form with honeypot and optional Turnstile. | **Real** |
| Reports | Dashboard plus sales, orders, products, inventory and customer reports (Asia/Karachi day boundaries). CSV export with a formula-injection guard. | **Real** |
| Security | CSP and security headers; HSTS in production. Same-origin checks on mutations. DB-backed rate limits. `noindex` on `/admin` and `/account`. No secrets in `NEXT_PUBLIC_*`. | **Real** (see SECURITY_CHECKLIST) |
| SEO | Preserved from the baseline. Organisation JSON-LD now comes from settings. | **Real** |
| Tests | 47 Vitest unit/integration tests (isolated `_test` DB) and 9 Playwright e2e journeys (desktop and mobile). | **Real** |
| Photography | Pexels stock images, credited in `docs/IMAGE-CREDITS.md`. They are **not** Nargis & Shaz product photographs. | **Placeholder** |
| Policy text | Privacy, terms, shipping, returns and FAQ seeded as sensible drafts. | **Placeholder** (needs legal review) |
| Error monitoring | `SENTRY_DSN` is shown in Settings but no SDK is installed. | **Missing** |

---

## 3. Known gaps and honest limitations

1. **Safepay** was implemented from Safepay's public documentation: the tracker/checkout flow, the `X-SFPY-SIGNATURE` HMAC webhook and a server-side status lookup. It has **not** been run against a sandbox account. The payment method is seeded *disabled*. Run the sandbox checklist in `DEPLOYMENT_GUIDE.md` before enabling it.
2. **Stripe** is only appropriate if a UK/EU entity is approved. It is seeded disabled and has not been tested.
3. **Refunds** are recorded and reconciled in Studio, but the money is moved in the provider dashboard. The app does not call refund APIs.
4. **Email, R2 and Turnstile** need real credentials. Each has a status line in Studio → Settings → Service status.
5. **Sentry** is not wired (see above).
6. **Courier integration** (TCS, Leopards and others) is manual tracking entry. There is no carrier API.
7. **Load and penetration testing** have not been performed.
8. **Superseded Phase 1 code**: `src/lib/repositories/local`, the old admin store and others are no longer used. They were moved to `_to_delete/` in the project folder, and the original remains in git history.
