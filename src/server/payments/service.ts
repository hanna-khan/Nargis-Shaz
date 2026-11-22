import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import * as s from "../db/schema";
import { audit, SYSTEM } from "../audit";
import { commitReservations, releaseReservations } from "../inventory";
import { newId } from "../lib/core";
import { sendOrderEmail } from "../orders/emails";
import { provider } from "./providers";

export type WebhookResponse = { status: number; body: string };

/**
 * Provider-agnostic webhook pipeline:
 *   1. verify signature (invalid → 400, recorded as rejected)
 *   2. de-duplicate on (provider, event id) → repeated deliveries are acknowledged, not re-applied
 *   3. confirm status + amount with the provider server-to-server
 *   4. apply the state change in one transaction (row lock on the order)
 */
export async function handleWebhook(providerId: string, rawBody: string, headers: Headers): Promise<WebhookResponse> {
  const p = provider(providerId);
  if (!p?.parseWebhook || !p.isConfigured()) return { status: 404, body: "unknown provider" };

  let event;
  try {
    event = await p.parseWebhook(rawBody, headers);
  } catch {
    event = null;
  }
  if (!event) {
    await db.insert(s.paymentWebhookEvents).values({ id: newId("whk"), provider: providerId, eventId: `rejected:${newId("x")}`, eventType: "invalid_signature", signatureValid: false, status: "rejected", payload: null, error: "Signature verification failed" });
    return { status: 400, body: "invalid signature" };
  }

  const eventRowId = newId("whk");
  try {
    await db.insert(s.paymentWebhookEvents).values({ id: eventRowId, provider: providerId, eventId: event.eventId.slice(0, 160), eventType: event.type.slice(0, 80), signatureValid: true, status: "received", payload: event.raw });
  } catch (e) {
    if ((e as { cause?: { code?: string } })?.cause?.code === "ER_DUP_ENTRY" || (e as { code?: string })?.code === "ER_DUP_ENTRY") {
      await db.update(s.paymentWebhookEvents).set({ attempts: sql`${s.paymentWebhookEvents.attempts} + 1` }).where(and(eq(s.paymentWebhookEvents.provider, providerId), eq(s.paymentWebhookEvents.eventId, event.eventId.slice(0, 160))));
      return { status: 200, body: "duplicate" };
    }
    throw e;
  }

  const finish = async (status: "processed" | "ignored" | "failed", error?: string) =>
    db.update(s.paymentWebhookEvents).set({ status, error: error ?? null, processedAt: new Date() }).where(eq(s.paymentWebhookEvents.id, eventRowId));

  if (event.outcome === "ignored" || !event.providerReference) { await finish("ignored"); return { status: 200, body: "ignored" }; }
  const [payment] = await db.select().from(s.payments).where(and(eq(s.payments.provider, providerId), eq(s.payments.providerReference, event.providerReference))).limit(1);
  if (!payment) { await finish("ignored", "No matching payment"); return { status: 200, body: "no matching payment" }; }

  try {
    const r = event.outcome === "paid" ? await markPaid(payment.id) : event.outcome === "failed" ? await markFailed(payment.id, `Provider reported ${event.type}`) : { applied: false, note: "refund events are reconciled from Studio" };
    await finish(r.applied || event.outcome === "refunded" ? "processed" : "ignored", r.note);
    return { status: 200, body: r.note ?? "ok" };
  } catch (e) {
    await finish("failed", (e as Error).message.slice(0, 500));
    // 500 makes the provider retry later; the event row records the error for Studio.
    return { status: 500, body: "processing error" };
  }
}

/** Confirms with the provider, then marks the payment/order paid. Safe to call repeatedly. */
export async function markPaid(paymentId: string): Promise<{ applied: boolean; note?: string }> {
  const [payment] = await db.select().from(s.payments).where(eq(s.payments.id, paymentId));
  if (!payment) return { applied: false, note: "payment not found" };
  if (payment.status === "paid") return { applied: false, note: "already paid" };
  const p = provider(payment.provider);
  if (!p?.verifyPayment || !payment.providerReference) return { applied: false, note: "provider cannot verify" };
  const verified = await p.verifyPayment(payment.providerReference);
  if (verified.status !== "paid") return { applied: false, note: `provider reports ${verified.status}` };
  if (verified.amount !== null && verified.amount !== payment.amount) {
    await db.insert(s.orderNotes).values({ id: newId("ont"), orderId: payment.orderId, visibility: "internal", body: `Payment amount mismatch: provider reported ${verified.amount} ${verified.currency}, expected ${payment.amount} ${payment.currency}. Not marked as paid — review in the provider dashboard.` });
    await audit(SYSTEM, "payment.amount_mismatch", "payment", payment.id, `Amount mismatch on ${payment.provider} payment`);
    return { applied: false, note: "amount mismatch" };
  }
  if (verified.currency && verified.currency.toUpperCase() !== payment.currency) return { applied: false, note: "currency mismatch" };

  const applied = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, payment.orderId)).for("update");
    const [fresh] = await tx.select().from(s.payments).where(eq(s.payments.id, payment.id)).for("update");
    if (fresh.status === "paid") return false;
    await tx.update(s.payments).set({ status: "paid", providerPaymentId: verified.providerPaymentId, paidAt: new Date() }).where(eq(s.payments.id, payment.id));
    await tx.insert(s.paymentTransactions).values({ id: newId("ptx"), paymentId: payment.id, type: "sale", amount: payment.amount, currency: payment.currency, status: "succeeded", providerTransactionId: verified.providerPaymentId ?? `${payment.providerReference}:sale`, raw: verified });
    // A cancelled order (e.g. reservation expired) that is paid late keeps its status; staff must refund or reinstate.
    const reinstate = order.status === "pending";
    await tx.update(s.orders).set({ paymentStatus: "paid", amountPaid: payment.amount, ...(reinstate ? { status: "confirmed" as const } : {}) }).where(eq(s.orders.id, order.id));
    await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId: order.id, field: "payment", fromValue: order.paymentStatus, toValue: "paid", actorType: "provider", note: `${payment.provider} payment verified` });
    if (reinstate) {
      await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId: order.id, field: "status", fromValue: "pending", toValue: "confirmed", actorType: "system", note: "Payment confirmed" });
      await commitReservations(tx, order.id);
      if (order.cartId) await tx.update(s.carts).set({ status: "converted" }).where(eq(s.carts.id, order.cartId));
    } else {
      await tx.insert(s.orderNotes).values({ id: newId("ont"), orderId: order.id, visibility: "internal", body: `Payment received after the order was ${order.status}. Refund the customer or reinstate the order.` });
    }
    return true;
  });
  if (applied) {
    await audit(SYSTEM, "payment.paid", "payment", payment.id, `Payment verified for order ${payment.orderId}`);
    await sendOrderEmail(payment.orderId, "payment_confirmation");
    await sendOrderEmail(payment.orderId, "order_confirmation");
  }
  return { applied };
}

