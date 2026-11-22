"use server";

import { invalidate, studioAction, f } from "@/server/admin/guard";
import { AppError } from "@/server/lib/core";
import * as orders from "@/server/orders/admin";
import { sendOrderEmail } from "@/server/orders/emails";
import type { OrderStatus } from "@/server/commerce/pricing";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { audit } from "@/server/audit";
import { staffActor } from "@/server/auth/session";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

export const transitionAction = studioAction("orders.update", async (staff, form) => {
  const to = f.str(form, "to") as OrderStatus;
  if (!STATUSES.includes(to)) throw new AppError("Unknown status.");
  if (to === "cancelled") throw new AppError("Use Cancel order.");
  await orders.transitionOrder(staff, f.str(form, "orderId"), to, f.str(form, "note", 500), f.bool(form, "notify"));
  invalidate("catalog");
  return `Order moved to ${to}.`;
});

export const cancelAction = studioAction("orders.cancel", async (staff, form) => {
  const reason = f.str(form, "reason", 500);
  if (!reason) throw new AppError("Give a reason for cancelling.");
  await orders.cancelOrder(staff, f.str(form, "orderId"), reason, f.bool(form, "notify"));
  invalidate("catalog");
  return "Order cancelled and stock returned.";
});

export const noteAction = studioAction("orders.notes", async (staff, form) => {
  const visibility = f.str(form, "visibility") === "customer" ? "customer" : "internal";
  await orders.addOrderNote(staff, f.str(form, "orderId"), visibility, f.str(form, "body", 5000));
  return visibility === "customer" ? "Note saved and emailed to the customer (see Messages & emails for delivery status)." : "Internal note added.";
});

export const shipmentAction = studioAction("orders.ship", async (staff, form) => {
  await orders.addShipment(staff, f.str(form, "orderId"), { carrier: f.str(form, "carrier", 60), trackingNumber: f.str(form, "trackingNumber", 80), trackingUrl: f.str(form, "trackingUrl", 500) || undefined, notify: f.bool(form, "notify") });
  return "Shipment added — the order is now shipped.";
});

export const shipmentEventAction = studioAction("orders.ship", async (staff, form) => {
  const status = f.str(form, "status") as (typeof s.shipments.$inferSelect)["status"];
  if (!["in_transit", "out_for_delivery", "delivered", "failed", "returned"].includes(status)) throw new AppError("Choose a status.");
  await orders.addShipmentEvent(staff, f.str(form, "shipmentId"), { status, description: f.str(form, "description", 300), location: f.str(form, "location", 120) });
  return "Tracking updated.";
});

export const codAction = studioAction("orders.collect_cod", async (staff, form) => {
  const amount = f.money(form, "amount");
  if (amount === null) throw new AppError("Enter the amount collected.");
  await orders.recordCodCollection(staff, f.str(form, "orderId"), amount, f.str(form, "reference", 128));
  return "Cash collection recorded. Payment status is now paid.";
});

export const confirmPaymentAction = studioAction("payments.manage", async (staff, form) => {
  await orders.confirmPaymentManually(staff, f.str(form, "orderId"), f.str(form, "reference", 128), f.str(form, "note", 300));
  invalidate("catalog");
  return "Payment confirmed.";
});

export const refundAction = studioAction("refunds.create", async (staff, form) => {
  const amount = f.money(form, "amount");
  if (amount === null) throw new AppError("Enter a refund amount.");
  await orders.createRefund(staff, f.str(form, "orderId"), { amount, reason: f.str(form, "reason", 500), method: f.str(form, "method") === "provider" ? "provider" : "manual", returnId: f.opt(form, "returnId") });
  return "Refund recorded.";
});

export const createReturnAction = studioAction("returns.manage", async (staff, form) => {
  const items = f.list(form, "itemId").map((id) => ({ orderItemId: id, quantity: f.int(form, `qty_${id}`) ?? 0, condition: (f.str(form, `cond_${id}`) === "damaged" ? "damaged" : "resellable") as "damaged" | "resellable" }));
  const r = await orders.createReturn(staff, f.str(form, "orderId"), f.str(form, "reason", 500), items);
  return `Return ${r.number} created.`;
});

export const updateReturnAction = studioAction("returns.manage", async (staff, form) => {
  const status = f.str(form, "status") as "approved" | "received" | "rejected";
  if (!["approved", "received", "rejected"].includes(status)) throw new AppError("Unknown status.");
  await orders.updateReturn(staff, f.str(form, "returnId"), status);
  invalidate("catalog");
  return `Return ${status}.`;
});

const RESENDABLE = ["order_confirmation", "payment_confirmation", "order_processing", "order_shipped", "order_delivered", "order_cancelled", "refund_confirmation"];

export const resendAction = studioAction("orders.notes", async (staff, form) => {
  const tpl = f.str(form, "template");
  if (!RESENDABLE.includes(tpl)) throw new AppError("Choose an email.");
  const orderId = f.str(form, "orderId");
  const [o] = await db.select({ number: s.orders.number }).from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) throw new AppError("Order not found.");
  const st = await sendOrderEmail(orderId, tpl);
  await audit(staffActor(staff), "order.email_resent", "order", orderId, `Sent ${tpl} for ${o.number} (${st})`);
  if (st === "sent") return "Email sent.";
  if (st === "skipped") return { ok: false, error: "Not sent: no email provider is configured (RESEND_API_KEY). The attempt is logged under Messages & emails." };
  return { ok: false, error: "The email provider rejected the message. See Messages & emails for the error." };
});

export const bulkOrdersAction = studioAction("orders.update", async (staff, form) => {
  const ids = f.list(form, "ids");
  const to = f.str(form, "to") as OrderStatus;
  if (!ids.length) throw new AppError("Select at least one order.");
  if (!["confirmed", "processing"].includes(to)) throw new AppError("Bulk updates can confirm or mark orders as processing.");
  let ok = 0;
  const errors: string[] = [];
  for (const id of ids.slice(0, 100)) {
    try { await orders.transitionOrder(staff, id, to, "Bulk update", true); ok++; } catch (e) { errors.push((e as Error).message); }
  }
  return errors.length ? { ok: false, error: `${ok} updated; ${errors.length} skipped (${errors[0]})` } : `${ok} orders updated.`;
});
