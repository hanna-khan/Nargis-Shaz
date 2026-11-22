import { and, desc, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, type Executor } from "../db";
import * as s from "../db/schema";
import { getCustomer } from "../auth/session";
import { loadProducts, visibleProduct } from "../catalog/products";
import { AppError, clamp, newId, randomToken, sha256 } from "../lib/core";
import { getSettings } from "../settings";
import { formatMoney } from "@/lib/commerce/currency";
import { loadCommerce, methodsFor, taxFor, type CommerceData } from "./config";
import { checkCoupon } from "./coupons";
import { computeTotals, type CouponOutcome, type PricedLine, type Totals } from "./pricing";
import type { CurrencyCode, ProductImage } from "@/types";

/**
 * Server-side cart. Guests are identified by a random token in an httpOnly cookie (only its hash is
 * stored); signed-in customers by user id. The browser never supplies prices — every view is
 * re-priced from the catalogue in the shopper's market currency.
 */
export const CART_COOKIE = "ns_cart";
export const MARKET_COOKIE = "ns_market";
const COOKIE_AGE = 60 * 60 * 24 * 60;
const secure = () => process.env.NODE_ENV === "production" && !process.env.APP_URL?.startsWith("http://");

export async function currentMarketId(data?: CommerceData) {
  const cfg = data ?? (await loadCommerce());
  const fromCookie = (await cookies()).get(MARKET_COOKIE)?.value;
  if (fromCookie && cfg.markets.some((m) => m.id === fromCookie)) return fromCookie;
  return (await getSettings()).defaultMarketId;
}

type CartRow = typeof s.carts.$inferSelect;

async function findCart(exec: Executor = db): Promise<CartRow | null> {
  const customer = await getCustomer();
  if (customer) {
    const [c] = await exec.select().from(s.carts).where(and(eq(s.carts.userId, customer.id), eq(s.carts.status, "active"))).orderBy(desc(s.carts.updatedAt)).limit(1);
    return c ?? null;
  }
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  const [c] = await exec.select().from(s.carts).where(and(eq(s.carts.tokenHash, sha256(token)), eq(s.carts.status, "active"))).limit(1);
  return c ?? null;
}

