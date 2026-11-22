/**
 * Pure commerce calculations (no I/O) — the single source of truth for order totals on the server,
 * covered by unit tests. All amounts are integer minor units.
 */

export interface CouponRule {
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  percentBps: number;
  fixedAmounts: Record<string, number>;
  minimumSubtotals: Record<string, number>;
  maximumDiscounts: Record<string, number>;
  marketIds: string[];
  appliesTo: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  firstOrderOnly: boolean;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usageCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

export interface PricedLine { key: string; productId: string; categoryId: string | null; unitPrice: number; quantity: number }

export interface CouponContext {
  currency: string;
  marketId: string;
  now: Date;
  lines: PricedLine[];
  /** Number of earlier non-cancelled orders for this customer/email (for first-order coupons). */
  previousOrders: number;
  /** Earlier redemptions of this coupon by this customer/email. */
  customerRedemptions: number;
}

export type CouponOutcome =
  | { ok: true; discount: number; freeShipping: boolean; allocations: Record<string, number> }
  | { ok: false; reason: string };

export function lineSubtotal(lines: PricedLine[]) {
  return lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
}

/** Validates a coupon against the cart and returns the discount (never more than the eligible subtotal). */
export function evaluateCoupon(c: CouponRule, ctx: CouponContext, format: (n: number) => string = String): CouponOutcome {
  if (!c.active) return { ok: false, reason: "This code is no longer active." };
  if (c.startsAt && ctx.now < c.startsAt) return { ok: false, reason: "This code isn't active yet." };
  if (c.endsAt && ctx.now >= c.endsAt) return { ok: false, reason: "This code has expired." };
  if (c.marketIds.length && !c.marketIds.includes(ctx.marketId)) return { ok: false, reason: "This code isn't valid for your region." };
  if (c.usageLimit !== null && c.usageCount >= c.usageLimit) return { ok: false, reason: "This code has reached its usage limit." };
  if (c.perCustomerLimit !== null && ctx.customerRedemptions >= c.perCustomerLimit) return { ok: false, reason: "You've already used this code." };
  if (c.firstOrderOnly && ctx.previousOrders > 0) return { ok: false, reason: "This code is for first orders only." };

  const subtotal = lineSubtotal(ctx.lines);
  const min = c.minimumSubtotals[ctx.currency];
  if (min && subtotal < min) return { ok: false, reason: `Spend ${format(min)} or more to use ${c.code}.` };

  const eligible = ctx.lines.filter((l) =>
    c.appliesTo === "all" || (c.appliesTo === "products" ? c.productIds.includes(l.productId) : !!l.categoryId && c.categoryIds.includes(l.categoryId)));
  const eligibleSubtotal = lineSubtotal(eligible);
  if (!eligible.length || eligibleSubtotal <= 0) return { ok: false, reason: "This code doesn't apply to the items in your bag." };

  if (c.type === "free_shipping") return { ok: true, discount: 0, freeShipping: true, allocations: {} };

  let discount = c.type === "percentage" ? Math.round((eligibleSubtotal * c.percentBps) / 10_000) : (c.fixedAmounts[ctx.currency] ?? 0);
  if (c.type === "fixed" && !c.fixedAmounts[ctx.currency]) return { ok: false, reason: "This code isn't available in your currency." };
  const cap = c.maximumDiscounts[ctx.currency];
  if (cap) discount = Math.min(discount, cap);
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));

  // Allocate proportionally across eligible lines (largest remainder) — used for returns/refunds.
  const allocations: Record<string, number> = {};
  let given = 0;
  eligible.forEach((l, i) => {
    const share = i === eligible.length - 1 ? discount - given : Math.floor((discount * l.unitPrice * l.quantity) / eligibleSubtotal);
    allocations[l.key] = share;
    given += share;
  });
  return { ok: true, discount, freeShipping: false, allocations };
}

export interface ShippingRate { rate: number; freeOver: number | null }
export interface TaxRate { rateBps: number; inclusive: boolean; label: string }

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number; // added on top (exclusive regimes)
  taxIncluded: number; // contained in prices (inclusive regimes) — for display/accounting
  total: number;
}

export function shippingFor(method: ShippingRate | null | undefined, subtotalAfterDiscount: number, freeShipping = false) {
  if (!method || freeShipping) return 0;
  if (method.freeOver !== null && subtotalAfterDiscount >= method.freeOver) return 0;
  return method.rate;
}

export function computeTotals(args: { lines: PricedLine[]; shipping?: ShippingRate | null; tax?: TaxRate | null; coupon?: CouponOutcome | null }): Totals {
  const subtotal = lineSubtotal(args.lines);
  const c = args.coupon && args.coupon.ok ? args.coupon : null;
  const discount = c?.discount ?? 0;
  const taxable = subtotal - discount;
  // Free-delivery thresholds are judged on the discounted subtotal.
  const shipping = shippingFor(args.shipping, taxable, c?.freeShipping);
  const r = (args.tax?.rateBps ?? 0) / 10_000;
  const inclusive = args.tax?.inclusive ?? true;
  const taxIncluded = inclusive && r > 0 ? Math.round(taxable - taxable / (1 + r)) : 0;
  const tax = !inclusive && r > 0 ? Math.round(taxable * r) : 0;
  return { subtotal, discount, shipping, tax, taxIncluded, total: taxable + shipping + tax };
}

/* ───────────────────────── Order lifecycle ───────────────────────── */

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";

/** Allowed manual transitions. "pending" → "confirmed" for online orders happens only via verified payment. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", returned: "Returned",
};
