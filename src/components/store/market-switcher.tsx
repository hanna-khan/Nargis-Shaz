"use client";

import { cn } from "@/lib/utils";
import { useShop } from "./shop-context";

const SHORT: Record<string, string> = { pk: "PK", gb: "UK", eu: "EU", us: "US", intl: "World" };

/** Region / currency selector. Changing market re-prices the whole storefront. */
export function MarketSwitcher({ compact, tone = "dark" }: { compact?: boolean; tone?: "light" | "dark" }) {
  const { config, market, setMarket } = useShop();
  return (
    <label className={cn("relative flex items-center", compact ? "text-[10.5px] tracking-[0.18em] uppercase" : "w-full")}>
      <span className={compact ? "sr-only" : "mr-3 shrink-0 text-[10.5px] tracking-[0.2em] uppercase"}>{compact ? "Shipping region and currency" : "Ship to"}</span>
      <select
        value={market.id}
        onChange={(e) => setMarket(e.target.value)}
        className={cn(
          "cursor-pointer appearance-none bg-transparent outline-none",
          compact ? "py-1 pr-0" : "w-full border border-line bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M1 1l4 4 4-4%22 fill=%22none%22 stroke=%22%239E7B56%22/></svg>')] bg-[position:right_12px_center] bg-no-repeat px-3.5 py-2.5 pr-8 text-[13.5px]",
          tone === "light" && "[&>option]:text-chocolate",
        )}
      >
        {config.markets.map((m) => (
          <option key={m.id} value={m.id}>{compact ? `${SHORT[m.id] ?? m.id.toUpperCase()} · ${m.currency}` : `${m.name} — ${m.currency}`}</option>
        ))}
      </select>
    </label>
  );
}
