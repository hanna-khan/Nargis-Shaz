import { asc, eq } from "drizzle-orm";
import { db, type Executor } from "../db";
import * as s from "../db/schema";
import { provider } from "../payments/providers";
import type { Country, CurrencyCode, Market, ShippingMethod, TaxRule } from "@/types";

export interface PaymentMethodView { id: string; provider: string; kind: "cod" | "online"; label: string; description: string; marketIds: string[]; limits: Record<string, number>; mode: "test" | "live" }

export interface CommerceData {
  markets: Market[];
  countries: Country[];
  shipping: (ShippingMethod & { zoneId: string; countries: string[]; cities: string[]; codAvailable: boolean; carrier: string; trackingUrlTemplate: string | null })[];
  taxRules: TaxRule[];
  /** Only methods that are enabled AND whose provider credentials are configured. */
  paymentMethods: PaymentMethodView[];
}

export async function loadCommerce(exec: Executor = db): Promise<CommerceData> {
  const [markets, countries, zones, methods, taxes, pms] = await Promise.all([
    exec.select().from(s.markets).where(eq(s.markets.active, true)).orderBy(asc(s.markets.sortOrder)),
    exec.select().from(s.countries).where(eq(s.countries.active, true)).orderBy(asc(s.countries.name)),
    exec.select().from(s.shippingZones).where(eq(s.shippingZones.active, true)).orderBy(asc(s.shippingZones.sortOrder)),
    exec.select().from(s.shippingMethods).where(eq(s.shippingMethods.active, true)).orderBy(asc(s.shippingMethods.sortOrder)),
    exec.select().from(s.taxSettings).where(eq(s.taxSettings.active, true)),
    exec.select().from(s.paymentMethods).where(eq(s.paymentMethods.enabled, true)).orderBy(asc(s.paymentMethods.sortOrder)),
  ]);
  const available = pms.filter((m) => provider(m.provider)?.isConfigured());
  return {
    markets: markets.map((m) => ({
      id: m.id, name: m.name, currency: m.currency as CurrencyCode, defaultCountry: m.defaultCountry, zone: m.zone, active: m.active,
      countries: countries.filter((c) => c.marketId === m.id).map((c) => c.code),
      paymentMethodIds: available.filter((p) => p.marketIds.includes(m.id)).map((p) => p.id),
    })),
    countries: countries.map((c) => ({ code: c.code, name: c.name, marketId: c.marketId, addressFormat: c.addressFormat, phonePrefix: c.phonePrefix })),
    shipping: methods.flatMap((m) => {
      const z = zones.find((x) => x.id === m.zoneId);
      if (!z) return [];
      return [{
        id: m.id, zoneId: z.id, marketId: z.marketId, label: m.label, description: m.description, zone: (markets.find((x) => x.id === z.marketId)?.zone ?? "international") as "domestic" | "international",
        rate: m.rate, freeOver: m.freeOver, estimatedDays: [m.minDays, m.maxDays] as [number, number], active: m.active,
        countries: z.countries, cities: m.cities.length ? m.cities : z.cities, codAvailable: m.codAvailable, carrier: m.carrier, trackingUrlTemplate: m.trackingUrlTemplate,
      }];
    }),
    taxRules: taxes.map((t) => ({ id: t.id, countryCode: t.countryCode, label: t.label, rate: t.rateBps / 10_000, inclusive: t.inclusive, dutiesCollectedOnDelivery: t.dutiesOnDelivery })),
    paymentMethods: available.map((p) => ({ id: p.id, provider: p.provider, kind: p.kind, label: p.label, description: p.description, marketIds: p.marketIds, limits: p.limits, mode: p.mode })),
  };
}

/** Shipping methods that can deliver to this country/city. */
export function methodsFor(data: CommerceData, countryCode: string, city?: string) {
  const c = city?.trim().toLowerCase();
  return data.shipping.filter((m) => m.countries.includes(countryCode) && (!m.cities.length || (c && m.cities.some((x) => x.toLowerCase() === c))));
}

export function taxFor(data: CommerceData, countryCode: string) {
  return data.taxRules.find((t) => t.countryCode === countryCode) ?? data.taxRules.find((t) => t.countryCode === "*") ?? null;
}

export function marketForCountry(data: CommerceData, countryCode: string) {
  const c = data.countries.find((x) => x.code === countryCode);
  return c ? data.markets.find((m) => m.id === c.marketId) ?? null : null;
}
