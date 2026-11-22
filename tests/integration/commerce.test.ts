import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db";
import * as s from "@/server/db/schema";
import { loginCustomer, logoutCustomer, requestPasswordReset, resetPassword } from "@/server/auth/accounts";
import { getCustomer } from "@/server/auth/session";
import { addToCart, getCartView, mergeGuestCart, setCartCoupon, setCartMarket, setCartQuantity } from "@/server/commerce/cart";
import { mergeGuestWishlist, setWished, wishlistProductIds } from "@/server/commerce/wishlist";
import { placeOrder } from "@/server/orders/checkout";
import { orderView } from "@/server/orders/view";
import { handleWebhook } from "@/server/payments/service";
import { testGateway } from "@/server/payments/providers";
import { reserveStock } from "@/server/inventory";
import { randomToken, sha256 } from "@/server/lib/core";
import { address, browser, idem, newCustomer, setStock, stockOf, variantWithStock } from "./helpers";

afterAll(async () => { await closeDb(); });

describe("customer authentication", () => {
  it("registers, keeps a session, logs out and logs back in", async () => {
    await newCustomer("reg@test.local");
    expect((await getCustomer())?.email).toBe("reg@test.local");
    await logoutCustomer();
    expect(await getCustomer()).toBeNull();
    await loginCustomer("REG@test.local", "Customer-2026!x");
    expect((await getCustomer())?.email).toBe("reg@test.local");
    const [u] = await db.select().from(s.users).where(eq(s.users.email, "reg@test.local"));
    expect(u.passwordHash).toMatch(/^\$argon2id\$/);
    const sessions = await db.select().from(s.userSessions).where(eq(s.userSessions.userId, u.id));
    expect(sessions.every((x) => x.tokenHash.length === 64)).toBe(true);
  });

  it("rejects wrong passwords, locks after repeated failures and rejects duplicate emails", async () => {
    browser.fresh();
    await expect(loginCustomer("reg@test.local", "wrong-password-1")).rejects.toThrow("incorrect");
    for (let i = 0; i < 5; i++) await loginCustomer("reg@test.local", "wrong-password-1").catch(() => null);
    await expect(loginCustomer("reg@test.local", "Customer-2026!x")).rejects.toThrow(/Too many failed attempts/);
    await db.update(s.users).set({ lockedUntil: null, failedLoginCount: 0 }).where(eq(s.users.email, "reg@test.local"));
    await expect(newCustomer("reg@test.local")).rejects.toThrow(/already exists/);
  });

  it("resets a password with a single-use token", async () => {
    browser.fresh();
    await requestPasswordReset("customer", "reg@test.local");
    const [u] = await db.select().from(s.users).where(eq(s.users.email, "reg@test.local"));
    // The raw token only exists in the email; simulate it by inserting a known token.
    const token = randomToken();
    await db.insert(s.passwordResetTokens).values({ id: "prt_test", tokenHash: sha256(token), subject: "customer", userId: u.id, purpose: "reset", expiresAt: new Date(Date.now() + 60_000) });
    await resetPassword(token, "Brand-new-pass-77");
    await expect(resetPassword(token, "Brand-new-pass-78")).rejects.toThrow(/invalid or has expired/);
    await loginCustomer("reg@test.local", "Brand-new-pass-77");
    const [n] = await db.select({ n: sql<number>`COUNT(*)` }).from(s.notifications).where(and(eq(s.notifications.recipient, "reg@test.local"), eq(s.notifications.templateKey, "password_reset")));
    expect(Number(n.n)).toBe(1);
  });
});

describe("cart and wishlist", () => {
  it("prices the cart on the server, caps quantities by stock and merges after login", async () => {
    const v = await variantWithStock(4);
    await setStock(v.variantId, 3);
    browser.fresh();
    await addToCart(v.variantId, 2);
    let cart = await getCartView();
    expect(cart.count).toBe(2);
    expect(cart.lines[0].unitPrice).toBeGreaterThan(0);
    expect(cart.currency).toBe("PKR");
    await expect(addToCart(v.variantId, 2)).rejects.toThrow(/Only 3/);
    await setCartMarket("gb");
    cart = await getCartView();
    expect(cart.currency).toBe("GBP");
    await setWished(v.productId, true);
    const guestJar = browser.current();

    const { id } = await newCustomer("merge@test.local"); // new jar = signed in elsewhere
    const userJar = browser.current();
    browser.use(new Map([...guestJar, ...userJar]));
    await mergeGuestCart(id);
    await mergeGuestWishlist(id);
    cart = await getCartView();
    expect(cart.count).toBe(2);
    expect(await wishlistProductIds()).toContain(v.productId);
    await setCartQuantity(v.variantId, 0);
    expect((await getCartView()).count).toBe(0);
  });
});

