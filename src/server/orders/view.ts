import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import * as s from "../db/schema";
import type { CurrencyCode } from "@/types";

/** Customer-safe order view (confirmation, account, guest tracking). No internal notes or staff data. */
export interface OrderView {
  id: string; number: string; placedAt: string; status: string; paymentStatus: string; paymentMethod: string; currency: CurrencyCode; email: string;
  totals: { subtotal: number; discount: number; shipping: number; tax: number; taxIncluded: number; total: number; refunded: number; taxLabel: string | null };
  couponCode: string | null; shippingLabel: string;
  address: { firstName: string; lastName: string; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; countryCode: string; phone: string } | null;
  items: { id: string; name: string; slug: string; colour: string; size: string; sku: string; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null }[];
  shipments: { carrier: string; trackingNumber: string; trackingUrl: string | null; status: string; shippedAt: string | null; deliveredAt: string | null; events: { status: string; description: string; location: string | null; at: string }[] }[];
  timeline: { at: string; label: string }[];
  messages: { at: string; body: string }[];
}

const STEP: Record<string, string> = { pending: "Order placed", confirmed: "Order confirmed", processing: "Being prepared", shipped: "Dispatched", delivered: "Delivered", cancelled: "Cancelled", returned: "Returned" };
const PAY: Record<string, string> = { paid: "Payment received", failed: "Payment not completed", refunded: "Refunded", partially_refunded: "Partially refunded" };

export async function orderView(orderId: string): Promise<OrderView | null> {
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) return null;
  const [items, [addr], shipments, history, notes, pm] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId)),
    db.select().from(s.orderAddresses).where(eq(s.orderAddresses.orderId, orderId)),
    db.select().from(s.shipments).where(eq(s.shipments.orderId, orderId)).orderBy(asc(s.shipments.createdAt)),
    db.select().from(s.orderStatusHistory).where(eq(s.orderStatusHistory.orderId, orderId)).orderBy(asc(s.orderStatusHistory.createdAt)),
    db.select().from(s.orderNotes).where(eq(s.orderNotes.orderId, orderId)).orderBy(desc(s.orderNotes.createdAt)),
    db.select({ label: s.paymentMethods.label }).from(s.paymentMethods).where(eq(s.paymentMethods.id, o.paymentMethod)),
  ]);
  const events = shipments.length ? await db.select().from(s.shipmentEvents).where(inArray(s.shipmentEvents.shipmentId, shipments.map((x) => x.id))).orderBy(desc(s.shipmentEvents.occurredAt)) : [];
  return {
    id: o.id, number: o.number, placedAt: o.placedAt.toISOString(), status: o.status, paymentStatus: o.paymentStatus, paymentMethod: pm[0]?.label ?? o.paymentMethod,
    currency: o.currency as CurrencyCode, email: o.email,
    totals: { subtotal: o.subtotal, discount: o.discountTotal, shipping: o.shippingTotal, tax: o.taxTotal, taxIncluded: o.taxIncluded, total: o.total, refunded: o.amountRefunded, taxLabel: o.taxLabel },
    couponCode: o.couponCode, shippingLabel: o.shippingLabel,
    address: addr ? { firstName: addr.firstName, lastName: addr.lastName, line1: addr.line1, line2: addr.line2, city: addr.city, region: addr.region, postalCode: addr.postalCode, countryCode: addr.countryCode, phone: addr.phone } : null,
    items: items.map((i) => ({ id: i.id, name: i.productName, slug: i.productSlug, colour: i.colour, size: i.size, sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal, imageUrl: i.imageUrl })),
    shipments: shipments.map((x) => ({
      carrier: x.carrier, trackingNumber: x.trackingNumber, trackingUrl: x.trackingUrl, status: x.status, shippedAt: x.shippedAt?.toISOString() ?? null, deliveredAt: x.deliveredAt?.toISOString() ?? null,
      events: events.filter((e) => e.shipmentId === x.id).map((e) => ({ status: e.status, description: e.description, location: e.location, at: e.occurredAt.toISOString() })),
    })),
    timeline: history.flatMap((h) => {
      const label = h.field === "status" ? STEP[h.toValue] : PAY[h.toValue];
      return label ? [{ at: h.createdAt.toISOString(), label }] : [];
    }),
    messages: notes.filter((n) => n.visibility === "customer").map((n) => ({ at: n.createdAt.toISOString(), body: n.body })),
  };
}

export async function ordersForCustomer(userId: string) {
  return db.select({ id: s.orders.id, number: s.orders.number, placedAt: s.orders.placedAt, status: s.orders.status, paymentStatus: s.orders.paymentStatus, total: s.orders.total, currency: s.orders.currency })
    .from(s.orders).where(eq(s.orders.userId, userId)).orderBy(desc(s.orders.placedAt)).limit(100);
}
