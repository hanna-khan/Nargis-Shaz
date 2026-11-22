"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatMoney } from "@/lib/commerce/currency";
import type { CartLineView, CartView } from "@/server/commerce/cart";
import type { Country, CurrencyCode, Market, PriceSet, ProductImage, ShippingMethod, TaxRule } from "@/types";

export type { CartLineView, CartView };

export interface WishItem {
  productId: string;
  slug: string;
  name: string;
  subtitle: string;
  image?: ProductImage;
  prices: PriceSet;
  sizes?: { variantId: string; size: string; stock: number }[];
}

export interface PaymentMethodDescriptor { id: string; kind: "cod" | "online"; label: string; description: string }

export interface CommerceConfig {
  markets: Market[];
  countries: Country[];
  shipping: (ShippingMethod & { countries: string[]; cities: string[]; codAvailable: boolean })[];
  taxRules: TaxRule[];
  paymentMethods: Record<string, PaymentMethodDescriptor[]>; // by market id
  defaultMarketId: string;
}

export interface CustomerSummary { firstName: string; lastName: string; email: string; emailVerified: boolean }

type Result = { ok: true } | { ok: false; error: string };

interface ShopState {
  config: CommerceConfig;
  market: Market;
  currency: CurrencyCode;
  setMarket: (id: string) => Promise<void>;
  format: (amount: number) => string;
  price: (set: PriceSet) => string;
  cartView: CartView | null;
  cart: CartLineView[];
  cartCount: number;
  subtotal: number;
  addToCart: (variantId: string, qty?: number) => Promise<Result>;
  updateQuantity: (variantId: string, qty: number) => Promise<Result>;
  removeFromCart: (variantId: string) => Promise<Result>;
  changeVariant: (fromVariantId: string, toVariantId: string) => Promise<Result>;
  applyCoupon: (code: string | null) => Promise<Result>;
  busy: boolean;
  wishlist: WishItem[];
  toggleWish: (item: WishItem) => void;
  isWished: (productId: string) => boolean;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  lastAdded: string | null;
  recentlyViewed: WishItem[];
  trackView: (item: WishItem) => void;
  customer: CustomerSummary | null;
  refresh: () => Promise<void>;
  hydrated: boolean;
}

const Ctx = createContext<ShopState | null>(null);
const RECENT_KEY = "ns.recent.v2";

async function api<T>(path: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(path, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: json?.error?.message ?? "Something went wrong. Please try again." };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "You appear to be offline. Please check your connection." };
  }
}

/**
 * Shop state backed by the server: the cart and wishlist live in MySQL (guest cookie or customer
 * account) and every amount shown is the server's price for the shopper's market.
 */
export function ShopProvider({ config, children }: { config: CommerceConfig; children: ReactNode }) {
  const [cartView, setCartView] = useState<CartView | null>(null);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [recentlyViewed, setRecent] = useState<WishItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const wishVersion = useRef(0);

  const refresh = async () => {
    const [c, w, me] = await Promise.all([api<CartView>("/api/cart"), api<{ items: WishItem[] }>("/api/wishlist"), api<{ customer: CustomerSummary | null }>("/api/me")]);
    if (c.ok) setCartView(c.data);
    if (w.ok) setWishlist(w.data.items);
    if (me.ok) setCustomer(me.data.customer);
  };

  useEffect(() => {
    let cancelled = false;
    // State is set only after the network responses resolve (not synchronously).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().finally(() => {
      if (cancelled) return;
      try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")); } catch { /* storage unavailable */ }
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  const market = config.markets.find((m) => m.id === (cartView?.marketId ?? config.defaultMarketId)) ?? config.markets[0];
  const currency = market.currency as CurrencyCode;

  const mutate = async (body: Record<string, unknown>): Promise<Result> => {
    setBusy(true);
    const r = await api<CartView>("/api/cart", body);
    setBusy(false);
    if (!r.ok) {
      const fresh = await api<CartView>("/api/cart");
      if (fresh.ok) setCartView(fresh.data);
      return { ok: false, error: r.error };
    }
    setCartView(r.data);
    return { ok: true };
  };

  const value = useMemo<ShopState>(() => ({
    config, market, currency,
    setMarket: async (id) => { await mutate({ action: "market", marketId: id }); },
    format: (a) => formatMoney(a, currency),
    price: (s) => formatMoney(s[currency], currency),
    cartView,
    cart: cartView?.lines ?? [],
    cartCount: cartView?.count ?? 0,
    subtotal: cartView?.totals.subtotal ?? 0,
    addToCart: async (variantId, qty = 1) => {
      const r = await mutate({ action: "add", variantId, quantity: qty });
      if (r.ok) setLastAdded(`${variantId}:${Date.now()}`);
      return r;
    },
    updateQuantity: (variantId, qty) => mutate({ action: "set", variantId, quantity: Math.max(0, Math.min(10, qty)) }),
    removeFromCart: (variantId) => mutate({ action: "remove", variantId }),
    changeVariant: (fromVariantId, toVariantId) => mutate({ action: "change", fromVariantId, toVariantId }),
    applyCoupon: (code) => mutate({ action: "coupon", code }),
    busy,
    wishlist,
    toggleWish: (item) => {
      const wished = !wishlist.some((w) => w.productId === item.productId);
      const v = ++wishVersion.current;
      setWishlist((w) => (wished ? [item, ...w] : w.filter((x) => x.productId !== item.productId)));
      api<{ items: WishItem[] }>("/api/wishlist", { productId: item.productId, wished }).then((r) => { if (r.ok && v === wishVersion.current) setWishlist(r.data.items); });
    },
    isWished: (id) => wishlist.some((w) => w.productId === id),
    cartOpen, setCartOpen, lastAdded, recentlyViewed,
    trackView: (item) => {
      setRecent((r) => {
        const next = [item, ...r.filter((x) => x.productId !== item.productId)].slice(0, 12);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      if (customer) void api("/api/recently-viewed", { productId: item.productId });
    },
    customer, refresh, hydrated,
  }), [config, market, currency, cartView, busy, wishlist, cartOpen, lastAdded, recentlyViewed, customer, hydrated]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShop must be used inside <ShopProvider>");
  return v;
}

/** Client price that follows the selected market currency. Server HTML shows PKR. */
export function Price({ prices, compareAt, className }: { prices: PriceSet; compareAt?: PriceSet; className?: string }) {
  const { price, currency } = useShop();
  return (
    <span className={className}>
      {compareAt && compareAt[currency] > prices[currency] && <s className="mr-2 text-taupe/80">{price(compareAt)}</s>}
      <span className={compareAt && compareAt[currency] > prices[currency] ? "text-bronze" : undefined}>{price(prices)}</span>
    </span>
  );
}
