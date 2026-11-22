import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import * as s from "../db/schema";
import { audit } from "../audit";
import { staffActor, type StaffSession } from "../auth/session";
import { canTransition, ORDER_STATUS_LABEL, type OrderStatus } from "../commerce/pricing";
import { commitReservations, releaseReservations, restock } from "../inventory";
import { AppError, newId } from "../lib/core";
import { provider } from "../payments/providers";
import { sendOrderEmail } from "./emails";
import { formatMoney } from "@/lib/commerce/currency";
import type { CurrencyCode } from "@/types";

const STATUS_EMAIL: Partial<Record<OrderStatus, string>> = { processing: "order_processing", delivered: "order_delivered", cancelled: "order_cancelled" };

async function lockOrder(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string) {
  const [o] = await tx.select().from(s.orders).where(eq(s.orders.id, id)).for("update");
  if (!o) throw new AppError("Order not found.", "not_found", 404);
  return o;
}

/** Controlled status change. Shipping goes through addShipment; cancellation through cancelOrder. */
export async function transitionOrder(staff: StaffSession, orderId: string, to: OrderStatus, note = "", notify = true) {
  if (to === "cancelled") return cancelOrder(staff, orderId, note || "Cancelled by staff", notify);
  if (to === "shipped") throw new AppError("Add a shipment with tracking details to mark the order as shipped.");
  const order = await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (!canTransition(o.status, to)) throw new AppError(`An order that is ${ORDER_STATUS_LABEL[o.status].toLowerCase()} can't be moved to ${ORDER_STATUS_LABEL[to].toLowerCase()}.`);
    if (o.status === "pending" && to === "confirmed" && o.paymentStatus === "pending") throw new AppError("This order is waiting for online payment. It is confirmed automatically when the payment is verified.");
    await tx.update(s.orders).set({ status: to }).where(eq(s.orders.id, orderId));
    await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId, field: "status", fromValue: o.status, toValue: to, actorType: "staff", staffUserId: staff.id, note: note.slice(0, 500) });
    if (to === "delivered") await tx.update(s.shipments).set({ status: "delivered", deliveredAt: new Date() }).where(and(eq(s.shipments.orderId, orderId), sql`${s.shipments.status} <> 'delivered'`));
    return o;
  });
  await audit(staffActor(staff), "order.status_changed", "order", orderId, `${order.number}: ${order.status} → ${to}`, { status: { from: order.status, to } });
  if (notify && STATUS_EMAIL[to]) await sendOrderEmail(orderId, STATUS_EMAIL[to]!);
}

export async function cancelOrder(staff: StaffSession | null, orderId: string, reason: string, notify = true) {
  const order = await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (!canTransition(o.status, "cancelled")) throw new AppError(`A ${o.status} order can't be cancelled. Use a return instead.`);
    const released = await releaseReservations(tx, orderId, "Order cancelled");
    if (!released) {
      // Stock was already deducted (COD or paid): put it back.
      const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
      for (const it of items) if (it.variantId) await restock(tx, it.variantId, it.quantity, "cancel_restock", { orderId, staffUserId: staff?.id, note: "Order cancelled" });
    }
    const payStatus = o.paymentStatus === "awaiting_cod" || o.paymentStatus === "pending" ? "voided" : o.paymentStatus;
    await tx.update(s.orders).set({ status: "cancelled", paymentStatus: payStatus, cancelledAt: new Date() }).where(eq(s.orders.id, orderId));
    await tx.update(s.payments).set({ status: "cancelled" }).where(and(eq(s.payments.orderId, orderId), inArray(s.payments.status, ["pending", "awaiting_cod"])));
    await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId, field: "status", fromValue: o.status, toValue: "cancelled", actorType: staff ? "staff" : "system", staffUserId: staff?.id ?? null, note: reason.slice(0, 500) });
    await tx.update(s.couponRedemptions).set({ voidedAt: new Date() }).where(and(eq(s.couponRedemptions.orderId, orderId), sql`${s.couponRedemptions.voidedAt} IS NULL`));
    await tx.execute(sql`UPDATE coupons c JOIN coupon_redemptions r ON r.coupon_id = c.id SET c.usage_count = GREATEST(c.usage_count - 1, 0) WHERE r.order_id = ${orderId}`);
    return o;
  });
  if (staff) await audit(staffActor(staff), "order.cancelled", "order", orderId, `Cancelled ${order.number}: ${reason}`);
  if (notify) await sendOrderEmail(orderId, "order_cancelled", { reason: order.paymentStatus === "paid" ? "Your refund is being processed." : "" });
  return order;
}

