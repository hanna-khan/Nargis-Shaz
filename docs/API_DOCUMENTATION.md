# API documentation

The application exposes two kinds of server interface:

1. **REST route handlers** (`src/app/**/route.ts`). These are JSON endpoints used by client components, payment providers and cron.
2. **Server Actions** (`src/app/(store)/actions.ts`, `src/app/admin/_actions/*.ts`). These handle form submissions from the storefront and Studio. They are not a public API; Next.js protects them with action IDs and an origin check.

## Common conventions

| Topic | Rule |
|---|---|
| Format | JSON in, JSON out. `Cache-Control: no-store` unless stated. |
| Errors | `{ "error": { "code": string, "message": string, "fields"?: { [path]: message } } }` |
| Status codes | `401` unauthenticated · `403` forbidden · `404` not found · `409` conflict (for example stock changed, duplicate order) · `413` payload too large · `422` validation · `429` rate-limited · `500` server error (no internals leaked) |
| CSRF | Every non-GET request must carry an `Origin` (or `Referer`) matching `APP_URL`. Webhooks and cron are exempt; they authenticate with a signature or a bearer secret. |
| Identity | Customer session: `ns_session` cookie (HttpOnly, Secure in production, SameSite=Lax). Guests are identified by the `ns_cart` / `ns_wish` cookies. Staff use `ns_staff` (path `/admin`). |
| Body limit | Route handlers: 64 KB JSON. Server actions: 40 MB (image uploads). |
| Money | Integer minor units plus an ISO currency code. |

---

## Storefront endpoints

### `GET /api/cart`
Returns the current cart view for the signed-in customer or guest, priced in the cart's market currency.

```json
{ "id": "…", "marketId": "pk", "currency": "PKR", "count": 1, "hasIssues": false,
  "lines": [{ "variantId": "…", "productId": "…", "slug": "aaliya-poplin-shirt", "name": "Aaliya Poplin Shirt",
              "colour": "Ivory", "size": "M", "sku": "…", "image": {…}, "unitPrice": 1250000, "compareAtPrice": null,
              "quantity": 1, "lineTotal": 1250000, "available": 7, "issue": null }],
  "coupon": { "code": "WELCOME10", "applied": true, "message": "…", "freeShipping": false },
  "totals": { "subtotal": 1250000, "discount": 125000, "shipping": 0, "tax": 0, "total": 1125000, … },
  "shippingEstimate": { "label": "…", "amount": 0, "freeOver": 1000000 }, "taxLabel": null }
```

`issue` is `null`, `"insufficient"` or `"out_of_stock"`.

### `POST /api/cart`
Body: `{ "action": …, … }`. The response is the updated cart view (same shape as GET).

| action | fields | notes |
|---|---|---|
| `add` | `variantId`, `quantity` (1–10) | `409` if the quantity exceeds available stock |
| `set` | `variantId`, `quantity` (0 removes) | |
| `remove` | `variantId` | |
| `change` | `fromVariantId`, `toVariantId` | changes size or colour in place |
| `coupon` | `code` (string, or `null` to remove) | validity is reported in `coupon.message` |
| `market` | `marketId` | re-prices the cart; also sets `ns_market` |

### `GET /api/wishlist` · `POST /api/wishlist`
- GET returns `{ "items": [{ productId, slug, name, subtitle, image, prices, sizes: [{ variantId, size, stock }] }] }`. Draft and archived products are omitted.
- POST body: `{ "productId": string, "wished": boolean }`. Returns the updated list in the same shape.

### `GET /api/search?q=…&currency=PKR`
- Live search suggestions. `q` needs at least 2 characters (capped at 80).
- Returns `{ query, total, products[], categories[], collections[] }`.
- Cached publicly for 30 seconds.

### `GET /api/products/{slug}/availability`
- Returns `{ "variants": { [variantId]: availableQuantity } }`, where available = on hand − reserved.
- `404` if the product is not visible.
- Used by the product page so prerendered pages still show live stock.

### `POST /api/recently-viewed`
Body: `{ "productId": string }`. Returns `{ "ok": true }`.

### `GET /api/me`
Returns `{ "customer": null | { firstName, lastName, email, emailVerified } }`. The header uses it without making pages dynamic.

---

## Integration endpoints

### `POST /api/webhooks/{provider}`
`provider` is one of `safepay`, `stripe` or `test` (the test gateway is refused when `APP_ENV=production`).

