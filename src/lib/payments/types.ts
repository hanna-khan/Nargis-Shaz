import type { CurrencyCode, Order, PaymentKind } from "@/types";

/** Client-safe description of a payment method (no secrets). */
export interface PaymentMethodDescriptor {
  id: string;
  kind: PaymentKind;
  label: string;
  description: string;
  currencies: CurrencyCode[];
}

/**
 * Server-side provider adapter. Each gateway (local card acquirer, mobile wallets, PayPal, Stripe…)
 * implements this interface in `providers/`. Secrets are read from server env vars only.
 */
export interface PaymentProviderAdapter {
  id: string;
  kind: PaymentKind;
  /** Create a hosted payment session / redirect. Returns where to send the customer. */
  createSession(order: Order): Promise<{ redirectUrl?: string; clientToken?: string; reference: string }>;
  /** Verify a webhook/callback signature and return the TRUE status from the provider. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<{ orderId: string; status: "paid" | "failed" | "authorized" | "refunded" } | null>;
}
