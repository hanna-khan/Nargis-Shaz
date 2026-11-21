import type { CurrencyCode, PriceSet } from "@/types";

const LOCALES: Record<CurrencyCode, string> = { PKR: "en-PK", USD: "en-US", GBP: "en-GB", EUR: "en-IE" };
const cache = new Map<string, Intl.NumberFormat>();

/** The single place money is formatted. Amount is in minor units. */
export function formatMoney(amount: number, currency: CurrencyCode, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? (amount % 100 !== 0 && currency !== "PKR");
  const key = `${currency}-${decimals}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALES[currency], {
      style: "currency",
      currency,
      currencyDisplay: currency === "PKR" ? "code" : "narrowSymbol",
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    });
    cache.set(key, f);
  }
  // "PKR 18,500" → "Rs 18,500" (house style)
  return f.format(amount / 100).replace(/^PKR\s?/, "Rs ").replace(/ /g, " ");
}

export const priceIn = (set: PriceSet, currency: CurrencyCode) => set[currency];

/** Fallback conversion (only if an explicit price is missing). Rates are per 1 PKR. */
export function convertFromPKR(amountPKR: number, to: CurrencyCode, rates: Record<CurrencyCode, number>) {
  return Math.round(amountPKR * rates[to]);
}
