# Architecture & Phase 2 handover

## Principles
- **Server Components by default.** Client components only for interaction: header/menus, filters, variant picker, bag, wishlist, checkout, admin views, motion, the silk canvas.
- **Content in HTML first.** Every public page is prerendered (Cache Components / PPR). Prices render in PKR on the server and re-price on the client for the selected market. Animations change only opacity/transform/clip-path, and the first paint is never hidden.
- **One data seam.** UI → services → `lib/repositories` interfaces. `local/` reads `src/data`; Phase 2 adds `supabase/` and flips `DATA_SOURCE`.

## International commerce
| Concern | Where |
|---|---|
| Currencies (PKR, USD, GBP, EUR), formatting | `types/commerce.ts`, `lib/commerce/currency.ts` |
| Markets → countries, currency, payment methods | `data/markets.ts` (`marketData`, `countryData`) |
| Shipping methods & free thresholds per market | `shippingData`; edited in Studio → Settings |
| Tax rules (inclusive VAT/GST, duties on delivery) | `taxData`; `lib/commerce/totals.ts` |
| Prices | `Product.prices: PriceSet` explicit per currency, minor units; exchange rates are fallback only |
| Address formats | `components/store/checkout/address-fields.tsx` |

Phase 2: tables `markets`, `market_countries`, `shipping_methods`, `tax_rules`, `product_prices(product_id, currency, amount)`; optionally geolocate the default market in `proxy.ts`.

## Payments
- `lib/payments/registry.ts` — provider-independent *methods* (`cod`, `card`, `wallet`, `bank-transfer`, `paypal`) enabled per market in settings.
- `lib/payments/types.ts` — `PaymentProviderAdapter { createSession, verifyWebhook }`. Each gateway lives in `lib/payments/providers/<name>.ts`, with secrets in server env vars only.
- `lib/payments/place-order.ts` (Server Action) — recomputes prices, stock, shipping, tax and discount from the repository. The browser sends ids and quantities only.
- **Paid status is set only by a verified webhook** (`app/api/payments/[provider]/webhook/route.ts`, Phase 2). COD orders go to `awaiting_cod` and are reconciled by staff when the courier remits cash.

## Staff, permissions & audit
- Roles: Owner, Administrator, Store Manager, Content Manager, Staff (`lib/auth/permissions.ts`).
- Permissions: `<resource>.<action>` across products, orders, inventory, customers, discounts, content, settings, team, finance.
- Boundary: `lib/auth/guard.ts` (`getStaffSession`, `requirePermission`). Phase 1 returns no session; the Studio is labelled *preview mode*.
- Phase 2:
  1. Supabase Auth for staff, with a `staff_members(user_id, role_id, status)` table.
  2. `proxy.ts` redirects unauthenticated `/admin/*` requests.
  3. Every admin mutation becomes a Server Action that calls `requirePermission()` first.
  4. RLS uses a `has_permission(text)` SQL function that mirrors the matrix.
  5. `audit_log` is insert-only (no update or delete policy) and is written in the same transaction.

## Supabase mapping (planned, not created)
products, product_colours, product_images (Storage), product_variants (stock), product_prices, categories, collections, collection_products, orders, order_lines, order_events, customers, addresses, discounts, homepage_content, media_assets, store_settings, payment_providers, markets, shipping_methods, tax_rules, staff_members, audit_log.

Public reads use `"use cache"` + `cacheTag()`; admin writes call `revalidateTag()`.
