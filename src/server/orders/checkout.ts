import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../db";
import * as s from "../db/schema";
import { audit } from "../audit";
import { getCustomer } from "../auth/session";
import { limit } from "../auth/rate-limit";
import { cartRowForCheckout, currentMarketId, priceCartItems } from "../commerce/cart";
import { loadCommerce, marketForCountry, methodsFor, taxFor } from "../commerce/config";
import { checkCoupon } from "../commerce/coupons";
import { computeTotals, type PricedLine } from "../commerce/pricing";
import { deductStock, reserveStock, releaseReservations } from "../inventory";
import { AppError, newId, normaliseEmail, randomToken, sha256, siteUrl } from "../lib/core";
import { requestMeta } from "../lib/request";
import { provider } from "../payments/providers";
import { getSettings } from "../settings";
import { sendOrderEmail } from "./emails";
import type { CurrencyCode } from "@/types";

export const addressSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(80),
  lastName: z.string().trim().min(1, "Required").max(80),
  line1: z.string().trim().min(3, "Enter your street address").max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "Required").max(100),
  region: z.string().trim().max(100).optional().default(""),
  postalCode: z.string().trim().max(20).optional().default(""),
  countryCode: z.string().trim().length(2).toUpperCase(),
  phone: z.string().trim().min(7, "Enter a phone number the courier can call").max(32).regex(/^[+()\d\s-]+$/, "Use digits, spaces and + only"),
});

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  address: addressSchema,
  shippingMethodId: z.string().min(1, "Choose a delivery method").max(64),
  paymentMethodId: z.string().min(1, "Choose a payment method").max(64),
  note: z.string().trim().max(1000).optional().default(""),
  marketingConsent: z.boolean().default(false),
  /** Generated once per checkout page view; makes double submissions return the same order. */
  idempotencyKey: z.string().min(16).max(80).regex(/^[\w-]+$/),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutResult = { kind: "confirmation"; url: string; orderNumber: string } | { kind: "redirect"; url: string; orderNumber: string };

async function nextSequence(tx: Tx, name: string, start: number) {
  await tx.execute(sql`INSERT INTO sequences (name, value) VALUES (${name}, ${start}) ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)`);
  const [rows] = (await tx.execute(sql`SELECT value FROM sequences WHERE name = ${name}`)) as unknown as [{ value: number }[]];
  return rows[0].value;
}

const affected = (r: unknown) => ((Array.isArray(r) ? (r as { affectedRows?: number }[])[0]?.affectedRows : (r as { affectedRows?: number }).affectedRows) ?? 0);

/**
 * Atomic order placement. Everything the customer sees is recomputed here from the database:
 * products, variants, stock, prices, coupon, shipping eligibility, tax, payment availability and total.
 */
