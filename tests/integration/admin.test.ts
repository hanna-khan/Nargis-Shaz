import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db";
import * as s from "@/server/db/schema";
import { loginStaff } from "@/server/auth/accounts";
import { requireStaff } from "@/server/auth/session";
import { addToCart } from "@/server/commerce/cart";
import { placeOrder } from "@/server/orders/checkout";
import { addShipment, addShipmentEvent, cancelOrder, createRefund, createReturn, recordCodCollection, transitionOrder, updateReturn } from "@/server/orders/admin";
import { orderView } from "@/server/orders/view";
import { adjustStock } from "@/server/inventory";
import * as cat from "@/server/admin/catalog";
import { dashboard, parseRange, report, toCsv } from "@/server/admin/reports";
import { saveCategoryAction, deleteCategoryAction } from "@/app/admin/_actions/catalog";
import { refundAction } from "@/app/admin/_actions/orders";
import { address, browser, createStaff, idem, staffBrowser, stockOf, variantWithStock } from "./helpers";

afterAll(async () => { await closeDb(); });

async function codOrder(email: string, qty = 1) {
  const v = await variantWithStock(qty + 1);
  browser.fresh();
  await addToCart(v.variantId, qty);
  const r = await placeOrder({ email, address: address(), shippingMethodId: "pk-standard", paymentMethodId: "cod", idempotencyKey: idem(), marketingConsent: false });
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, r.orderNumber));
  return { o, v };
}

describe("staff authentication & permissions", () => {
  it("signs in, records the login and audits failures", async () => {
    browser.fresh();
    await expect(loginStaff("owner@test.local", "nope-nope-123")).rejects.toThrow("incorrect");
    const { staff } = await staffBrowser();
    expect(staff.isSuperAdmin).toBe(true);
    const logs = await db.select().from(s.auditLogs).where(eq(s.auditLogs.entityType, "staff_user"));
    expect(logs.map((l) => l.action)).toEqual(expect.arrayContaining(["staff.login_failed", "staff.login"]));
  });

  it("enforces granular permissions on the server", async () => {
    await createStaff("customer_support", "support@test.local");
    browser.fresh();
    await loginStaff("support@test.local", "Staff-pass-2026!");
    await expect(requireStaff("refunds.create")).rejects.toThrow(/permission/);
    await expect(requireStaff("orders.notes")).resolves.toBeTruthy();
    const r = await refundAction(null, Object.assign(new FormData(), {}) as FormData);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/permission/);
    browser.fresh();
    await expect(requireStaff()).rejects.toThrow(/session has expired/);
  });
});

describe("order management", () => {
  it("processes a COD order through shipment, delivery, collection, return and refund", async () => {
    const { o, v } = await codOrder("ops@test.local");
    const { staff } = await staffBrowser();
    await expect(transitionOrder(staff, o.id, "shipped")).rejects.toThrow(/Add a shipment/);
    await transitionOrder(staff, o.id, "confirmed");
    await transitionOrder(staff, o.id, "processing");
    const shipmentId = await addShipment(staff, o.id, { carrier: "TCS", trackingNumber: "TCS123456", trackingUrl: "https://www.tcsexpress.com/track/TCS123456" });
    await addShipmentEvent(staff, shipmentId, { status: "delivered", description: "Delivered to customer", location: "Lahore" });
    let [after] = await db.select().from(s.orders).where(eq(s.orders.id, o.id));
    expect(after.status).toBe("delivered");

    await expect(recordCodCollection(staff, o.id, after.total - 1, "TCS-REM-1")).rejects.toThrow(/must equal/);
    await recordCodCollection(staff, o.id, after.total, "TCS-REM-1");
    [after] = await db.select().from(s.orders).where(eq(s.orders.id, o.id));
    expect(after.paymentStatus).toBe("paid");

    const view = await orderView(o.id);
    expect(view?.shipments[0].trackingNumber).toBe("TCS123456");
    expect(view?.timeline.map((t) => t.label)).toEqual(expect.arrayContaining(["Dispatched", "Delivered", "Payment received"]));

    const [item] = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id));
    const stockBefore = (await stockOf(v.variantId)).onHand;
    const ret = await createReturn(staff, o.id, "Too small", [{ orderItemId: item.id, quantity: 1, condition: "resellable" }]);
    await updateReturn(staff, ret.id, "approved");
    await updateReturn(staff, ret.id, "received");
    expect((await stockOf(v.variantId)).onHand).toBe(stockBefore + 1);
    await expect(createRefund(staff, o.id, { amount: after.total + 1, reason: "x", method: "manual" })).rejects.toThrow(/at most/);
    await createRefund(staff, o.id, { amount: after.total, reason: "Return received", method: "manual", returnId: ret.id });
    [after] = await db.select().from(s.orders).where(eq(s.orders.id, o.id));
    expect(after.paymentStatus).toBe("refunded");
    expect(after.status).toBe("returned");
    const history = await db.select().from(s.orderStatusHistory).where(eq(s.orderStatusHistory.orderId, o.id));
    expect(history.length).toBeGreaterThanOrEqual(8);
  });

  it("cancelling restocks and releases the coupon use", async () => {
    const { o, v } = await codOrder("cancel@test.local", 2);
    const before = (await stockOf(v.variantId)).onHand;
    const { staff } = await staffBrowser();
    await cancelOrder(staff, o.id, "Customer changed their mind");
    expect((await stockOf(v.variantId)).onHand).toBe(before + 2);
    const [after] = await db.select().from(s.orders).where(eq(s.orders.id, o.id));
    expect(after.status).toBe("cancelled");
    expect(after.paymentStatus).toBe("voided");
    await expect(transitionOrder(staff, o.id, "processing")).rejects.toThrow();
  });
});

