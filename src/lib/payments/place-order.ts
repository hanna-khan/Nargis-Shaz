"use server";

import { catalog, commerce, operations } from "@/lib/repositories";
import { computeTotals, findTaxRule } from "@/lib/commerce/totals";
import { methodsForMarket } from "./registry";
import type { Address, CartLineInput, Order } from "@/types";

export interface PlaceOrderInput {
  email: string;
  marketId: string;
  address: Address;
  shippingMethodId: string;
  paymentMethodId: string;
  discountCode?: string;
  lines: CartLineInput[];
}

export type PlaceOrderResult =
  | { ok: true; order: Pick<Order, "number" | "currency" | "totals" | "paymentKind" | "paymentStatus" | "email">; next: "confirmation" | "redirect" }
  | { ok: false; error: string };

/**
 * Server-side order creation. The browser only submits ids and quantities;
 * prices, availability, shipping, tax and discounts are recomputed here.
 *
 * Phase 1: validates and returns a provisional order (nothing persisted, no gateway call).
 * Phase 2: insert into `orders` (Supabase, service role), then for online methods call the
 * provider adapter's createSession() and redirect. Payment status becomes "paid" ONLY via
 * a verified provider webhook — never from a client success callback.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!input.lines.length) return { ok: false, error: "Your bag is empty." };
  if (!/^\S+@\S+\.\S+$/.test(input.email)) return { ok: false, error: "Please enter a valid email address." };

  const [markets, countries, shipping, taxRules, settings, discounts] = await Promise.all([
    commerce.listMarkets(), commerce.listCountries(), commerce.listShippingMethods(input.marketId),
    commerce.listTaxRules(), operations.getSettings(), operations.listDiscounts(),
  ]);
  const market = markets.find((m) => m.id === input.marketId);
  if (!market) return { ok: false, error: "We don't currently ship to this region." };
  const country = countries.find((c) => c.code === input.address.countryCode);
  if (!country || country.marketId !== market.id) return { ok: false, error: "Please choose a country in your selected region." };

  const method = shipping.find((s) => s.id === input.shippingMethodId);
  if (!method) return { ok: false, error: "Please choose a delivery method." };
  const payment = methodsForMarket(market, settings).find((p) => p.id === input.paymentMethodId);
  if (!payment) return { ok: false, error: "This payment method isn't available for your region." };

  const products = await catalog.getProductsByIds(input.lines.map((l) => l.productId));
  const priced = [];
  for (const l of input.lines) {
    const p = products.find((x) => x.id === l.productId);
    const v = p?.variants.find((x) => x.id === l.variantId);
    if (!p || !v || p.status !== "active") return { ok: false, error: "An item in your bag is no longer available." };
    const qty = Math.max(1, Math.min(10, Math.floor(l.quantity)));
    if (v.stock < qty) return { ok: false, error: `${p.name} (${v.size}) has only ${v.stock} left.` };
    priced.push({ unitPrice: (v.prices ?? p.prices)[market.currency], quantity: qty });
  }

  const discount = input.discountCode
    ? discounts.find((d) => d.code.toUpperCase() === input.discountCode!.trim().toUpperCase() && d.active && (d.marketIds === "all" || d.marketIds.includes(market.id)))
    : undefined;

  const totals = computeTotals({ lines: priced, currency: market.currency, shippingMethod: method, taxRule: findTaxRule(taxRules, country.code), discount });

  const number = `${settings.orderNumberPrefix}${10433 + (input.email.length % 50)}`;
  return {
    ok: true,
    order: { number, currency: market.currency, totals, email: input.email, paymentKind: payment.kind, paymentStatus: payment.kind === "cod" ? "awaiting_cod" : "pending" },
    next: payment.kind === "cod" ? "confirmation" : "redirect",
  };
}

/** Server-side discount lookup so codes and rules are never shipped to the browser. */
export async function validateDiscount(code: string, marketId: string) {
  const d = (await operations.listDiscounts()).find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
  if (!d || !d.active || (d.marketIds !== "all" && !d.marketIds.includes(marketId))) return null;
  return d;
}
