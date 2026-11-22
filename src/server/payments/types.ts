export interface CheckoutArgs {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  amount: number; // minor units
  currency: string;
  email: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface VerifiedPayment {
  status: "paid" | "failed" | "pending" | "refunded";
  amount: number | null; // minor units, when the provider reports it
  currency: string | null;
  providerPaymentId: string | null;
}

export interface WebhookEvent {
  eventId: string;
  type: string;
  /** Our payment's provider reference (tracker / session id). */
  providerReference: string | null;
  outcome: "paid" | "failed" | "refunded" | "ignored";
  raw: unknown;
}

/**
 * Gateway adapter. Secrets come from server environment variables only and never reach the browser.
 * A payment becomes "paid" ONLY after `parseWebhook` verified the signature AND `verifyPayment`
 * confirmed status and amount server-to-server.
 */
export interface PaymentProvider {
  id: "cod" | "safepay" | "stripe" | "test";
  kind: "cod" | "online";
  /** True when the required credentials are present in the environment. */
  isConfigured(): boolean;
  /** Human-readable list of missing settings for Studio → Payments. */
  missingConfig(): string[];
  mode(): "test" | "live";
  createCheckout?(args: CheckoutArgs): Promise<{ redirectUrl: string; providerReference: string }>;
  /** Returns null when the signature is invalid. */
  parseWebhook?(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
  verifyPayment?(providerReference: string): Promise<VerifiedPayment>;
  refund?(args: { providerReference: string; providerPaymentId: string | null; amount: number; currency: string; idempotencyKey: string }): Promise<{ ok: true; providerRefundId: string } | { ok: false; error: string }>;
}

/** Convert minor units to a major-unit decimal string for gateways that expect "1000.00". */
export const toMajor = (minor: number) => (minor / 100).toFixed(2);
export const fromMajor = (major: number | string) => Math.round(Number(major) * 100);