export async function markFailed(paymentId: string, reason: string): Promise<{ applied: boolean; note?: string }> {
  const applied = await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(s.payments).where(eq(s.payments.id, paymentId)).for("update");
    if (!payment || payment.status === "paid" || payment.status === "failed") return false;
    const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, payment.orderId)).for("update");
    await tx.update(s.payments).set({ status: "failed", failureReason: reason.slice(0, 300) }).where(eq(s.payments.id, payment.id));
    await tx.insert(s.paymentTransactions).values({ id: newId("ptx"), paymentId: payment.id, type: "failure", amount: payment.amount, currency: payment.currency, status: "failed", providerTransactionId: `${payment.providerReference}:failure` }).onDuplicateKeyUpdate({ set: { status: "failed" } });
    await releaseReservations(tx, order.id, "Payment failed");
    if (order.status === "pending") {
      await tx.update(s.orders).set({ status: "cancelled", paymentStatus: "failed", cancelledAt: new Date() }).where(eq(s.orders.id, order.id));
      await tx.insert(s.orderStatusHistory).values([
        { id: newId("osh"), orderId: order.id, field: "payment", fromValue: order.paymentStatus, toValue: "failed", actorType: "provider", note: reason.slice(0, 500) },
        { id: newId("osh"), orderId: order.id, field: "status", fromValue: "pending", toValue: "cancelled", actorType: "system", note: "Payment not completed" },
      ]);
      await tx.update(s.couponRedemptions).set({ voidedAt: new Date() }).where(eq(s.couponRedemptions.orderId, order.id));
      await tx.execute(sql`UPDATE coupons c JOIN coupon_redemptions r ON r.coupon_id = c.id SET c.usage_count = GREATEST(c.usage_count - 1, 0) WHERE r.order_id = ${order.id}`);
    }
    return true;
  });
  if (applied) {
    const [p] = await db.select({ orderId: s.payments.orderId }).from(s.payments).where(eq(s.payments.id, paymentId));
    await sendOrderEmail(p.orderId, "payment_failed");
  }
  return { applied };
}

/** On return from the hosted page we ask the provider directly; the URL itself is never trusted. */
export async function reconcileOnReturn(orderId: string) {
  const [payment] = await db.select().from(s.payments).where(eq(s.payments.orderId, orderId)).limit(1);
  if (!payment || payment.status !== "pending" || !payment.providerReference) return payment?.status ?? null;
  const p = provider(payment.provider);
  if (!p?.verifyPayment) return payment.status;
  try {
    const v = await p.verifyPayment(payment.providerReference);
    if (v.status === "paid") await markPaid(payment.id);
  } catch (e) {
    console.error("[payments] reconcile failed", e);
  }
  const [after] = await db.select({ status: s.payments.status }).from(s.payments).where(eq(s.payments.id, payment.id));
  return after.status;
}

/** Cancels online orders whose reservation window has elapsed without a verified payment. */
export async function expireUnpaidOrders() {
  const rows = await db.select({ orderId: s.stockReservations.orderId }).from(s.stockReservations)
    .where(and(eq(s.stockReservations.status, "active"), sql`${s.stockReservations.expiresAt} < UTC_TIMESTAMP(3)`)).groupBy(s.stockReservations.orderId).limit(100);
  let n = 0;
  for (const r of rows) {
    const [payment] = await db.select().from(s.payments).where(eq(s.payments.orderId, r.orderId)).limit(1);
    if (payment && (payment.status === "pending")) {
      // Last chance: the provider may have captured the payment while the webhook was delayed.
      const st = await reconcileOnReturn(r.orderId);
      if (st === "paid") continue;
      await markFailed(payment.id, "Payment window expired");
      n++;
    } else {
      await db.transaction((tx) => releaseReservations(tx, r.orderId, "Reservation expired"));
    }
  }
  return n;
}