export async function addOrderNote(staff: StaffSession, orderId: string, visibility: "internal" | "customer", body: string) {
  const text = body.trim();
  if (!text) throw new AppError("Write a note first.");
  const [o] = await db.select({ number: s.orders.number }).from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) throw new AppError("Order not found.");
  const id = newId("ont");
  await db.insert(s.orderNotes).values({ id, orderId, visibility, body: text.slice(0, 5000), staffUserId: staff.id });
  if (visibility === "customer") {
    const st = await sendOrderEmail(orderId, "order_note", { message: text });
    if (st === "sent") await db.update(s.orderNotes).set({ notifiedAt: new Date() }).where(eq(s.orderNotes.id, id));
  }
  await audit(staffActor(staff), "order.note_added", "order", orderId, `${visibility === "customer" ? "Customer-facing" : "Internal"} note on ${o.number}`);
}

export async function addShipment(staff: StaffSession, orderId: string, data: { carrier: string; trackingNumber: string; trackingUrl?: string; notify?: boolean }) {
  if (!data.carrier.trim() || !data.trackingNumber.trim()) throw new AppError("Carrier and tracking number are required.");
  if (data.trackingUrl && !/^https:\/\//.test(data.trackingUrl)) throw new AppError("Tracking links must start with https://");
  const shipmentId = newId("shp");
  const order = await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (!["confirmed", "processing", "shipped"].includes(o.status)) throw new AppError(`A ${o.status} order can't be shipped. Confirm it first.`);
    const now = new Date();
    await tx.insert(s.shipments).values({ id: shipmentId, orderId, carrier: data.carrier.trim().slice(0, 60), trackingNumber: data.trackingNumber.trim().slice(0, 80), trackingUrl: data.trackingUrl?.trim() || null, status: "in_transit", shippedAt: now, staffUserId: staff.id });
    await tx.insert(s.shipmentEvents).values({ id: newId("sev"), shipmentId, status: "in_transit", description: `Dispatched with ${data.carrier}`, occurredAt: now });
    if (o.status !== "shipped") {
      await tx.update(s.orders).set({ status: "shipped" }).where(eq(s.orders.id, orderId));
      await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId, field: "status", fromValue: o.status, toValue: "shipped", actorType: "staff", staffUserId: staff.id, note: `${data.carrier} ${data.trackingNumber}` });
    }
    return o;
  });
  await audit(staffActor(staff), "order.shipped", "order", orderId, `Shipment ${data.carrier} ${data.trackingNumber} added to ${order.number}`);
  if (data.notify !== false) await sendOrderEmail(orderId, "order_shipped", { carrier: data.carrier, trackingNumber: data.trackingNumber, ...(data.trackingUrl ? { actionUrl: data.trackingUrl, actionLabel: "Track your parcel" } : {}) });
  return shipmentId;
}

export async function addShipmentEvent(staff: StaffSession, shipmentId: string, data: { status: (typeof s.shipments.$inferSelect)["status"]; description: string; location?: string }) {
  const [sh] = await db.select().from(s.shipments).where(eq(s.shipments.id, shipmentId));
  if (!sh) throw new AppError("Shipment not found.");
  await db.insert(s.shipmentEvents).values({ id: newId("sev"), shipmentId, status: data.status, description: data.description.slice(0, 300) || data.status.replace(/_/g, " "), location: data.location?.slice(0, 120) || null, occurredAt: new Date() });
  await db.update(s.shipments).set({ status: data.status, ...(data.status === "delivered" ? { deliveredAt: new Date() } : {}) }).where(eq(s.shipments.id, shipmentId));
  await audit(staffActor(staff), "shipment.updated", "order", sh.orderId, `Shipment ${sh.trackingNumber}: ${data.status}`);
  if (data.status === "delivered") {
    const [o] = await db.select().from(s.orders).where(eq(s.orders.id, sh.orderId));
    if (o?.status === "shipped") await transitionOrder(staff, o.id, "delivered", "Courier confirmed delivery");
  }
}

