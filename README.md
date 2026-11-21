# Nargis & Shaz — storefront & studio (Phase 1)

Next.js 16 (App Router, Cache Components) · React 19.3 · TypeScript · Tailwind CSS 4 · Framer Motion · React Three Fiber.

```bash
npm install
npm run dev        # http://localhost:3000  ·  admin at /admin
npm run build && npm start
```

Optional env: `NEXT_PUBLIC_SITE_URL` (canonical URLs, sitemap; defaults to https://www.nargisandshaz.com), `DATA_SOURCE` (reserved for `supabase` in Phase 2).

## What's here

**Storefront** — `/`, `/shop`, `/new-arrivals`, `/workwear`, `/everyday`, `/evening`, `/festive`, `/collections/[slug]`, `/products/[slug]`, `/our-story`, `/search`, `/wishlist`, `/cart`, `/checkout`.
Mega menu, mobile drawer, search overlay, URL-driven filters & sorting, colour/size variants with stock, wishlist, bag drawer, market/currency switcher (PKR · GBP · EUR · USD), country-aware checkout with server-side totals, COD and online payment methods per market.

**Studio (admin)** — `/admin` plus products (list/new/edit), categories, collections, inventory, orders (list/detail), customers, discounts, media, homepage content, team & roles, audit log, settings (markets & shipping, payment providers, tax). Runs on local state in clearly labelled *preview mode*; use **Preview as** to see each role's permissions.

**SEO** — Metadata API on every route, canonical URLs, Open Graph/Twitter, per-product OG images, `robots.txt`, `sitemap.xml`, Organization, WebSite, Product(Group) and Breadcrumb JSON-LD. Admin, cart, checkout, wishlist and search are `noindex` and disallowed.

## Structure

```
src/app/(store)/…          public routes (statically prerendered)
src/app/admin/…            studio routes (noindex)
src/components/ui          primitives: Button, Field, Drawer, Reveal, Parallax, Accordion…
src/components/store       header, mega menu, product card, catalogue browser, cart, checkout, silk (R3F)
src/components/admin       admin store, shell, DataTable, chart, views
src/components/media       EditorialImage (next/image for photos, illustration fallback)
src/types                  domain model (catalog, commerce, orders, admin)
src/data                   local structured data — imported ONLY by lib/repositories/local
src/lib/repositories       interfaces + local implementation + supabase/ plan
src/lib/commerce           currency formatting, totals (shipping, tax, discounts)
src/lib/payments           provider-independent methods + server order action
src/lib/auth               roles → permissions, server auth boundary (not connected)
src/lib/audit              audit entry builder
src/lib/seo                metadata + JSON-LD builders
src/config/site.ts         brand constants
```

See `docs/ARCHITECTURE.md` for the Phase 2 (Supabase, auth, payments) plan.

## Photography

Imagery is art-directed illustration until the campaign shoot is ready. Add a `src` to any `ProductImage` (or upload to Supabase Storage in Phase 2) and `EditorialImage` switches to `next/image` automatically. The previous static prototype is kept in `_prototype-static/`.
