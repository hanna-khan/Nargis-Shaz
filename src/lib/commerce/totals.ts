import type { CurrencyCode, Discount, OrderTotals, ShippingMethod, TaxRule } from "@/types";

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export function shippingCost(method: ShippingMethod | undefined, subtotal: number) {
  if (!method) return 0;
  if (method.freeOver !== null && subtotal >= method.freeOver) return 0;
  return method.rate;
}

export function findTaxRule(rules: TaxRule[], countryCode: string) {
  return rules.find((r) => r.countryCode === countryCode) ?? rules.find((r) => r.countryCode === "*");
}

export function discountAmount(d: Discount | undefined, subtotal: number, currency: CurrencyCode, shipping: number) {
  if (!d || !d.active) return { amount: 0, freeShipping: false };
  const min = d.minimumSubtotal?.[currency];
  if (min && subtotal < min) return { amount: 0, freeShipping: false };
  if (d.type === "percentage") return { amount: Math.round((subtotal * (d.value as number)) / 100), freeShipping: false };
  if (d.type === "fixed") return { amount: Math.min(subtotal, (d.value as Record<string, number>)[currency] ?? 0), freeShipping: false };
  return { amount: 0, freeShipping: shipping > 0 };
}

/**
 * Pure totals calculation. Used by the browser for display AND by the server action
 * for the authoritative amount (with prices re-read from the repository).
 */
export function computeTotals(args: {
  lines: PricedLine[];
  currency: CurrencyCode;
  shippingMethod?: ShippingMethod;
  taxRule?: TaxRule;
  discount?: Discount;
}): OrderTotals {
  const subtotal = args.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  let shipping = shippingCost(args.shippingMethod, subtotal);
  const d = discountAmount(args.discount, subtotal, args.currency, shipping);
  if (d.freeShipping) shipping = 0;
  const taxable = subtotal - d.amount;
  const rate = args.taxRule?.rate ?? 0;
  const inclusive = args.taxRule?.inclusive ?? true;
  const taxIncluded = inclusive ? Math.round(taxable - taxable / (1 + rate)) : 0;
  const tax = inclusive ? 0 : Math.round(taxable * rate);
  return { subtotal, shipping, discount: d.amount, tax, taxIncluded, total: taxable + shipping + tax };
}