describe("catalogue & inventory management", () => {
  it("creates, publishes, duplicates and deletes a product without losing order history", async () => {
    const { staff } = await staffBrowser();
    const id = await cat.createProduct(staff, {
      name: "Test Linen Kurta", slug: "", sku: "NS-TEST-KURTA", subtitle: "Linen kurta", shortDescription: "", description: "A test kurta.", categoryId: "cat-tops", extraCategoryIds: [], collectionIds: ["col-everyday"],
      occasions: ["everyday"], tags: [], fabric: "Linen", care: [], details: [], fit: null, sizeGuideId: "sg-womens", status: "draft", publishAt: null, isNew: true, isFeatured: false, isBestseller: false, sortOrder: 0, seoTitle: null, seoDescription: null,
    }, { PKR: 990000, USD: 9000, GBP: 7000, EUR: 8000 });
    await expect(cat.assertPublishable(id)).rejects.toThrow(/at least one active size\/colour, at least one image/);
    expect(await cat.addVariants(staff, id, [{ name: "Sage", hex: "#A3B18A" }], ["S", "M"])).toBe(2);
    expect(await cat.addVariants(staff, id, [{ name: "Sage", hex: "#A3B18A" }], ["S", "M"])).toBe(0);
    const [media] = await db.select().from(s.mediaAssets).limit(1);
    await cat.attachImages(staff, id, [media.id], null);
    await cat.setProductStatus(staff, [id], "active");
    const [variant] = await db.select().from(s.productVariants).where(eq(s.productVariants.productId, id));
    await adjustStock({ variantId: variant.id, mode: "add", quantity: 5, reason: "received", note: "First delivery", staffUserId: staff.id });
    await expect(adjustStock({ variantId: variant.id, mode: "add", quantity: -6, reason: "correction", note: "", staffUserId: staff.id })).rejects.toThrow(/negative/);
    const moves = await db.select().from(s.inventoryMovements).where(and(eq(s.inventoryMovements.variantId, variant.id), eq(s.inventoryMovements.type, "receipt")));
    expect(moves[0].staffUserId).toBe(staff.id);

    browser.fresh();
    await addToCart(variant.id, 1);
    const r = await placeOrder({ email: "hist@test.local", address: address(), shippingMethodId: "pk-standard", paymentMethodId: "cod", idempotencyKey: idem(), marketingConsent: false });
    const copy = await cat.duplicateProduct(staff, id);
    const [dup] = await db.select().from(s.products).where(eq(s.products.id, copy));
    expect(dup.status).toBe("draft");
    await staffBrowser();
    await cat.deleteProduct(staff, id);
    const [o] = await db.select().from(s.orders).where(eq(s.orders.number, r.orderNumber));
    const [item] = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id));
    expect(item.productId).toBeNull();
    expect(item.productName).toBe("Test Linen Kurta");
    expect(item.sku).toMatch(/^NS-TEST-KURTA/);
  });

  it("creates categories and refuses to delete one that still has products", async () => {
    await staffBrowser();
    const form = new FormData();
    form.set("name", "Test Capes"); form.set("description", "Capes"); form.set("active", "on");
    expect(await saveCategoryAction(null, form)).toMatchObject({ ok: true });
    const [c] = await db.select().from(s.categories).where(eq(s.categories.slug, "test-capes"));
    expect(c).toBeTruthy();
    const del = new FormData(); del.set("id", "cat-dresses");
    const blocked = await deleteCategoryAction(null, del);
    expect(blocked.ok).toBe(false);
    del.set("id", c.id);
    expect(await deleteCategoryAction(null, del)).toMatchObject({ ok: true });
  });
});

describe("reports", () => {
  it("separates order value, collected and refunded, from real data", async () => {
    const d = await dashboard(parseRange({ range: "today" }));
    expect(d.orderCount).toBeGreaterThan(0);
    expect(d.orderValue.find((x) => x.currency === "PKR")?.total).toBeGreaterThan(0);
    expect(d.collected.find((x) => x.currency === "PKR")?.total).toBeGreaterThan(0);
    expect(d.refunded.find((x) => x.currency === "PKR")?.total).toBeGreaterThan(0);
    const rep = await report("orders", parseRange({ range: "today" }));
    expect(rep.rows.length).toBeGreaterThan(0);
    expect(toCsv(rep).split("\r\n")[0]).toContain("Order");
  });
});