/** Records cash collected by the courier for a COD order. */
export async function recordCodCollection(staff: StaffSession, orderId: string, amount: number, reference: string) {
  const order = await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (o.paymentStatus !== "awaiting_cod") throw new AppError("This order isn't awaiting cash on delivery.");
    if (o.status === "cancelled") throw new AppError("This order is cancelled.");
    if (amount !== o.total) throw new AppError(`The collected amount must equal the order total (${formatMoney(o.total, o.currency as CurrencyCode)}). Record differences as an internal note.`);
    const [payment] = await tx.select().from(s.payments).where(eq(s.payments.orderId, orderId)).for("update");
    await tx.update(s.payments).set({ status: "paid", paidAt: new Date(), providerPaymentId: reference.slice(0, 128) || null }).where(eq(s.payments.id, payment.id));
    await tx.insert(s.paymentTransactions).values({ id: newId("ptx"), paymentId: payment.id, type: "cod_collection", amount, currency: o.currency, status: "succeeded", providerTransactionId: reference.slice(0, 128) || `cod:${o.number}`, staffUserId: staff.id });
    await tx.update(s.orders).set({ paymentStatus: "paid", amountPaid: amount }).where(eq(s.orders.id, orderId));
    await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId, field: "payment", fromValue: "awaiting_cod", toValue: "paid", actorType: "staff", staffUserId: staff.id, note: `Cash collected${reference ? ` · ref ${reference}` : ""}` });
    return o;
  });
  await audit(staffActor(staff), "order.cod_collected", "order", orderId, `COD collected for ${order.number}: ${formatMoney(amount, order.currency as CurrencyCode)}`);
}

/**
 * Staff confirmation that an online payment was verified in the provider's dashboard
 * (used when a webhook couldn't be processed). Requires payments.manage and is audited.
 */
export async function confirmPaymentManually(staff: StaffSession, orderId: string, providerPaymentId: string, note: string) {
  if (!providerPaymentId.trim()) throw new AppError("Enter the provider's transaction reference.");
  const order = await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (o.paymentStatus !== "pending" && o.paymentStatus !== "failed") throw new AppError("Only pending or failed online payments can be confirmed manually.");
    const [payment] = await tx.select().from(s.payments).where(eq(s.payments.orderId, orderId)).for("update");
    await tx.update(s.payments).set({ status: "paid", paidAt: new Date(), providerPaymentId: providerPaymentId.slice(0, 128) }).where(eq(s.payments.id, payment.id));
    await tx.insert(s.paymentTransactions).values({ id: newId("ptx"), paymentId: payment.id, type: "sale", amount: payment.amount, currency: payment.currency, status: "succeeded", providerTransactionId: providerPaymentId.slice(0, 128), staffUserId: staff.id, raw: { manual: true, note } });
    await tx.update(s.orders).set({ paymentStatus: "paid", amountPaid: payment.amount, ...(o.status === "pending" ? { status: "confirmed" as const } : {}) }).where(eq(s.orders.id, orderId));
    await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId, field: "payment", fromValue: o.paymentStatus, toValue: "paid", actorType: "staff", staffUserId: staff.id, note: `Verified in provider dashboard: ${providerPaymentId}. ${note}`.slice(0, 500) });
    if (o.status === "pending") await commitReservations(tx, orderId);
    return o;
  });
  await audit(staffActor(staff), "payment.manually_confirmed", "order", orderId, `Payment for ${order.number} confirmed manually (ref ${providerPaymentId})`);
}

/* ───────────────────────────── Returns & refunds ───────────────────────────── */

