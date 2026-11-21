import type { Country, CurrencyDefinition, Market, ShippingMethod, TaxRule } from "@/types";

export const currencyData: CurrencyDefinition[] = [
  { code: "PKR", symbol: "Rs", locale: "en-PK", displayFractionDigits: 0 },
  { code: "USD", symbol: "$", locale: "en-US", displayFractionDigits: 0 },
  { code: "GBP", symbol: "£", locale: "en-GB", displayFractionDigits: 0 },
  { code: "EUR", symbol: "€", locale: "en-IE", displayFractionDigits: 0 },
];

export const marketData: Market[] = [
  { id: "pk", name: "Pakistan", currency: "PKR", countries: ["PK"], defaultCountry: "PK", zone: "domestic", paymentMethodIds: ["cod", "card", "wallet", "bank-transfer"], active: true },
  { id: "gb", name: "United Kingdom", currency: "GBP", countries: ["GB"], defaultCountry: "GB", zone: "international", paymentMethodIds: ["card", "paypal"], active: true },
  { id: "eu", name: "Europe", currency: "EUR", countries: ["DE", "FR", "IE", "IT", "NL", "ES", "BE"], defaultCountry: "DE", zone: "international", paymentMethodIds: ["card", "paypal"], active: true },
  { id: "us", name: "United States", currency: "USD", countries: ["US"], defaultCountry: "US", zone: "international", paymentMethodIds: ["card", "paypal"], active: true },
  { id: "intl", name: "Rest of world", currency: "USD", countries: ["AE", "SA", "QA", "CA", "AU", "SG", "MY", "NO", "CH"], defaultCountry: "AE", zone: "international", paymentMethodIds: ["card"], active: true },
];

const c = (code: string, name: string, marketId: string, addressFormat: Country["addressFormat"], phonePrefix: string): Country => ({ code, name, marketId, addressFormat, phonePrefix });

export const countryData: Country[] = [
  c("PK", "Pakistan", "pk", "pk", "+92"),
  c("GB", "United Kingdom", "gb", "gb", "+44"),
  c("DE", "Germany", "eu", "eu", "+49"),
  c("FR", "France", "eu", "eu", "+33"),
  c("IE", "Ireland", "eu", "eu", "+353"),
  c("IT", "Italy", "eu", "eu", "+39"),
  c("NL", "Netherlands", "eu", "eu", "+31"),
  c("ES", "Spain", "eu", "eu", "+34"),
  c("BE", "Belgium", "eu", "eu", "+32"),
  c("US", "United States", "us", "us", "+1"),
  c("AE", "United Arab Emirates", "intl", "intl", "+971"),
  c("SA", "Saudi Arabia", "intl", "intl", "+966"),
  c("QA", "Qatar", "intl", "intl", "+974"),
  c("CA", "Canada", "intl", "us", "+1"),
  c("AU", "Australia", "intl", "intl", "+61"),
  c("SG", "Singapore", "intl", "intl", "+65"),
  c("MY", "Malaysia", "intl", "intl", "+60"),
  c("NO", "Norway", "intl", "eu", "+47"),
  c("CH", "Switzerland", "intl", "eu", "+41"),
];

export const shippingData: ShippingMethod[] = [
  { id: "pk-standard", marketId: "pk", label: "Standard delivery", description: "Nationwide courier, tracked", zone: "domestic", rate: 250_00, freeOver: 10_000_00, estimatedDays: [2, 4], active: true },
  { id: "pk-express", marketId: "pk", label: "Express delivery", description: "Karachi, Lahore & Islamabad", zone: "domestic", rate: 600_00, freeOver: null, estimatedDays: [1, 2], active: true },
  { id: "gb-tracked", marketId: "gb", label: "International tracked", description: "Duties & taxes paid", zone: "international", rate: 12_00, freeOver: 250_00, estimatedDays: [5, 8], active: true },
  { id: "gb-express", marketId: "gb", label: "International express", description: "Duties & taxes paid", zone: "international", rate: 25_00, freeOver: null, estimatedDays: [3, 4], active: true },
  { id: "eu-tracked", marketId: "eu", label: "International tracked", description: "Duties & taxes paid", zone: "international", rate: 14_00, freeOver: 290_00, estimatedDays: [5, 9], active: true },
  { id: "eu-express", marketId: "eu", label: "International express", description: "Duties & taxes paid", zone: "international", rate: 28_00, freeOver: null, estimatedDays: [3, 5], active: true },
  { id: "us-tracked", marketId: "us", label: "International tracked", description: "Import duties may apply", zone: "international", rate: 15_00, freeOver: 300_00, estimatedDays: [6, 10], active: true },
  { id: "us-express", marketId: "us", label: "International express", description: "Import duties may apply", zone: "international", rate: 32_00, freeOver: null, estimatedDays: [3, 5], active: true },
  { id: "intl-tracked", marketId: "intl", label: "International tracked", description: "Import duties may apply", zone: "international", rate: 25_00, freeOver: 350_00, estimatedDays: [6, 12], active: true },
  { id: "intl-express", marketId: "intl", label: "International express", description: "Import duties may apply", zone: "international", rate: 45_00, freeOver: null, estimatedDays: [3, 6], active: true },
];

export const taxData: TaxRule[] = [
  { id: "pk-gst", countryCode: "PK", label: "GST", rate: 0.18, inclusive: true },
  { id: "gb-vat", countryCode: "GB", label: "VAT", rate: 0.2, inclusive: true },
  { id: "de-vat", countryCode: "DE", label: "VAT", rate: 0.19, inclusive: true },
  { id: "fr-vat", countryCode: "FR", label: "VAT", rate: 0.2, inclusive: true },
  { id: "ie-vat", countryCode: "IE", label: "VAT", rate: 0.23, inclusive: true },
  { id: "it-vat", countryCode: "IT", label: "VAT", rate: 0.22, inclusive: true },
  { id: "nl-vat", countryCode: "NL", label: "VAT", rate: 0.21, inclusive: true },
  { id: "es-vat", countryCode: "ES", label: "VAT", rate: 0.21, inclusive: true },
  { id: "be-vat", countryCode: "BE", label: "VAT", rate: 0.21, inclusive: true },
  { id: "us-duties", countryCode: "US", label: "Duties", rate: 0, inclusive: false, dutiesCollectedOnDelivery: true },
  { id: "row-duties", countryCode: "*", label: "Duties", rate: 0, inclusive: false, dutiesCollectedOnDelivery: true },
];