describe("checkout", () => {
  it("places a COD order atomically with a first-order coupon, deducting stock", async () => {
    const v = await variantWithStock(3);
    const before = await stockOf(v.variantId);
    browser.fresh();
    await addToCart(v.variantId, 2);
    await setCartCoupon("WELCOME10");
    const preview = await getCartView();
    const r = await placeOrder({ email: "cod@test.local", address: address(), shippingMethodId: "pk-standard", paymentMethodId: "cod", idempotencyKey: idem(), marketingConsent: false });
    expect(r.kind).toBe("confirmation");
    const [o] = await db.select().from(s.orders).where(eq(s.orders.number, r.orderNumber));
    expect(o.status).toBe("pending");
    expect(o.paymentStatus).toBe("awaiting_cod");
    expect(o.discountTotal).toBe(Math.round(preview.totals.subtotal * 0.1));
    expect(o.total).toBe(preview.totals.subtotal - o.discountTotal + o.shippingTotal);
    expect((await stockOf(v.variantId)).onHand).toBe(before.onHand - 2);
    const [red] = await db.select().from(s.couponRedemptions).where(eq(s.couponRedemptions.orderId, o.id));
    expect(red.amount).toBe(o.discountTotal);
    const [cart] = await db.select().from(s.carts).where(eq(s.carts.id, o.cartId!));
    expect(cart.status).toBe("converted");
    const mails = await db.select().from(s.notifications).where(eq(s.notifications.orderId, o.id));
    expect(mails.map((m) => m.templateKey)).toContain("order_confirmation");
    expect(mails.every((m) => m.status === "skipped")).toBe(true); // no provider configured → never reported as sent
  });

  it("blocks the reused first-order coupon at placement", async () => {
    const v = await variantWithStock(1);
    browser.fresh();
    await addToCart(v.variantId, 1);
    await db.update(s.carts).set({ couponCode: "WELCOME10" }).where(eq(s.carts.tokenHash, sha256(browser.current().get("ns_cart")!)));
    await expect(placeOrder({ email: "cod@test.local", address: address(), shippingMethodId: "pk-standard", paymentMethodId: "cod", idempotencyKey: idem(), marketingConsent: false })).rejects.toThrow(/first orders only|already used/);
  });

  it("never trusts browser prices and rejects duplicate submissions", async () => {
    const v = await variantWithStock(2);
    browser.fresh();
    await addToCart(v.variantId, 1);
    const key = idem();
    await placeOrder({ email: "dupe@test.local", address: address(), shippingMethodId: "pk-standard", paymentMethodId: "cod", idempotencyKey: key, marketingConsent: false });
    await addToCart(v.variantId, 1);
    await expect(placeOrder({ email: "dupe@test.local", address: address(), shippingMethodId: "pk-standard", paymentMethodId: "cod", idempotencyKey: key, marketingConsent: false })).rejects.toThrow(/already placed/);
  });

  it("rejects insufficient stock, unavailable methods and foreign addresses", async () => {
    const v = await variantWithStock(2);
    browser.fresh();
    await addToCart(v.variantId, 2);
    await setStock(v.variantId, 1);
    await expect(placeOrder({ email: "x@test.local", address: address(), shippingMethodId: "pk-standard", paymentMethodId: "cod", idempotencyKey: idem(), marketingConsent: false })).rejects.toThrow(/Only 1 left/);
    await setStock(v.variantId, 5);
    await expect(placeOrder({ email: "x@test.local", address: address({ city: "Multan" }), shippingMethodId: "pk-express", paymentMethodId: "cod", idempotencyKey: idem(), marketingConsent: false })).rejects.toThrow(/isn't available for your address/);
    await expect(placeOrder({ email: "x@test.local", address: address({ countryCode: "GB", region: "", city: "London" }), shippingMethodId: "gb-tracked", paymentMethodId: "cod", idempotencyKey: idem(), marketingConsent: false })).rejects.toThrow(/Prices changed|isn't available/);
  });

  it("supports an international (UK) order in GBP with VAT included", async () => {
    const v = await variantWithStock(1);
    browser.fresh();
    await setCartMarket("gb");
    await addToCart(v.variantId, 1);
    const r = await placeOrder({ email: "uk@test.local", address: address({ countryCode: "GB", city: "London", region: "", postalCode: "SW1A 1AA", phone: "+44 7700 900123" }), shippingMethodId: "gb-tracked", paymentMethodId: "test_card", idempotencyKey: idem(), marketingConsent: false });
    expect(r.kind).toBe("redirect");
    const [o] = await db.select().from(s.orders).where(eq(s.orders.number, r.orderNumber));
    expect(o.currency).toBe("GBP");
    expect(o.taxLabel).toBe("VAT");
    expect(o.taxIncluded).toBeGreaterThan(0);
  });

  it("prevents overselling under concurrent reservations", async () => {
    const v = await variantWithStock(1);
    await setStock(v.variantId, 1);
    const attempt = (i: number) => db.transaction((tx) => reserveStock(tx, `ord_race_${i}`, [{ variantId: v.variantId, quantity: 1, label: "x" }], 30)).then(() => "ok", () => "fail");
    const results = await Promise.all([1, 2, 3, 4, 5].map(attempt));
    expect(results.filter((x) => x === "ok")).toHaveLength(1);
    expect((await stockOf(v.variantId)).reserved).toBe(1);
  });
});

describe("online payments (test gateway)", () => {
  async function onlineOrder(email: string) {
    const v = await variantWithStock(2);
    browser.fresh();
    await addToCart(v.variantId, 1);
    const before = await stockOf(v.variantId);
    const r = await placeOrder({ email, address: address(), shippingMethodId: "pk-standard", paymentMethodId: "test_card", idempotencyKey: idem(), marketingConsent: false });
    const [o] = await db.select().from(s.orders).where(eq(s.orders.number, r.orderNumber));
    const [p] = await db.select().from(s.payments).where(eq(s.payments.orderId, o.id));
    return { v, before, o, p, r };
  }
  const deliver = (body: string, sig?: string) => handleWebhook("test", body, new Headers({ "x-test-signature": sig ?? testGateway.signWebhook(body) }));

  it("reserves stock, then confirms only after a signed + verified webhook; duplicates are idempotent", async () => {
    const { v, before, o, p, r } = await onlineOrder("paid@test.local");
    expect(r.kind).toBe("redirect");
    expect(o.paymentStatus).toBe("pending");
    expect((await stockOf(v.variantId)).reserved).toBe(before.reserved + 1);

    expect((await deliver(JSON.stringify({ id: "evt_forged", type: "payment.succeeded", reference: p.providerReference }), "bad")).status).toBe(400);
    const body = testGateway.settle(p.providerReference!, "paid");
    expect((await deliver(body)).status).toBe(200);
    expect((await deliver(body)).body).toBe("duplicate");

    const [after] = await db.select().from(s.orders).where(eq(s.orders.id, o.id));
    expect(after.status).toBe("confirmed");
    expect(after.paymentStatus).toBe("paid");
    expect(after.amountPaid).toBe(after.total);
    const inv = await stockOf(v.variantId);
    expect(inv.reserved).toBe(before.reserved);
    expect(inv.onHand).toBe(before.onHand - 1);
    const sales = await db.select().from(s.paymentTransactions).where(and(eq(s.paymentTransactions.paymentId, p.id), eq(s.paymentTransactions.type, "sale")));
    expect(sales).toHaveLength(1);
  });

  it("does not mark paid when the provider reports a different amount", async () => {
    const { o, p } = await onlineOrder("mismatch@test.local");
    const body = testGateway.settle(p.providerReference!, "paid", p.amount - 100);
    await deliver(body);
    const [after] = await db.select().from(s.orders).where(eq(s.orders.id, o.id));
    expect(after.paymentStatus).toBe("pending");
    const notes = await db.select().from(s.orderNotes).where(eq(s.orderNotes.orderId, o.id));
    expect(notes.some((n) => n.body.includes("mismatch"))).toBe(true);
  });

  it("cancels and releases stock when the payment fails", async () => {
    const { v, before, o, p } = await onlineOrder("failed@test.local");
    await deliver(testGateway.settle(p.providerReference!, "failed"));
    const [after] = await db.select().from(s.orders).where(eq(s.orders.id, o.id));
    expect(after.status).toBe("cancelled");
    expect(after.paymentStatus).toBe("failed");
    expect((await stockOf(v.variantId)).reserved).toBe(before.reserved);
    const view = await orderView(o.id);
    expect(view?.timeline.map((t) => t.label)).toContain("Payment not completed");
  });
});