export async function createReturn(staff: StaffSession, orderId: string, reason: string, items: { orderItemId: string; quantity: number; condition: "resellable" | "damaged" }[]) {
  const lines = items.filter((i) => i.quantity > 0);
  if (!lines.length) throw new AppError("Choose at least one item to return.");
  if (!reason.trim()) throw new AppError("Give a reason for the return.");
  const id = newId("ret");
  const number = await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (!["shipped", "delivered", "returned"].includes(o.status)) throw new AppError("Returns can only be created for shipped or delivered orders.");
    const orderItems = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
    for (const l of lines) {
      const it = orderItems.find((x) => x.id === l.orderItemId);
      if (!it) throw new AppError("Item not found on this order.");
      if (l.quantity > it.quantity - it.quantityReturned) throw new AppError(`Only ${it.quantity - it.quantityReturned} of ${it.productName} can still be returned.`);
    }
    await tx.execute(sql`INSERT INTO sequences (name, value) VALUES ('return', 1) ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)`);
    const [rows] = (await tx.execute(sql`SELECT value FROM sequences WHERE name = 'return'`)) as unknown as [{ value: number }[]];
    const num = `R-${o.number.replace(/\D/g, "")}-${rows[0].value}`;
    await tx.insert(s.returns).values({ id, orderId, number: num, status: "requested", reason: reason.slice(0, 500), staffUserId: staff.id });
    await tx.insert(s.returnItems).values(lines.map((l) => ({ id: newId("rit"), returnId: id, orderItemId: l.orderItemId, quantity: l.quantity, condition: l.condition })));
    return num;
  });
  await audit(staffActor(staff), "return.created", "order", orderId, `Return ${number} created`);
  await sendOrderEmail(orderId, "return_update", { returnNumber: number, returnStatus: "requested" });
  return { id, number };
}

/** approved → received (restocks resellable items, records damaged) → refunded (via createRefund) or rejected. */
export async function updateReturn(staff: StaffSession, returnId: string, status: "approved" | "received" | "rejected") {
  const ret = await db.transaction(async (tx) => {
    const [r] = await tx.select().from(s.returns).where(eq(s.returns.id, returnId)).for("update");
    if (!r) throw new AppError("Return not found.");
    const allowed: Record<string, string[]> = { requested: ["approved", "rejected"], approved: ["received", "rejected"], received: [], refunded: [], rejected: [] };
    if (!allowed[r.status].includes(status)) throw new AppError(`A ${r.status} return can't be marked ${status}.`);
    await tx.update(s.returns).set({ status }).where(eq(s.returns.id, returnId));
    if (status === "received") {
      const items = await tx.select().from(s.returnItems).innerJoin(s.orderItems, eq(s.orderItems.id, s.returnItems.orderItemId)).where(eq(s.returnItems.returnId, returnId));
      for (const { return_items: ri, order_items: oi } of items) {
        await tx.update(s.orderItems).set({ quantityReturned: sql`${s.orderItems.quantityReturned} + ${ri.quantity}` }).where(eq(s.orderItems.id, oi.id));
        if (oi.variantId && ri.condition === "resellable") {
          await restock(tx, oi.variantId, ri.quantity, "return", { orderId: r.orderId, staffUserId: staff.id, note: `Return ${r.number}` });
          await tx.update(s.returnItems).set({ restocked: true }).where(eq(s.returnItems.id, ri.id));
        } else if (oi.variantId) {
          await tx.execute(sql`UPDATE inventory SET damaged = damaged + ${ri.quantity} WHERE variant_id = ${oi.variantId}`);
          await tx.insert(s.inventoryMovements).values({ id: newId("mov"), variantId: oi.variantId, type: "damage", quantity: 0, onHandAfter: 0, orderId: r.orderId, staffUserId: staff.id, note: `Damaged return ${r.number} (not restocked)` });
        }
      }
      const all = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, r.orderId));
      if (all.every((i) => i.quantityReturned >= i.quantity)) {
        const [o] = await tx.select().from(s.orders).where(eq(s.orders.id, r.orderId));
        if (canTransition(o.status, "returned")) {
          await tx.update(s.orders).set({ status: "returned" }).where(eq(s.orders.id, r.orderId));
          await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId: r.orderId, field: "status", fromValue: o.status, toValue: "returned", actorType: "staff", staffUserId: staff.id, note: `Return ${r.number} received` });
        }
      }
    }
    return r;
  });
  await audit(staffActor(staff), `return.${status}`, "order", ret.orderId, `Return ${ret.number} ${status}`);
  await sendOrderEmail(ret.orderId, "return_update", { returnNumber: ret.number, returnStatus: status });
}

