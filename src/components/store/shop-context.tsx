"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatMoney } from "@/lib/commerce/currency";
import type { Country, CurrencyCode, Market, PriceSet, ProductImage, ShippingMethod, TaxRule } from "@/types";
import type { PaymentMethodDescriptor } from "@/lib/payments/types";

export interface CartLine {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  colour: string;
  size: string;
  image: ProductImage;
  prices: PriceSet; // display snapshot; server recomputes at checkout
  quantity: number;
}

export interface WishItem {
  productId: string;
  slug: string;
  name: string;
  subtitle: string;
  image: ProductImage;
  prices: PriceSet;
}

export interface CommerceConfig {
  markets: Market[];
  countries: Country[];
  shipping: ShippingMethod[];
  taxRules: TaxRule[];
  paymentMethods: Record<string, PaymentMethodDescriptor[]>; // by market id
  defaultMarketId: string;
}

interface ShopState {
  config: CommerceConfig;
  market: Market;
  currency: CurrencyCode;
  setMarket: (id: string) => void;
  format: (amount: number) => string;
  price: (set: PriceSet) => string;
  cart: CartLine[];
  cartCount: number;
  subtotal: number;
  addToCart: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  updateQuantity: (variantId: string, qty: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  wishlist: WishItem[];
  toggleWish: (item: WishItem) => void;
  isWished: (productId: string) => boolean;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  hydrated: boolean;
}

const Ctx = createContext<ShopState | null>(null);
const KEY = { cart: "ns.cart.v1", wish: "ns.wish.v1", market: "ns.market.v1" };

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable — keep in memory */
  }
}

export function ShopProvider({ config, children }: { config: CommerceConfig; children: ReactNode }) {
  const [marketId, setMarketId] = useState(config.defaultMarketId);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate persisted state after mount so server HTML stays deterministic.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCart(read(KEY.cart, []));
    setWishlist(read(KEY.wish, []));
    const saved = read<string | null>(KEY.market, null);
    if (saved && config.markets.some((m) => m.id === saved)) setMarketId(saved);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [config.markets]);

  useEffect(() => { if (hydrated) write(KEY.cart, cart); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) write(KEY.wish, wishlist); }, [wishlist, hydrated]);

  const market = config.markets.find((m) => m.id === marketId) ?? config.markets[0];
  const currency = market.currency;

  const setMarket = useCallback((id: string) => { setMarketId(id); write(KEY.market, id); }, []);
  const format = useCallback((a: number) => formatMoney(a, currency), [currency]);
  const price = useCallback((s: PriceSet) => formatMoney(s[currency], currency), [currency]);

  const addToCart = useCallback((line: Omit<CartLine, "quantity">, qty = 1) => {
    setCart((c) => {
      const f = c.find((l) => l.variantId === line.variantId);
      if (f) return c.map((l) => (l.variantId === line.variantId ? { ...l, quantity: Math.min(10, l.quantity + qty) } : l));
      return [...c, { ...line, quantity: qty }];
    });
  }, []);
  const updateQuantity = useCallback((variantId: string, qty: number) => {
    setCart((c) => (qty < 1 ? c.filter((l) => l.variantId !== variantId) : c.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(10, qty) } : l))));
  }, []);
  const removeFromCart = useCallback((variantId: string) => setCart((c) => c.filter((l) => l.variantId !== variantId)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const toggleWish = useCallback((item: WishItem) => {
    setWishlist((w) => (w.some((x) => x.productId === item.productId) ? w.filter((x) => x.productId !== item.productId) : [item, ...w]));
  }, []);
  const isWished = useCallback((id: string) => wishlist.some((w) => w.productId === id), [wishlist]);

  const value = useMemo<ShopState>(() => ({
    config, market, currency, setMarket, format, price,
    cart, cartCount: cart.reduce((a, l) => a + l.quantity, 0), subtotal: cart.reduce((a, l) => a + l.prices[currency] * l.quantity, 0),
    addToCart, updateQuantity, removeFromCart, clearCart, wishlist, toggleWish, isWished, cartOpen, setCartOpen, hydrated,
  }), [config, market, currency, setMarket, format, price, cart, addToCart, updateQuantity, removeFromCart, clearCart, wishlist, toggleWish, isWished, cartOpen, hydrated]);

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
      {compareAt && compareAt[currency] > prices[currency] && <s className="mr-2 text-charcoal/45">{price(compareAt)}</s>}
      {price(prices)}
    </span>
  );
}
