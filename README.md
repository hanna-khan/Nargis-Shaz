# Nargis & Shaz — storefront & studio (Phase 1)

Next.js 16 (App Router, Cache Components) · React 19.3 · TypeScript · Tailwind CSS 4 · Framer Motion.

**Identity — Theme 4 · European Couture:** off-white `#F4F1EA`, deep chocolate `#2E1F1A`, muted bronze `#9E7B56`; Bodoni Moda (Didone) + Jost; NS monogram, NARGIS & SHAZ wordmark, DESIGNER LABEL (`src/components/brand/logo.tsx`).

```bash
npm install
npm run dev        # http://localhost:3000  ·  admin at /admin
npm run build && npm start
```

Optional env: `NEXT_PUBLIC_SITE_URL` (canonical URLs, sitemap; defaults to https://www.nargisandshaz.com), `DATA_SOURCE` (reserved for `supabase` in Phase 2).

## What's here

**Storefront** — `/`, `/shop`, `/shop/[category]` (dresses, tops, trousers, skirts, co-ords, knitwear, blazers-coats, festive-sets; short URLs like `/dresses` redirect), `/new-arrivals` (`/new-in` redirects), `/workwear`, `/everyday`, `/evening`, `/festive`, `/collections/[slug]`, `/products/[slug]`, `/our-story`, `/customer-care`, `/legal/[privacy|terms|shipping|returns]`, `/account`, `/search`, `/wishlist`, `/cart`, `/checkout`.
Image mega menu (hover intent, keyboard, touch), mobile sheet menu, search overlay, URL-driven filters (category, size, colour, price band per currency, availability) + sorting + grid density, product cards with same-shoot hover image, quick add and mobile size sheet, PDP gallery with full-screen zoom, size guide, quantity, sticky buy bar, complete the look / you may also like / recently viewed, wishlist, bag drawer, market/currency switcher (PKR · GBP · EUR · USD), country-aware checkout with server-side totals, COD and online payment methods per market, server-validated newsletter.

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

All photographs are **licensed sample imagery from Pexels**, served from the Pexels CDN — they are not Nargis & Shaz product photography and must be replaced before launch. Every product uses one photographer's single shoot so hover/alternate images show the same garment. Sources, photographers and licence notes: `docs/IMAGE-CREDITS.md`; mapping: `src/data/photography.ts`. Images need an internet connection to display.

The previous static prototype is kept in `_prototype-static/`.
