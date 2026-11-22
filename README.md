# Nargis & Shaz: storefront, Studio and commerce platform

**Stack:**
- Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4 and Framer Motion
- MySQL 8 with Drizzle ORM
- Resend (email), Cloudflare R2 (media), and Safepay, Stripe or COD (payments)

**Identity (Theme 4, European Couture):** off-white `#F4F1EA`, deep chocolate `#2E1F1A` and muted bronze `#9E7B56`, set in Bodoni Moda (Didone) and Jost.

## Quick start (local)

```bash
cp .env.example .env     # set DATABASE_URL to a local MySQL 8; APP_ENV=development; MEDIA_DRIVER=local; PAYMENTS_TEST_PROVIDER=1
npm install
npm run db:migrate       # forward-only migrations
SEED_OWNER_EMAIL=you@example.com SEED_OWNER_PASSWORD='choose-a-strong-one' npm run db:seed
npm run dev              # storefront http://localhost:3000 · Studio http://localhost:3000/admin
```

| Script | Purpose |
|---|---|
| `npm run build` / `npm start` | production build and server |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:generate` | generate a migration from `src/server/db/schema.ts` |
| `npm run db:migrate` | apply pending migrations |
| `npm run db:seed` | idempotent reference data, launch catalogue (empty DB only) and first owner |
| `npm test` | unit + integration tests (uses its own `*_test` database) |
| `npm run test:e2e` | Playwright journeys against a running server |

## What's included

**Storefront**
- Shopping: home (CMS-driven), shop, categories, collections, occasions, product pages with live availability, and search with live suggestions.
- Bag and wishlist: server-side, with the guest bag merged on sign-in.
- Checkout: a 5-step checkout (COD and online payment), payment return and confirmation pages, and order tracking.
- Customer account: profile, addresses, orders, password, notifications and deletion request.
- Newsletter (double opt-in), contact form, and policies and FAQs managed in Studio.

**Studio (`/admin`)**
- Operations: dashboard, orders (fulfilment, shipments, COD collection, refunds, returns, invoices and packing slips, bulk actions, CSV), and customers.
- Catalogue: products with variants, prices, images and related items, plus categories, collections, inventory, media library and coupons.
- Content: homepage editor with draft, preview and publish; navigation; policies; FAQs.
- Configuration: shipping zones and methods, payment methods with reconciliation and webhook log, and store, SEO, checkout, currency, tax and market settings.
- Team and records: staff invitations, roles and permission matrix, messages and email log, reports, and the audit log.
- Access: every page and action is permission-checked on the server.

## Documentation

| Doc | Contents |
|---|---|
| [`docs/MASTER_AUDIT.md`](docs/MASTER_AUDIT.md) | what existed, what is real now, known gaps |
| [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md) | phases and remaining work |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | conventions and every table, FK and index |
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | REST endpoints, webhooks, cron, server actions |
| [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) | Hostinger Cloud, MySQL, env, cron, R2, Resend, Safepay sandbox checklist, backups |
| [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md) | controls in place and open items |
| [`docs/IMAGE-CREDITS.md`](docs/IMAGE-CREDITS.md) | photography sources |

## Structure

```
src/app/(store)/…        storefront routes + server actions
src/app/admin/…          Studio routes, server actions (_actions), CSV export
src/app/api/…            REST: cart, wishlist, search, availability, me, webhooks, cron
src/server/…             server-only domain code: db, auth, catalog, inventory, commerce, orders, payments, email, media, cms, admin
src/components/…         ui primitives, store, admin, brand, media
src/lib/…                cached repositories, SEO, image loader, formatting
src/data/…               launch catalogue used by the seed only
drizzle/migrations       SQL migrations
scripts/                 migrate and seed
tests/                   unit, integration, e2e
```

## Before launch

These items need credentials or decisions; see `docs/MASTER_AUDIT.md` §3.

- **Payments:** verify Safepay in sandbox. It is implemented but untested, and the method is disabled until then.
- **Services:** configure Resend, R2 and (optionally) Turnstile.
- **Photography:** replace the Pexels photographs. They are licensed stock imagery, **not** Nargis & Shaz product photography.
- **Policies:** have the policy texts reviewed by a lawyer.

The previous static prototype is kept in `_prototype-static/`.
