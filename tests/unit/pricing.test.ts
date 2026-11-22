import { describe, expect, it } from "vitest";
import { canTransition, computeTotals, evaluateCoupon, shippingFor, type CouponRule, type PricedLine } from "@/server/commerce/pricing";
import { hasPermission, DEFAULT_ROLES, ALL_PERMISSIONS } from "@/server/auth/permissions";
import { formatMoney } from "@/lib/commerce/currency";
import { escapeHtml, interpolate, renderEmail } from "@/server/email/templates";
import { toCsv } from "@/server/admin/reports";
import { passwordProblem } from "@/server/auth/password";

const line = (unitPrice: number, quantity = 1, productId = "p1", categoryId: string | null = "c1"): PricedLine => ({ key: `${productId}-${unitPrice}`, productId, categoryId, unitPrice, quantity });
const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  code: "TEST", type: "percentage", percentBps: 1000, fixedAmounts: {}, minimumSubtotals: {}, maximumDiscounts: {}, marketIds: [], appliesTo: "all", productIds: [], categoryIds: [],
  firstOrderOnly: false, usageLimit: null, perCustomerLimit: null, usageCount: 0, startsAt: null, endsAt: null, active: true, ...over,
});
const ctx = (lines: PricedLine[], over: Record<string, unknown> = {}) => ({ currency: "PKR", marketId: "pk", now: new Date("2026-11-22T00:00:00Z"), lines, previousOrders: 0, customerRedemptions: 0, ...over });

describe("price calculations", () => {
  it("sums line totals in minor units", () => {
    const t = computeTotals({ lines: [line(895000, 2), line(1050000)] });
    expect(t.subtotal).toBe(2840000);
    expect(t.total).toBe(2840000);
  });
  it("extracts inclusive GST without changing the total", () => {
    const t = computeTotals({ lines: [line(1180000)], tax: { rateBps: 1800, inclusive: true, label: "GST" } });
    expect(t.taxIncluded).toBe(180000);
    expect(t.tax).toBe(0);
    expect(t.total).toBe(1180000);
  });
  it("adds exclusive tax on the discounted subtotal", () => {
    const t = computeTotals({ lines: [line(10000)], tax: { rateBps: 1000, inclusive: false, label: "Sales tax" }, coupon: { ok: true, discount: 2000, freeShipping: false, allocations: {} } });
    expect(t.tax).toBe(800);
    expect(t.total).toBe(8800);
  });
  it("formats PKR without decimals and GBP with symbol", () => {
    expect(formatMoney(2430000, "PKR")).toBe("Rs 24,300");
    expect(formatMoney(22900, "GBP")).toBe("£229");
    expect(formatMoney(22950, "GBP")).toBe("£229.50");
  });
});

describe("shipping", () => {
  const method = { rate: 25000, freeOver: 1000000 };
  it("charges below the free threshold", () => expect(shippingFor(method, 999999)).toBe(25000));
  it("is free at the threshold (judged after discount)", () => expect(shippingFor(method, 1000000)).toBe(0));
  it("is free with a free-shipping coupon", () => expect(shippingFor(method, 100, true)).toBe(0));
  it("never free when there is no threshold", () => expect(shippingFor({ rate: 60000, freeOver: null }, 99999999)).toBe(60000));
  it("discount can drop an order below the free-delivery threshold", () => {
    const t = computeTotals({ lines: [line(1000000)], shipping: method, coupon: { ok: true, discount: 100000, freeShipping: false, allocations: {} } });
    expect(t.shipping).toBe(25000);
    expect(t.total).toBe(925000);
  });
});