export async function placeOrder(raw: CheckoutInput): Promise<CheckoutResult> {
  const input = checkoutSchema.parse(raw);
  const meta = await requestMeta();
  await limit(`checkout:${meta.ip}`, 20, 600, "Too many checkout attempts. Please wait a few minutes.");

  // Idempotency: a repeated submit returns the existing order.
  const [dupe] = await db.select().from(s.orders).where(eq(s.orders.idempotencyKey, input.idempotencyKey)).limit(1);
  if (dupe) throw new AppError(`This order was already placed (${dupe.number}). Please check your email or account.`, "duplicate", 409);

  const [settings, cfg, customer, cart] = await Promise.all([getSettings(), loadCommerce(), getCustomer(), cartRowForCheckout()]);
  if (!customer && !settings.checkout.guestCheckout) throw new AppError("Please sign in to check out.");
  if (!cart) throw new AppError("Your bag is empty.");

  const market = marketForCountry(cfg, input.address.countryCode);
  if (!market) throw new AppError("We don't currently deliver to this country.");
  const selectedMarket = await currentMarketId(cfg);
  if (market.id !== selectedMarket) throw new AppError(`Prices changed to ${market.currency} for ${cfg.countries.find((c) => c.code === input.address.countryCode)?.name}. Please review your order.`, "market_changed");
  const currency = market.currency as CurrencyCode;

  const method = methodsFor(cfg, input.address.countryCode, input.address.city).find((m) => m.id === input.shippingMethodId);
  if (!method) throw new AppError("This delivery method isn't available for your address.");
  const pm = cfg.paymentMethods.find((p) => p.id === input.paymentMethodId && p.marketIds.includes(market.id));
  if (!pm) throw new AppError("This payment method isn't available for your region.");
  if (pm.kind === "cod" && !method.codAvailable) throw new AppError("Cash on delivery isn't available with this delivery method.");
  const gateway = provider(pm.provider);
  if (!gateway?.isConfigured()) throw new AppError("This payment method is temporarily unavailable. Please choose another.");

  const accessToken = randomToken();
  const orderId = newId("ord");
  const paymentId = newId("pay");
  const email = normaliseEmail(input.email);

  const result = await db.transaction(async (tx) => {
    const items = await tx.select().from(s.cartItems).where(eq(s.cartItems.cartId, cart.id));
    if (!items.length) throw new AppError("Your bag is empty.");
    const lines = await priceCartItems(items, currency, tx);
    if (lines.length !== items.length) throw new AppError("An item in your bag is no longer available. Please review your bag.");
    for (const l of lines) {
      if (l.quantity > settings.checkout.maxQuantityPerLine) throw new AppError(`You can order up to ${settings.checkout.maxQuantityPerLine} of each piece.`);
      if (l.issue) throw new AppError(l.available ? `Only ${l.available} left of ${l.name} in ${l.size}. Please update your bag.` : `${l.name} in ${l.size} has sold out. Please update your bag.`, "out_of_stock", 409);
    }
    const priced: PricedLine[] = lines.map((l) => ({ key: l.variantId, productId: l.productId, categoryId: l.categoryId, unitPrice: l.unitPrice, quantity: l.quantity }));

    let couponRow: typeof s.coupons.$inferSelect | null = null;
    let outcome = null;
    if (cart.couponCode) {
      const r = await checkCoupon({ code: cart.couponCode, currency, marketId: market.id, lines: priced, userId: customer?.id, email, exec: tx, forUpdate: true });
      if (!r.outcome.ok) throw new AppError(`Discount code ${cart.couponCode}: ${r.outcome.reason} Remove it to continue.`, "coupon");
      couponRow = r.coupon;
      outcome = r.outcome;
    }
    const tax = taxFor(cfg, input.address.countryCode);
    const totals = computeTotals({ lines: priced, shipping: { rate: method.rate, freeOver: method.freeOver }, tax: tax ? { rateBps: Math.round(tax.rate * 10_000), inclusive: tax.inclusive, label: tax.label } : null, coupon: outcome });
    if (pm.kind === "cod" && pm.limits[currency] && totals.total > pm.limits[currency]) throw new AppError("This order is above the cash-on-delivery limit. Please pay by card.");

    const number = `${settings.orderNumberPrefix}${await nextSequence(tx, "order", 10_001)}`;
    const now = new Date();
    const cod = pm.kind === "cod";
    await tx.insert(s.orders).values({
      id: orderId, number, accessTokenHash: sha256(accessToken), idempotencyKey: input.idempotencyKey, userId: customer?.id ?? null, cartId: cart.id,
      email, phone: input.address.phone, marketId: market.id, currency, countryCode: input.address.countryCode,
      status: "pending", paymentStatus: cod ? "awaiting_cod" : "pending", paymentMethod: pm.id, shippingMethodId: method.id,
      shippingLabel: `${method.label} (${method.estimatedDays[0]}–${method.estimatedDays[1]} working days)`,
      subtotal: totals.subtotal, discountTotal: totals.discount, shippingTotal: totals.shipping, taxTotal: totals.tax, taxIncluded: totals.taxIncluded, taxLabel: tax?.label ?? null,
      total: totals.total, couponCode: couponRow?.code ?? null, customerNote: input.note || null, marketingConsent: input.marketingConsent, ip: meta.ip, placedAt: now,
    });
    const variantRows = await tx.select({ id: s.productVariants.id, cost: s.productVariants.costPrice }).from(s.productVariants).where(inArray(s.productVariants.id, lines.map((l) => l.variantId)));
    await tx.insert(s.orderItems).values(lines.map((l) => ({
      id: newId("oit"), orderId, productId: l.productId, variantId: l.variantId, productName: l.name, productSlug: l.slug, sku: l.sku, colour: l.colour, size: l.size,
      imageUrl: l.image?.src ?? null, unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, quantity: l.quantity, lineTotal: l.lineTotal,
      discountAllocated: outcome?.ok ? outcome.allocations[l.variantId] ?? 0 : 0, costPrice: variantRows.find((v) => v.id === l.variantId)?.cost ?? null,
    })));
    const a = input.address;
    await tx.insert(s.orderAddresses).values({ id: newId("oad"), orderId, type: "shipping", firstName: a.firstName, lastName: a.lastName, line1: a.line1, line2: a.line2 || null, city: a.city, region: a.region || null, postalCode: a.postalCode || null, countryCode: a.countryCode, phone: a.phone });
    await tx.insert(s.orderStatusHistory).values([
      { id: newId("osh"), orderId, field: "status", fromValue: null, toValue: "pending", actorType: "customer", note: "Order placed" },
      { id: newId("osh"), orderId, field: "payment", fromValue: null, toValue: cod ? "awaiting_cod" : "pending", actorType: "customer", note: cod ? "Cash on delivery" : `Awaiting ${pm.label}` },
    ]);
    await tx.insert(s.payments).values({ id: paymentId, orderId, methodId: pm.id, provider: pm.provider, amount: totals.total, currency, status: cod ? "awaiting_cod" : "pending" });

    const stockLines = lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, label: `${l.name} (${l.size})` }));
    if (cod) await deductStock(tx, orderId, stockLines);
    else await reserveStock(tx, orderId, stockLines, settings.checkout.reservationMinutes);

    if (couponRow && outcome?.ok) {
      const r = await tx.execute(sql`UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ${couponRow.id} AND (usage_limit IS NULL OR usage_count < usage_limit)`);
      if (affected(r) !== 1) throw new AppError("This discount code has just reached its usage limit.");
      await tx.insert(s.couponRedemptions).values({ id: newId("red"), couponId: couponRow.id, orderId, userId: customer?.id ?? null, email, amount: totals.discount, currency });
    }
    if (cod) await tx.update(s.carts).set({ status: "converted" }).where(eq(s.carts.id, cart.id));
    if (input.marketingConsent) {
      await tx.insert(s.newsletterSubscribers).values({ id: newId("nls"), email, status: "subscribed", source: "checkout", confirmedAt: now }).onDuplicateKeyUpdate({ set: { status: "subscribed", unsubscribedAt: null } });
    }
    return { number, total: totals.total, cod };
  }).catch((e: unknown) => {
    // Two submits racing with the same idempotency key: the unique index rejects the second.
    if ((e as { code?: string; cause?: { code?: string } })?.code === "ER_DUP_ENTRY" || (e as { cause?: { code?: string } })?.cause?.code === "ER_DUP_ENTRY") {
      throw new AppError("This order was already placed. Please check your email or account.", "duplicate", 409);
    }
    throw e;
  });

  await audit(customer ? { type: "customer", id: customer.id, label: customer.email } : { type: "anonymous", id: null, label: email }, "order.placed", "order", orderId, `Order ${result.number} placed (${pm.label})`);
  const confirmationUrl = siteUrl(`/checkout/confirmation/${result.number}?t=${accessToken}`);

  if (result.cod) {
    await sendOrderEmail(orderId, "order_confirmation");
    return { kind: "confirmation", url: confirmationUrl, orderNumber: result.number };
  }

  // Online: open a hosted payment session. On failure, release the reservation and cancel the attempt.
  try {
    const session = await gateway.createCheckout!({
      orderId, orderNumber: result.number, paymentId, amount: result.total, currency, email,
      returnUrl: siteUrl(`/checkout/payment-return/${result.number}?t=${accessToken}`), cancelUrl: siteUrl(`/checkout/payment-return/${result.number}?t=${accessToken}&cancelled=1`),
    });
    await db.update(s.payments).set({ providerReference: session.providerReference }).where(eq(s.payments.id, paymentId));
    await db.insert(s.paymentTransactions).values({ id: newId("ptx"), paymentId, type: "session", amount: result.total, currency, status: "pending", providerTransactionId: session.providerReference });
    return { kind: "redirect", url: session.redirectUrl, orderNumber: result.number };
  } catch (e) {
    console.error("[checkout] payment session failed", e);
    await db.transaction(async (tx) => {
      await releaseReservations(tx, orderId, "Payment session could not be created");
      await tx.update(s.payments).set({ status: "failed", failureReason: "Payment session could not be created" }).where(eq(s.payments.id, paymentId));
      await tx.update(s.orders).set({ status: "cancelled", paymentStatus: "failed", cancelledAt: new Date() }).where(eq(s.orders.id, orderId));
      await tx.update(s.couponRedemptions).set({ voidedAt: new Date() }).where(eq(s.couponRedemptions.orderId, orderId));
      await tx.execute(sql`UPDATE coupons c JOIN coupon_redemptions r ON r.coupon_id = c.id SET c.usage_count = GREATEST(c.usage_count - 1, 0) WHERE r.order_id = ${orderId}`);
      await tx.insert(s.orderStatusHistory).values({ id: newId("osh"), orderId, field: "status", fromValue: "pending", toValue: "cancelled", actorType: "system", note: "Payment provider unavailable" });
    });
    throw new AppError("We couldn't reach the payment provider, so your order wasn't placed and you haven't been charged. Please try again or choose another method.");
  }
}

/** Resolves an order for the confirmation / tracking pages: owner session or a valid access token. */
export async function orderForViewer(number: string, token: string | null) {
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, number)).limit(1);
  if (!o) return null;
  const customer = await getCustomer();
  if (customer && o.userId === customer.id) return o;
  if (token && o.accessTokenHash === sha256(token)) return o;
  return null;
}

/** Guest order tracking by number + email (rate limited). */
export async function findOrderForTracking(number: string, email: string) {
  const meta = await requestMeta();
  await limit(`track:${meta.ip}`, 20, 600);
  const [o] = await db.select().from(s.orders).where(and(eq(s.orders.number, number.trim().toUpperCase()), eq(s.orders.email, normaliseEmail(email)))).limit(1);
  return o ?? null;
}
