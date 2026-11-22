import { eq } from "drizzle-orm";
import { db } from "../db";
import * as s from "../db/schema";
import { sendEmail } from "../email";
import { siteUrl } from "../lib/core";
import { formatMoney } from "@/lib/commerce/currency";
import type { CurrencyCode } from "@/types";

/** Builds the order payload (lines, totals, links) and sends a transactional template. */
export async function sendOrderEmail(orderId: string, template: string, extra: Record<string, unknown> = {}) {
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) return "missing";
  const [items, [addr]] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId)),
    db.select().from(s.orderAddresses).where(eq(s.orderAddresses.orderId, orderId)),
  ]);
  const f = (n: number) => formatMoney(n, o.currency as CurrencyCode);
  const totals = [
    { label: "Subtotal", value: f(o.subtotal) },
    ...(o.discountTotal ? [{ label: `Discount${o.couponCode ? ` (${o.couponCode})` : ""}`, value: `− ${f(o.discountTotal)}` }] : []),
    { label: "Delivery", value: o.shippingTotal ? f(o.shippingTotal) : "Complimentary" },
    ...(o.taxTotal ? [{ label: o.taxLabel ?? "Tax", value: f(o.taxTotal) }] : []),
    { label: "Total", value: f(o.total) },
  ];
  const paymentNote = o.paymentStatus === "awaiting_cod"
    ? `Please have ${f(o.total)} ready for the courier. Our team may call ${o.phone} to confirm your order before dispatch.`
    : o.paymentStatus === "paid" ? "Your payment has been received." : "";
  return sendEmail(template, o.email, {
    firstName: addr?.firstName ?? "", orderNumber: o.number, amount: f(o.total), paymentNote,
    lines: items.map((i) => ({ name: i.productName, detail: `${i.colour} · ${i.size}`, quantity: i.quantity, total: f(i.lineTotal) })),
    totals,
    actionUrl: siteUrl(o.userId ? `/account/orders/${o.number}` : `/track-order?number=${encodeURIComponent(o.number)}`),
    actionLabel: "View your order",
    ...extra,
  }, { orderId });
}
