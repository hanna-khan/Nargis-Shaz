import type { Market, StoreSettings } from "@/types";
import type { PaymentMethodDescriptor } from "./types";

/**
 * Provider-independent catalogue of payment METHODS shown at checkout.
 * Which concrete gateway fulfils "card" in a market is decided by server config, not the UI.
 */
export const PAYMENT_METHODS: Record<string, PaymentMethodDescriptor> = {
  cod: { id: "cod", kind: "cod", label: "Cash on delivery", description: "Pay the courier in cash when your order arrives.", currencies: ["PKR"] },
  card: { id: "card", kind: "online", label: "Debit or credit card", description: "Visa, Mastercard, UnionPay. Secure payment page.", currencies: ["PKR", "USD", "GBP", "EUR"] },
  wallet: { id: "wallet", kind: "online", label: "Mobile wallet", description: "Pay from your mobile wallet account.", currencies: ["PKR"] },
  "bank-transfer": { id: "bank-transfer", kind: "online", label: "Bank transfer", description: "We'll email transfer details.", currencies: ["PKR"] },
  paypal: { id: "paypal", kind: "online", label: "PayPal", description: "You'll be redirected to PayPal.", currencies: ["USD", "GBP", "EUR"] },
};

/** Methods available for a market = enabled in settings ∩ enabled for market ∩ supports currency. */
export function methodsForMarket(market: Market, settings: Pick<StoreSettings, "payments">): PaymentMethodDescriptor[] {
  return market.paymentMethodIds
    .map((id) => {
      const cfg = settings.payments.find((p) => p.id === id);
      const m = PAYMENT_METHODS[id];
      if (!m || !cfg?.enabled || !cfg.marketIds.includes(market.id) || !m.currencies.includes(market.currency)) return null;
      return m;
    })
    .filter((m): m is PaymentMethodDescriptor => !!m);
}
