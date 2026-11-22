import { hmacHex, isProduction, safeEqual, siteUrl } from "../lib/core";
import { fromMajor, toMajor, type PaymentProvider, type VerifiedPayment, type WebhookEvent } from "./types";

const env = (k: string) => process.env[k]?.trim() || "";
const missing = (keys: string[]) => keys.filter((k) => !env(k));

/* ───────────────────────────── Cash on delivery ───────────────────────────── */

export const cod: PaymentProvider = {
  id: "cod", kind: "cod",
  isConfigured: () => true,
  missingConfig: () => [],
  mode: () => "live",
};

/* ───────────────────────────── Safepay (Pakistan) ─────────────────────────────
 * Implemented from Safepay's public documentation (order/v1/init tracker → hosted checkout →
 * HMAC-SHA512 signed webhook, X-SFPY-SIGNATURE). NOT yet verified against a live sandbox account:
 * run the sandbox checklist in docs/DEPLOYMENT_GUIDE.md before enabling it for customers.
 */
const safepayBase = () => (env("SAFEPAY_ENV") === "production" ? "https://api.getsafepay.com" : "https://sandbox.api.getsafepay.com");
const safepayCheckoutBase = () => (env("SAFEPAY_ENV") === "production" ? "https://www.getsafepay.com/components" : "https://sandbox.api.getsafepay.com/components");

