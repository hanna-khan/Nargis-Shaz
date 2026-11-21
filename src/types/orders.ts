import type { Address, CountryCode, CurrencyCode } from "./commerce";

export type PaymentKind = "cod" | "online";

/** Status values are only ever changed by the server (webhooks / staff actions). */
export type PaymentStatus =
  | "pending" // awaiting provider confirmation
  | "awaiting_cod" // cash to be collected on delivery
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type FulfilmentStatus = "unfulfilled" | "processing" | "shipped" | "delivered" | "returned" | "cancelled";

export interface OrderLine {
  productId: string;
  variantId: string;
  name: string;
  colour: string;
  size: string;
  quantity: number;
  unitPrice: number; // minor units in order currency
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number; // tax added on top (0 when prices are inclusive)
  taxIncluded: number; // tax already contained in prices, for display/accounting
  total: number;
}

export interface Order {
  id: string;
  number: string; // NS-10421
  createdAt: string;
  customerId: string | null;
  email: string;
  marketId: string;
  currency: CurrencyCode;
  countryCode: CountryCode;
  shippingAddress: Address;
  shippingMethodId: string;
  paymentMethodId: string;
  paymentKind: PaymentKind;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  lines: OrderLine[];
  totals: OrderTotals;
  discountCode?: string;
  notes?: string;
  timeline: { at: string; message: string; actor: string }[];
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: CountryCode;
  city: string;
  createdAt: string;
  orderCount: number;
  totalSpent: { amount: number; currency: CurrencyCode };
  marketingConsent: boolean;
  tags: string[];
}

export type DiscountType = "percentage" | "fixed" | "free_shipping";

export interface Discount {
  id: string;
  code: string;
  description: string;
  type: DiscountType;
  /** percentage: 0-100. fixed: minor units per currency. */
  value: number | Partial<Record<CurrencyCode, number>>;
  marketIds: string[] | "all";
  minimumSubtotal?: Partial<Record<CurrencyCode, number>>;
  usageCount: number;
  usageLimit: number | null;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
}

/** Line submitted by the browser. Only ids + quantity are trusted; prices are recomputed server-side. */
export interface CartLineInput {
  productId: string;
  variantId: string;
  quantity: number;
}