Processing order:

1. Read the raw body (max 256 KB).
2. Verify the signature:
   - Safepay: `X-SFPY-SIGNATURE`, HMAC-SHA512 of the body with `SAFEPAY_WEBHOOK_SECRET`.
   - Stripe: `Stripe-Signature`, `t=…,v1=…`, HMAC-SHA256 of `t.body`, with a 5-minute tolerance.
3. Insert into `payment_webhook_events`. If the `(provider, event_id)` pair already exists, the event is a duplicate: return `200` with no action.
4. Fetch the payment status **server-to-server** from the provider. The webhook body alone is never trusted.
5. In one transaction: mark the payment and order paid or failed, commit or release stock reservations, write history, then send the email.

Responses:

| Status | Meaning |
|---|---|
| `200` | Processed, or a duplicate |
| `400` | Bad signature or malformed body |
| `404` | Unknown provider |
| `500` | Transient error; the provider will retry |

The customer's return URL (`/checkout/payment-return/{number}`) only **polls** the order status, with one reconciliation call. It never marks an order paid by itself.

### `POST /api/cron/maintenance`
Header: `Authorization: Bearer $CRON_SECRET`. Run it every 5 minutes. It does four things:

- Expires unpaid online orders older than the payment window and releases their stock.
- Retries queued or failed emails with backoff (up to 50 per run).
- Prunes rate-limit rows older than 24 hours.
- Prunes sessions that expired more than 7 days ago.

Response: `{ "expiredOrders": n, "emails": { "processed": n, "results": [...] } }`.

---

## Studio endpoint

### `GET /admin/api/export/{report}?range=today|yesterday|7d|30d|month|prev_month|custom&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `report` is one of `sales`, `orders`, `products`, `inventory` or `customers`.
- Requires a staff session plus `reports.export`, `orders.export` (orders) or `customers.export` (customers).
- Returns `text/csv`.
- Cells that start with `= + - @` are prefixed with `'` to prevent formula injection.
- Every export is written to the audit log.

---

## Server Actions

Actions return a discriminated result: `{ ok: true, … }` or `{ ok: false, error, … }`. They validate their input with zod, and the ones that change state are rate-limited.

**Storefront** (`src/app/(store)/actions.ts`):

| Group | Actions |
|---|---|
| Accounts | `registerAction`, `loginAction`, `logoutAction`, `forgotPasswordAction`, `resetPasswordAction`, `resendVerificationAction` |
| Profile | `updateProfileAction`, `changePasswordAction`, `saveAddressAction`, `deleteAddressAction`, `notificationPrefsAction`, `requestDeletionAction` |
| Commerce | `placeOrderAction`, which takes the checkout payload plus `idempotencyKey` and returns `{ ok: true, url }` (the confirmation page, or the provider's hosted payment page) or `{ ok: false, error, fieldErrors?, code? }`; `trackOrderAction`, which takes an order number plus email |
| Marketing | `subscribeNewsletter` (double opt-in), `contactAction` (honeypot, optional Turnstile) |

**Studio** (`src/app/admin/_actions/*.ts`). Each action is wrapped by `studioAction(permission, fn)`, which:

- re-reads the staff session,
- checks the named permission on the server,
- writes an audit entry, and
- invalidates the affected cache tags.

| File | Actions |
|---|---|
| `auth.ts` | `staffLoginAction`, `staffLogoutAction`, `staffForgotAction`, `staffResetAction` (also accepts invitations) |
| `orders.ts` | `transitionAction`, `cancelAction`, `noteAction`, `shipmentAction`, `shipmentEventAction`, `codAction`, `confirmPaymentAction`, `refundAction`, `createReturnAction`, `updateReturnAction`, `resendAction`, `bulkOrdersAction` |
| `catalog.ts` | product create/update/duplicate/delete/bulk; prices; variants; image upload/attach/reorder; related products; stock adjustment; categories; collections; media update/delete |
| `content.ts` | homepage sections and items, publish; policies; navigation |
| `ops.ts` | coupons; customers (notes, status, deletion); shipping zones and methods; payment methods; staff and roles; settings, currencies, markets and tax; email templates and test send; contact messages; email retry |

The full permission list is in `src/server/auth/permissions.ts` (`PERMISSION_CATALOGUE`).
