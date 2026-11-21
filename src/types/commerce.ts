/**
 * Commerce primitives: currencies, money, markets (countries), shipping and tax.
 * All monetary amounts are integers in MINOR units (paisa, cents, pence).
 */

export const CURRENCIES = ["PKR", "USD", "GBP", "EUR"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export interface Money {
  amount: number; // minor units
  currency: CurrencyCode;
}

/** A price expressed explicitly in every supported currency (minor units). */
export type PriceSet = Record<CurrencyCode, number>;

export interface CurrencyDefinition {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  /** Number of minor-unit digits (PKR is displayed without decimals). */
  displayFractionDigits: number;
}

export type CountryCode = string; // ISO 3166-1 alpha-2

export interface Country {
  code: CountryCode;
  name: string;
  marketId: string;
  /** Address form shape differs per country. */
  addressFormat: "pk" | "gb" | "us" | "eu" | "intl";
  phonePrefix: string;
}

export type ShippingZone = "domestic" | "international";

export interface ShippingMethod {
  id: string;
  marketId: string;
  label: string;
  description: string;
  zone: ShippingZone;
  /** Flat rate in the market currency (minor units). */
  rate: number;
  /** Subtotal (minor units, market currency) at which this method becomes free; null = never. */
  freeOver: number | null;
  estimatedDays: [number, number];
  active: boolean;
}

export interface TaxRule {
  id: string;
  countryCode: CountryCode | "*";
  label: string; // "GST", "VAT", "Sales tax"
  rate: number; // 0.2 = 20%
  /** true = catalogue prices already include this tax (shown as "incl."). */
  inclusive: boolean;
  /** Duties & import taxes collected by the carrier rather than at checkout. */
  dutiesCollectedOnDelivery?: boolean;
}

export interface Market {
  id: string;
  name: string; // "Pakistan", "United Kingdom", "Europe", "International"
  currency: CurrencyCode;
  countries: CountryCode[];
  defaultCountry: CountryCode;
  zone: ShippingZone;
  /** Payment method ids enabled for this market (see payments). */
  paymentMethodIds: string[];
  active: boolean;
}

export interface Address {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string; // province / state / county
  postalCode?: string;
  countryCode: CountryCode;
  phone: string;
}