describe("coupons", () => {
  it("applies a percentage discount", () => {
    const r = evaluateCoupon(coupon(), ctx([line(2700000)]));
    expect(r.ok && r.discount).toBe(270000);
  });
  it("caps a percentage discount at the maximum", () => {
    const r = evaluateCoupon(coupon({ maximumDiscounts: { PKR: 100000 } }), ctx([line(2700000)]));
    expect(r.ok && r.discount).toBe(100000);
  });
  it("fixed discount never exceeds the eligible subtotal", () => {
    const r = evaluateCoupon(coupon({ type: "fixed", fixedAmounts: { PKR: 500000 } }), ctx([line(300000)]));
    expect(r.ok && r.discount).toBe(300000);
  });
  it("fixed discount requires the currency", () => {
    const r = evaluateCoupon(coupon({ type: "fixed", fixedAmounts: { PKR: 5000 } }), ctx([line(30000)], { currency: "GBP" }));
    expect(r.ok).toBe(false);
  });
  it("enforces minimum subtotal", () => {
    const r = evaluateCoupon(coupon({ minimumSubtotals: { PKR: 2000000 } }), ctx([line(1999999)]), (n) => `Rs ${n / 100}`);
    expect(r).toEqual({ ok: false, reason: "Spend Rs 20000 or more to use TEST." });
  });
  it("enforces dates, market, usage, per-customer and first-order rules", () => {
    expect(evaluateCoupon(coupon({ endsAt: new Date("2026-01-01") }), ctx([line(1000)])).ok).toBe(false);
    expect(evaluateCoupon(coupon({ startsAt: new Date("2027-01-01") }), ctx([line(1000)])).ok).toBe(false);
    expect(evaluateCoupon(coupon({ marketIds: ["gb"] }), ctx([line(1000)])).ok).toBe(false);
    expect(evaluateCoupon(coupon({ usageLimit: 5, usageCount: 5 }), ctx([line(1000)])).ok).toBe(false);
    expect(evaluateCoupon(coupon({ perCustomerLimit: 1 }), ctx([line(1000)], { customerRedemptions: 1 })).ok).toBe(false);
    expect(evaluateCoupon(coupon({ firstOrderOnly: true }), ctx([line(1000)], { previousOrders: 1 })).ok).toBe(false);
    expect(evaluateCoupon(coupon({ active: false }), ctx([line(1000)])).ok).toBe(false);
  });
  it("category-specific discount only counts eligible lines and allocates the whole discount", () => {
    const r = evaluateCoupon(coupon({ appliesTo: "categories", categoryIds: ["festive"], percentBps: 1500 }), ctx([line(1000000, 1, "a", "festive"), line(500000, 1, "b", "dresses"), line(333333, 1, "c", "festive")]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.discount).toBe(Math.round(1333333 * 0.15));
      expect(Object.values(r.allocations).reduce((a, b) => a + b, 0)).toBe(r.discount);
      expect(Object.keys(r.allocations)).not.toContain("b-500000");
    }
  });
  it("product-specific coupons reject carts without those products", () => {
    expect(evaluateCoupon(coupon({ appliesTo: "products", productIds: ["x"] }), ctx([line(1000)])).ok).toBe(false);
  });
  it("free-shipping coupons return no money discount", () => {
    const r = evaluateCoupon(coupon({ type: "free_shipping" }), ctx([line(1000)]));
    expect(r).toEqual({ ok: true, discount: 0, freeShipping: true, allocations: {} });
  });
});

describe("order status transitions", () => {
  it("allows the forward path", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "processing")).toBe(true);
    expect(canTransition("processing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
    expect(canTransition("delivered", "returned")).toBe(true);
  });
  it("blocks skipping and reopening", () => {
    expect(canTransition("pending", "shipped")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(canTransition("shipped", "cancelled")).toBe(false);
  });
});

describe("permissions", () => {
  const role = (k: string) => DEFAULT_ROLES.find((r) => r.key === k)!.permissions;
  it("super admin bypasses checks", () => expect(hasPermission([], "staff.manage", true)).toBe(true));
  it("customer support cannot refund or view finance reports", () => {
    expect(hasPermission(role("customer_support"), "refunds.create")).toBe(false);
    expect(hasPermission(role("customer_support"), "reports.finance")).toBe(false);
    expect(hasPermission(role("customer_support"), "orders.notes")).toBe(true);
  });
  it("only super admin manages staff and payment configuration", () => {
    for (const r of DEFAULT_ROLES.filter((x) => x.key !== "super_admin")) {
      expect(r.permissions).not.toContain("staff.manage");
      expect(r.permissions).not.toContain("payments.manage");
    }
  });
  it("every role only grants known permissions", () => {
    for (const r of DEFAULT_ROLES) for (const p of r.permissions) expect(ALL_PERMISSIONS).toContain(p);
  });
});

describe("security helpers", () => {
  it("escapes HTML in email templates", () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
    expect(interpolate("Hi {{name}}", { name: "<b>A</b>" })).toBe("Hi &lt;b&gt;A&lt;/b&gt;");
    const r = renderEmail({ subject: "Order {{n}}\nBcc: x", body: "Hello {{name}}" }, { n: "1", name: "<img>", actionUrl: "javascript:alert(1)" });
    expect(r.subject).not.toContain("\n");
    expect(r.html).not.toContain("<img>");
    expect(r.html).not.toContain("javascript:");
  });
  it("guards CSV exports against formula injection", () => {
    const csv = toCsv({ columns: [{ key: "a", label: "A" }, { key: "m", label: "M", money: true }], rows: [{ a: "=HYPERLINK(\"x\")", m: 12345 }] });
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain("123.45");
  });
  it("enforces the password policy", () => {
    expect(passwordProblem("short1")).toBeTruthy();
    expect(passwordProblem("onlyletterslong")).toBeTruthy();
    expect(passwordProblem("jane.doe2026x", "jane.doe@example.com")).toBeTruthy();
    expect(passwordProblem("Atelier-2026!secure")).toBeNull();
  });
});