export const safepay: PaymentProvider = {
  id: "safepay", kind: "online",
  isConfigured: () => missing(["SAFEPAY_API_KEY", "SAFEPAY_SECRET_KEY", "SAFEPAY_WEBHOOK_SECRET"]).length === 0,
  missingConfig: () => missing(["SAFEPAY_ENV", "SAFEPAY_API_KEY", "SAFEPAY_SECRET_KEY", "SAFEPAY_WEBHOOK_SECRET"]),
  mode: () => (env("SAFEPAY_ENV") === "production" ? "live" : "test"),
  async createCheckout(a) {
    const res = await fetch(`${safepayBase()}/order/v1/init`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ client: env("SAFEPAY_API_KEY"), amount: Number(toMajor(a.amount)), currency: a.currency, environment: env("SAFEPAY_ENV") === "production" ? "production" : "sandbox" }),
    });
    const body = (await res.json().catch(() => null)) as { data?: { token?: string } } | null;
    const tracker = body?.data?.token;
    if (!res.ok || !tracker) throw new Error(`Safepay init failed (${res.status})`);
    const q = new URLSearchParams({
      env: env("SAFEPAY_ENV") === "production" ? "production" : "sandbox", beacon: tracker, source: "custom", order_id: a.orderNumber,
      redirect_url: a.returnUrl, cancel_url: a.cancelUrl, webhooks: "true",
    });
    return { redirectUrl: `${safepayCheckoutBase()}?${q}`, providerReference: tracker };
  },
  async parseWebhook(raw, headers) {
    const sig = headers.get("x-sfpy-signature");
    const expected = hmacHex("sha512", env("SAFEPAY_WEBHOOK_SECRET"), raw);
    if (!safeEqual(sig?.toLowerCase(), expected)) return null;
    const body = JSON.parse(raw) as { token?: string; id?: string; type?: string; data?: Record<string, unknown> };
    const data = (body.data ?? {}) as Record<string, unknown>;
    const type = String(body.type ?? data.type ?? "unknown");
    const tracker = String(data.tracker ?? data.token ?? (data.notification as Record<string, unknown> | undefined)?.tracker ?? "") || null;
    const outcome: WebhookEvent["outcome"] = /succeed|paid|completed/i.test(type) ? "paid" : /fail|declin|cancel/i.test(type) ? "failed" : /refund/i.test(type) ? "refunded" : "ignored";
    return { eventId: String(body.token ?? body.id ?? `${type}:${tracker}`), type, providerReference: tracker, outcome, raw: body };
  },
  async verifyPayment(tracker): Promise<VerifiedPayment> {
    // Server-to-server status lookup with the secret key (defence in depth on top of the webhook signature).
    const res = await fetch(`${safepayBase()}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`, {
      headers: { "X-SFPY-MERCHANT-SECRET": env("SAFEPAY_SECRET_KEY") }, signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { status: "pending", amount: null, currency: null, providerPaymentId: null };
    const body = (await res.json().catch(() => null)) as { data?: { state?: string; amount?: number; currency?: string; reference?: string; tracker?: { state?: string } } } | null;
    const state = String(body?.data?.state ?? body?.data?.tracker?.state ?? "").toUpperCase();
    return {
      status: ["PAID", "TRACKER_ENDED", "CAPTURED", "COMPLETED"].includes(state) ? "paid" : ["FAILED", "DECLINED", "CANCELLED"].includes(state) ? "failed" : "pending",
      amount: body?.data?.amount !== undefined ? fromMajor(body.data.amount) : null,
      currency: body?.data?.currency ?? null,
      providerPaymentId: body?.data?.reference ?? null,
    };
  },
};

/* ───────────────────────────── Stripe (UK-registered entity only) ─────────────────────────────
 * Stripe does not onboard Pakistan-registered merchants. This adapter is for a UK (or other supported
 * country) entity. Checkout Sessions + signed webhooks (Stripe-Signature, HMAC-SHA256, 5-minute tolerance).
 */
const stripeApi = async (path: string, init: { method?: string; form?: Record<string, string>; idempotencyKey?: string } = {}) => {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method ?? (init.form ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`, "Content-Type": "application/x-www-form-urlencoded",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.form ? new URLSearchParams(init.form) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${(body.error as { message?: string } | undefined)?.message ?? "error"}`);
  return body;
};

export const stripe: PaymentProvider = {
  id: "stripe", kind: "online",
  isConfigured: () => missing(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]).length === 0,
  missingConfig: () => missing(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]),
  mode: () => (env("STRIPE_SECRET_KEY").startsWith("sk_live_") ? "live" : "test"),
  async createCheckout(a) {
    const s = await stripeApi("checkout/sessions", {
      idempotencyKey: `checkout_${a.paymentId}`,
      form: {
        mode: "payment", customer_email: a.email, client_reference_id: a.orderId,
        success_url: `${a.returnUrl}${a.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`, cancel_url: a.cancelUrl,
        "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": a.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(a.amount), "line_items[0][price_data][product_data][name]": `Nargis & Shaz order ${a.orderNumber}`,
        "metadata[order_id]": a.orderId, "metadata[payment_id]": a.paymentId, "payment_intent_data[metadata][order_id]": a.orderId,
        expires_at: String(Math.floor(Date.now() / 1000) + 60 * 60),
      },
    });
    return { redirectUrl: String(s.url), providerReference: String(s.id) };
  },
  async parseWebhook(raw, headers) {
    const header = headers.get("stripe-signature") ?? "";
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
    const t = Number(parts.t);
    if (!t || Math.abs(Date.now() / 1000 - t) > 300) return null;
    const expected = hmacHex("sha256", env("STRIPE_WEBHOOK_SECRET"), `${t}.${raw}`);
    const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
    if (!sigs.some((v) => safeEqual(v, expected))) return null;
    const ev = JSON.parse(raw) as { id: string; type: string; data: { object: Record<string, unknown> } };
    const obj = ev.data.object;
    const ref = ev.type.startsWith("checkout.session") ? String(obj.id) : null;
    const outcome: WebhookEvent["outcome"] =
      ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded" ? (obj.payment_status === "paid" ? "paid" : "ignored")
      : ev.type === "checkout.session.async_payment_failed" || ev.type === "checkout.session.expired" ? "failed" : "ignored";
    return { eventId: ev.id, type: ev.type, providerReference: ref, outcome, raw: ev };
  },
  async verifyPayment(sessionId) {
    const s = await stripeApi(`checkout/sessions/${encodeURIComponent(sessionId)}`);
    return {
      status: s.payment_status === "paid" ? "paid" : s.status === "expired" ? "failed" : "pending",
      amount: typeof s.amount_total === "number" ? s.amount_total : null,
      currency: typeof s.currency === "string" ? s.currency.toUpperCase() : null,
      providerPaymentId: typeof s.payment_intent === "string" ? s.payment_intent : null,
    };
  },
  async refund(a) {
    if (!a.providerPaymentId) return { ok: false, error: "No Stripe payment intent recorded for this payment." };
    try {
      const r = await stripeApi("refunds", { idempotencyKey: a.idempotencyKey, form: { payment_intent: a.providerPaymentId, amount: String(a.amount) } });
      return { ok: true, providerRefundId: String(r.id) };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

/* ───────────────────────────── Test gateway (development & automated tests only) ─────────────────────────────
 * Lets the full online flow (redirect → signed webhook → verification) be exercised without real
 * credentials. Refuses to run when APP_ENV is production (the default for production builds).
 */
const testEnabled = () => !isProduction() && env("PAYMENTS_TEST_PROVIDER") === "1";
const testSecret = () => env("TEST_PAYMENTS_SECRET") || "dev-only-test-gateway-secret";

/** In-process ledger standing in for the gateway's own records (what verifyPayment asks). */
declare global { var __nsTestGateway: Map<string, VerifiedPayment & { orderNumber: string; expected: number }> | undefined }
const ledger = () => (globalThis.__nsTestGateway ??= new Map());

export const testGateway: PaymentProvider & {
  signWebhook(body: string): string;
  settle(ref: string, outcome: "paid" | "failed", amountOverride?: number): string;
} = {
  id: "test", kind: "online",
  isConfigured: testEnabled,
  missingConfig: () => (testEnabled() ? [] : ["PAYMENTS_TEST_PROVIDER=1 (non-production only)"]),
  mode: () => "test",
  async createCheckout(a) {
    if (!testEnabled()) throw new Error("Test gateway disabled");
    const ref = `tst_${a.paymentId}`;
    ledger().set(ref, { status: "pending", amount: null, currency: a.currency, providerPaymentId: null, orderNumber: a.orderNumber, expected: a.amount });
    return { redirectUrl: siteUrl(`/checkout/test-gateway?ref=${encodeURIComponent(ref)}&return=${encodeURIComponent(a.returnUrl)}&cancel=${encodeURIComponent(a.cancelUrl)}`), providerReference: ref };
  },
  signWebhook: (body) => hmacHex("sha256", testSecret(), body),
  /** Simulates the gateway completing a payment and returns the webhook body it would send. */
  settle(ref, outcome, amountOverride) {
    const entry = ledger().get(ref);
    if (!entry) throw new Error("Unknown test payment");
    entry.status = outcome;
    entry.amount = amountOverride ?? entry.expected;
    entry.providerPaymentId = `tstpay_${ref.slice(4, 14)}`;
    return JSON.stringify({ id: `evt_${ref}_${outcome}`, type: outcome === "paid" ? "payment.succeeded" : "payment.failed", reference: ref });
  },
  async parseWebhook(raw, headers) {
    if (!testEnabled()) return null;
    if (!safeEqual(headers.get("x-test-signature"), hmacHex("sha256", testSecret(), raw))) return null;
    const b = JSON.parse(raw) as { id: string; type: string; reference: string };
    return { eventId: b.id, type: b.type, providerReference: b.reference, outcome: b.type === "payment.succeeded" ? "paid" : "failed", raw: b };
  },
  async verifyPayment(ref) {
    const e = ledger().get(ref);
    return e ? { status: e.status, amount: e.amount, currency: e.currency, providerPaymentId: e.providerPaymentId } : { status: "pending", amount: null, currency: null, providerPaymentId: null };
  },
  async refund(a) {
    return { ok: true, providerRefundId: `tstref_${a.idempotencyKey.slice(-10)}` };
  },
};

export const PROVIDERS: Record<string, PaymentProvider> = { cod, safepay, stripe, test: testGateway };
export const provider = (id: string) => PROVIDERS[id] ?? null;