/**
 * Refunds up to the amount paid. Provider refunds call the gateway API; manual refunds (COD cash,
 * bank transfer) are recorded for reconciliation. Payment/order statuses are updated accordingly.
 */
export async function createRefund(staff: StaffSession, orderId: string, args: { amount: number; reason: string; method: "provider" | "manual"; returnId?: string | null }) {
  if (!Number.isInteger(args.amount) || args.amount <= 0) throw new AppError("Enter a refund amount.");
  if (!args.reason.trim()) throw new AppError("Give a reason for the refund.");
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!order) throw new AppError("Order not found.");
  const [payment] = await db.select().from(s.payments).where(eq(s.payments.orderId, orderId)).limit(1);
  const refundable = order.amountPaid - order.amountRefunded;
  if (refundable <= 0) throw new AppError("Nothing has been paid on this order yet, so there is nothing to refund.");
  if (args.amount > refundable) throw new AppError(`You can refund at most ${formatMoney(refundable, order.currency as CurrencyCode)}.`);
  const refundId = newId("rfd");
  await db.insert(s.refunds).values({ id: refundId, orderId, paymentId: payment?.id ?? null, returnId: args.returnId ?? null, amount: args.amount, currency: order.currency, method: args.method, status: "pending", reason: args.reason.slice(0, 500), staffUserId: staff.id });

  let providerRefundId: string | null = null;
  if (args.method === "provider") {
    const p = payment ? provider(payment.provider) : null;
    if (!payment || !p?.refund) {
      await db.update(s.refunds).set({ status: "failed" }).where(eq(s.refunds.id, refundId));
      throw new AppError("This payment provider doesn't support API refunds. Refund in the provider dashboard and record a manual refund.");
    }
    const r = await p.refund({ providerReference: payment.providerReference ?? "", providerPaymentId: payment.providerPaymentId, amount: args.amount, currency: order.currency, idempotencyKey: refundId });
    if (!r.ok) {
      await db.update(s.refunds).set({ status: "failed" }).where(eq(s.refunds.id, refundId));
      await audit(staffActor(staff), "refund.failed", "order", orderId, `Refund failed for ${order.number}: ${r.error}`);
      throw new AppError(`The provider rejected the refund: ${r.error}`);
    }
    providerRefundId = r.providerRefundId;
  }

  await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    const refunded = o.amountRefunded + args.amount;
    const full = refunded >= o.amountPaid;
    await tx.update(s.refunds).set({ status: "succeeded", providerRefundId }).where(eq(s.refunds.id, refundId));
    await tx.update(s.orders).set({ amountRefunded: refunded, paymentStatus: full ? "refunded" : "partially_refunded" }).where(eq(s.orders.id, orderId));
    if (payment) {
      await tx.update(s.payments).set({ amountRefunded: refunded, status: full ? "refunded" : "partially_refunded" }).where(eq(s.payments.id, payment.id));
      await tx.insert(s.paymentTransactions).values({ id: newId("ptx"), paymentId: payment.id, type: "refund", amount: args.amount, currency: o.currency, status: "succeeded", providerTransactionId: providerRefundId ?? `manual:${refundId}`, staffUserId: staff.id });
    }
    await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId, field: "payment", fromValue: o.paymentStatus, toValue: full ? "refunded" : "partially_refunded", actorType: "staff", staffUserId: staff.id, note: `Refund ${formatMoney(args.amount, o.currency as CurrencyCode)} (${args.method}): ${args.reason}`.slice(0, 500) });
    if (args.returnId) await tx.update(s.returns).set({ status: "refunded" }).where(eq(s.returns.id, args.returnId));
  });
  await audit(staffActor(staff), "refund.created", "order", orderId, `Refunded ${formatMoney(args.amount, order.currency as CurrencyCode)} on ${order.number} (${args.method})`, { amountRefunded: { from: order.amountRefunded, to: order.amountRefunded + args.amount } });
  await sendOrderEmail(orderId, "refund_confirmation", { amount: formatMoney(args.amount, order.currency as CurrencyCode) });
  return refundId;
}