async function getOrCreateCart(): Promise<CartRow> {
  const existing = await findCart();
  if (existing) return existing;
  const customer = await getCustomer();
  const marketId = await currentMarketId();
  const id = newId("crt");
  if (customer) {
    await db.insert(s.carts).values({ id, userId: customer.id, marketId, email: customer.email });
  } else {
    const token = randomToken();
    await db.insert(s.carts).values({ id, tokenHash: sha256(token), marketId });
    (await cookies()).set(CART_COOKIE, token, { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", maxAge: COOKIE_AGE });
  }
  const [row] = await db.select().from(s.carts).where(eq(s.carts.id, id));
  return row;
}

async function variantInfo(variantId: string) {
  const [v] = await db.select({ id: s.productVariants.id, productId: s.productVariants.productId, active: s.productVariants.active }).from(s.productVariants)
    .innerJoin(s.products, eq(s.products.id, s.productVariants.productId)).where(and(eq(s.productVariants.id, variantId), visibleProduct())).limit(1);
  if (!v || !v.active) throw new AppError("This item is no longer available.");
  const [inv] = await db.select().from(s.inventory).where(eq(s.inventory.variantId, variantId));
  return { ...v, available: Math.max(0, (inv?.onHand ?? 0) - (inv?.reserved ?? 0)) };
}

export async function addToCart(variantId: string, quantity: number) {
  const max = (await getSettings()).checkout.maxQuantityPerLine;
  const v = await variantInfo(variantId);
  const cart = await getOrCreateCart();
  const [line] = await db.select().from(s.cartItems).where(and(eq(s.cartItems.cartId, cart.id), eq(s.cartItems.variantId, variantId)));
  const next = clamp((line?.quantity ?? 0) + Math.floor(quantity), 1, max);
  if (v.available <= 0) throw new AppError("Sorry, this size has just sold out.");
  if (next > v.available) throw new AppError(v.available === 1 ? "Only 1 piece is left in this size." : `Only ${v.available} pieces are left in this size.`);
  await db.insert(s.cartItems).values({ id: newId("cit"), cartId: cart.id, variantId, quantity: next }).onDuplicateKeyUpdate({ set: { quantity: next } });
  await db.update(s.carts).set({ updatedAt: new Date() }).where(eq(s.carts.id, cart.id));
}

export async function setCartQuantity(variantId: string, quantity: number) {
  const cart = await findCart();
  if (!cart) return;
  if (quantity < 1) {
    await db.delete(s.cartItems).where(and(eq(s.cartItems.cartId, cart.id), eq(s.cartItems.variantId, variantId)));
    return;
  }
  const max = (await getSettings()).checkout.maxQuantityPerLine;
  const v = await variantInfo(variantId);
  const q = clamp(Math.floor(quantity), 1, max);
  if (q > v.available) throw new AppError(v.available ? `Only ${v.available} left in this size.` : "This size has sold out.");
  await db.update(s.cartItems).set({ quantity: q }).where(and(eq(s.cartItems.cartId, cart.id), eq(s.cartItems.variantId, variantId)));
}

/** Swaps a line to another size/colour of the same product (keeps quantity where stock allows). */
export async function changeCartVariant(fromVariantId: string, toVariantId: string) {
  const cart = await findCart();
  if (!cart || fromVariantId === toVariantId) return;
  const [line] = await db.select().from(s.cartItems).where(and(eq(s.cartItems.cartId, cart.id), eq(s.cartItems.variantId, fromVariantId)));
  if (!line) return;
  const [from, to] = await Promise.all([variantInfo(fromVariantId).catch(() => null), variantInfo(toVariantId)]);
  if (from && from.productId !== to.productId) throw new AppError("Choose a size or colour of the same piece.");
  if (to.available <= 0) throw new AppError("That option has sold out.");
  await db.transaction(async (tx) => {
    await tx.delete(s.cartItems).where(eq(s.cartItems.id, line.id));
    const [existing] = await tx.select().from(s.cartItems).where(and(eq(s.cartItems.cartId, cart.id), eq(s.cartItems.variantId, toVariantId)));
    const q = Math.min(to.available, (existing?.quantity ?? 0) + line.quantity);
    await tx.insert(s.cartItems).values({ id: newId("cit"), cartId: cart.id, variantId: toVariantId, quantity: q }).onDuplicateKeyUpdate({ set: { quantity: q } });
  });
}

export async function removeFromCart(variantId: string) {
  return setCartQuantity(variantId, 0);
}

export async function setCartCoupon(code: string | null) {
  const cart = await getOrCreateCart();
  if (code) {
    const view = await getCartView({ couponOverride: code });
    if (!view.coupon?.applied) throw new AppError(view.coupon?.message ?? "This code isn't valid.");
  }
  await db.update(s.carts).set({ couponCode: code }).where(eq(s.carts.id, cart.id));
}

export async function setCartMarket(marketId: string) {
  const cfg = await loadCommerce();
  if (!cfg.markets.some((m) => m.id === marketId)) throw new AppError("We don't currently ship to this region.");
  (await cookies()).set(MARKET_COOKIE, marketId, { httpOnly: false, secure: secure(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  const cart = await findCart();
  if (cart) await db.update(s.carts).set({ marketId }).where(eq(s.carts.id, cart.id));
}

/** After sign-in: fold the guest cart into the customer's cart, respecting stock and the per-line cap. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;
  const [guest] = await db.select().from(s.carts).where(and(eq(s.carts.tokenHash, sha256(token)), eq(s.carts.status, "active")));
  jar.set(CART_COOKIE, "", { path: "/", maxAge: 0 });
  if (!guest) return;
  const max = (await getSettings()).checkout.maxQuantityPerLine;
  await db.transaction(async (tx) => {
    let [userCart] = await tx.select().from(s.carts).where(and(eq(s.carts.userId, userId), eq(s.carts.status, "active"))).orderBy(desc(s.carts.updatedAt)).limit(1);
    if (!userCart) {
      await tx.update(s.carts).set({ userId, tokenHash: null }).where(eq(s.carts.id, guest.id));
      return;
    }
    const items = await tx.select().from(s.cartItems).where(eq(s.cartItems.cartId, guest.id));
    for (const it of items) {
      const [inv] = await tx.select().from(s.inventory).where(eq(s.inventory.variantId, it.variantId));
      const available = Math.max(0, (inv?.onHand ?? 0) - (inv?.reserved ?? 0));
      const [existing] = await tx.select().from(s.cartItems).where(and(eq(s.cartItems.cartId, userCart.id), eq(s.cartItems.variantId, it.variantId)));
      const q = Math.min(max, available, (existing?.quantity ?? 0) + it.quantity);
      if (q < 1) continue;
      await tx.insert(s.cartItems).values({ id: newId("cit"), cartId: userCart.id, variantId: it.variantId, quantity: q }).onDuplicateKeyUpdate({ set: { quantity: q } });
    }
    if (!userCart.couponCode && guest.couponCode) await tx.update(s.carts).set({ couponCode: guest.couponCode }).where(eq(s.carts.id, userCart.id));
    await tx.update(s.carts).set({ status: "merged", tokenHash: null }).where(eq(s.carts.id, guest.id));
    userCart = { ...userCart };
  });
}

/* ───────────────────────────── Priced view ───────────────────────────── */

export interface CartLineView {
  variantId: string; productId: string; slug: string; name: string; colour: string; size: string; sku: string; image?: ProductImage;
  unitPrice: number; compareAtPrice: number | null; quantity: number; lineTotal: number; available: number;
  issue: null | "unavailable" | "out_of_stock" | "insufficient";
  /** Other sizes/colours of the same product, for "change size". */
  options: { variantId: string; colour: string; size: string; available: number }[];
  categoryId: string;
}

export interface CartView {
  id: string | null;
  marketId: string;
  currency: CurrencyCode;
  lines: CartLineView[];
  count: number;
  coupon: null | { code: string; applied: boolean; message: string; freeShipping: boolean };
  totals: Totals;
  shippingEstimate: { label: string; amount: number; freeOver: number | null } | null;
  taxLabel: string | null;
  hasIssues: boolean;
}

export async function priceCartItems(items: { variantId: string; quantity: number }[], currency: CurrencyCode, exec: Executor = db): Promise<CartLineView[]> {
  if (!items.length) return [];
  const variants = await exec.select({ id: s.productVariants.id, productId: s.productVariants.productId }).from(s.productVariants).where(inArray(s.productVariants.id, items.map((i) => i.variantId)));
  const visible = await exec.select({ id: s.products.id }).from(s.products).where(and(inArray(s.products.id, [...new Set(variants.map((v) => v.productId))].concat("__none__")), visibleProduct()));
  const visibleIds = new Set(visible.map((v) => v.id));
  const products = await loadProducts([...visibleIds], exec);
  return items.flatMap((it) => {
    const pid = variants.find((v) => v.id === it.variantId)?.productId;
    const p = products.find((x) => x.id === pid);
    const v = p?.variants.find((x) => x.id === it.variantId);
    if (!p || !v) return [];
    const colour = p.colours.find((c) => c.id === v.colourId);
    const unit = (v.prices ?? p.prices)[currency];
    const compare = p.compareAtPrices?.[currency] && p.compareAtPrices[currency] > unit ? p.compareAtPrices[currency] : null;
    const issue: CartLineView["issue"] = v.stock <= 0 ? "out_of_stock" : v.stock < it.quantity ? "insufficient" : null;
    return [{
      variantId: v.id, productId: p.id, slug: p.slug, name: p.name, colour: colour?.name ?? "", size: v.size, sku: v.sku, image: colour?.images[0],
      unitPrice: unit, compareAtPrice: compare, quantity: it.quantity, lineTotal: unit * it.quantity, available: v.stock, issue, categoryId: p.categoryId,
      options: p.variants.map((o) => ({ variantId: o.id, colour: p.colours.find((c) => c.id === o.colourId)?.name ?? "", size: o.size, available: o.stock })),
    }];
  });
}

export async function getCartView(opts: { couponOverride?: string } = {}): Promise<CartView> {
  const cfg = await loadCommerce();
  const marketId = await currentMarketId(cfg);
  const market = cfg.markets.find((m) => m.id === marketId) ?? cfg.markets[0];
  const currency = market.currency as CurrencyCode;
  const cart = await findCart();
  const items = cart ? await db.select().from(s.cartItems).where(eq(s.cartItems.cartId, cart.id)) : [];
  const lines = await priceCartItems(items, currency);
  const priced: PricedLine[] = lines.map((l) => ({ key: l.variantId, productId: l.productId, categoryId: l.categoryId, unitPrice: l.unitPrice, quantity: l.quantity }));
  const customer = await getCustomer();

  const code = opts.couponOverride ?? cart?.couponCode ?? null;
  let coupon: CartView["coupon"] = null;
  let outcome: CouponOutcome | null = null;
  if (code && lines.length) {
    const r = await checkCoupon({ code, currency, marketId, lines: priced, userId: customer?.id, email: customer?.email ?? cart?.email, format: (n) => formatMoney(n, currency) });
    outcome = r.outcome;
    coupon = { code: r.coupon?.code ?? code.toUpperCase(), applied: r.outcome.ok, message: r.outcome.ok ? (r.coupon?.description || "Code applied") : r.outcome.reason, freeShipping: r.outcome.ok && r.outcome.freeShipping };
  }
  const methods = methodsFor(cfg, market.defaultCountry).filter((m) => m.marketId === market.id);
  const cheapest = [...methods].sort((a, b) => a.rate - b.rate)[0];
  const tax = taxFor(cfg, market.defaultCountry);
  const totals = computeTotals({ lines: priced, shipping: cheapest ? { rate: cheapest.rate, freeOver: cheapest.freeOver } : null, tax: tax ? { rateBps: Math.round(tax.rate * 10_000), inclusive: tax.inclusive, label: tax.label } : null, coupon: outcome });
  return {
    id: cart?.id ?? null, marketId: market.id, currency, lines, count: lines.reduce((a, l) => a + l.quantity, 0), coupon, totals,
    shippingEstimate: cheapest ? { label: cheapest.label, amount: totals.shipping, freeOver: cheapest.freeOver } : null,
    taxLabel: tax?.label ?? null, hasIssues: lines.some((l) => l.issue),
  };
}

export async function cartRowForCheckout() {
  return findCart();
}
