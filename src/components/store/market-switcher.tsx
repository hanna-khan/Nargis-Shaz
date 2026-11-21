"use client";

import { cn } from "@/lib/utils";
import { useShop } from "./shop-context";

/** Region / currency selector. Changing market re-prices the whole storefront client-side. */
export function MarketSwitcher({ compact, tone = "dark" }: { compact?: boolean; tone?: "light" | "dark" }) {
  const { config, market, setMarket } = useShop();
  return (
    <label className={cn("relative inline-flex items-center", compact ? "text-[11px] tracking-[0.18em] uppercase" : "w-full")}>
      <span className="sr-only">Shipping region and currency</span>
      {!compact && <span className="mr-3 text-[10.5px] tracking-[0.2em] uppercase">Ship to</span>}
      <select
        value={market.id}
        onChange={(e) => setMarket(e.target.value)}
        className={cn(
          "cursor-pointer appearance-none bg-transparent outline-none",
          compact ? "pr-1" : "flex-1 border border-line px-4 py-3 text-[14px]",
          tone === "light" && compact && "text-ivory [&>option]:text-charcoal",
        )}
      >
        {config.markets.map((m) => (
          <option key={m.id} value={m.id}>{compact ? `${m.id === "intl" ? "World" : m.name.split(" ")[0] === "United" ? m.id.toUpperCase() : m.name} · ${m.currency}` : `${m.name} — ${m.currency}`}</option>
        ))}
      </select>
    </label>
  );
}
