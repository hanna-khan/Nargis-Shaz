"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/commerce/currency";
import { cn } from "@/lib/utils";
import { Drawer } from "@/components/ui/drawer";
import { useShop } from "../shop-context";
import { ProductCard } from "./product-card";
import type { CardProduct } from "./card-data";
import type { CurrencyCode, SortKey } from "@/types";

export interface FacetOptions {
  categories: { id: string; name: string; count: number }[];
  colours: { name: string; hex: string; count: number }[];
  sizes: { size: string; count: number }[];
  prices: { id: string; min: number; max: number; count: number }[];
  inStock: number;
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "recommended", label: "Recommended" },
  { id: "newest", label: "Newest" },
  { id: "bestselling", label: "Bestselling" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
];

/**
 * Filter & sort UI. State lives in the URL; every change re-runs the MySQL query on the server
 * (results, counts and pagination come back from the server — nothing is filtered in the browser).
 */
export function CatalogBrowser({ items, total, page, pageSize, currency, facets, hideCategory, editorial }: { items: CardProduct[]; total: number; page: number; pageSize: number; currency: CurrencyCode; facets: FacetOptions; hideCategory?: boolean; editorial?: React.ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { format: fmtShop, currency: shopCurrency } = useShop();
  const [drawer, setDrawer] = useState(false);
  const [pending, start] = useTransition();
  const format = (n: number) => (shopCurrency === currency ? fmtShop(n) : formatMoney(n, currency));

  const list = (k: string) => params.get(k)?.split(",").filter(Boolean) ?? [];
  const sel = { category: list("category"), colour: list("colour"), size: list("size"), price: list("price") };
  const inStock = params.get("stock") === "1";
  const sort = (params.get("sort") as SortKey) || "featured";
  const dense = params.get("view") !== "large";

  const replace = (next: URLSearchParams) => start(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  const set = (key: string, values: string[]) => { const next = new URLSearchParams(params.toString()); next.delete("page"); if (values.length) next.set(key, values.join(",")); else next.delete(key); replace(next); };
  const toggle = (key: keyof typeof sel, v: string) => set(key, sel[key].includes(v) ? sel[key].filter((x) => x !== v) : [...sel[key], v]);
  const clearAll = () => { const next = new URLSearchParams(); ["sort", "view", "q"].forEach((k) => params.get(k) && next.set(k, params.get(k)!)); replace(next); };
  const loadMore = () => { const next = new URLSearchParams(params.toString()); next.set("page", String(page + 1)); replace(next); };

  const priceLabel = (b: FacetOptions["prices"][number], i: number) => (i === 0 ? `Under ${format(b.max + 1)}` : i === facets.prices.length - 1 ? `${format(b.min)} and above` : `${format(b.min)} – ${format(b.max + 1)}`);
  const activeChips = [
    ...sel.category.map((v) => ({ k: "category" as const, v, label: facets.categories.find((c) => c.id === v)?.name ?? v })),
    ...sel.colour.map((v) => ({ k: "colour" as const, v, label: v })),
    ...sel.size.map((v) => ({ k: "size" as const, v, label: `Size ${v}` })),
    ...sel.price.map((v) => { const i = facets.prices.findIndex((b) => b.id === v); return { k: "price" as const, v, label: i >= 0 ? priceLabel(facets.prices[i], i) : v }; }),
  ];
  const activeCount = activeChips.length + (inStock ? 1 : 0);
  const grid = dense ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

  const cards = items.map((it, i) => (
    <motion.li key={it.id} layout="position" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 0.8, 0.24, 1], delay: Math.min(i % pageSize, 8) * 0.04 }}>
      <ProductCard product={it} priority={i < 4} sizes={dense ? "(max-width:768px) 50vw, (max-width:1280px) 33vw, 25vw" : "(max-width:640px) 100vw, (max-width:1280px) 50vw, 33vw"} />
    </motion.li>
  ));
  if (editorial && activeCount === 0 && sort === "featured" && cards.length > 6) {
    cards.splice(dense ? 6 : 4, 0, <li key="editorial" className={dense ? "col-span-2" : "col-span-1 sm:col-span-2 xl:col-span-1"}>{editorial}</li>);
  }

  return (
    <>
      <div className="sticky top-16 z-30 border-y border-line bg-offwhite/95 backdrop-blur-md max-xl:top-[58px]">
        <div className="gutter flex h-14 items-center gap-5">
          <button onClick={() => setDrawer(true)} className="flex items-center gap-2.5 text-[11px] tracking-[0.2em] uppercase" aria-haspopup="dialog">
            <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden><path d="M0 2h16M0 10h16" stroke="currentColor" strokeWidth="1" /><circle cx="5" cy="2" r="1.8" fill="var(--color-offwhite)" stroke="currentColor" /><circle cx="11" cy="10" r="1.8" fill="var(--color-offwhite)" stroke="currentColor" /></svg>
            Filter &amp; sort{activeCount ? <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-chocolate px-1 text-[10px] tracking-normal text-offwhite">{activeCount}</span> : null}
          </button>
          {!hideCategory && (
            <div className="no-scrollbar hidden min-w-0 flex-1 items-center gap-6 overflow-x-auto md:flex">
              {facets.categories.map((c) => (
                <button key={c.id} onClick={() => toggle("category", c.id)} aria-pressed={sel.category.includes(c.id)} className={cn("hairline shrink-0 py-1 text-[11px] tracking-[0.16em] whitespace-nowrap uppercase", sel.category.includes(c.id) ? "!bg-[length:100%_1px] text-chocolate" : "text-taupe hover:text-chocolate")}>{c.name}</button>
              ))}
            </div>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-5">
            <p className="text-[11px] tracking-[0.16em] text-taupe uppercase" aria-live="polite">{pending ? "Updating…" : `${total} ${total === 1 ? "piece" : "pieces"}`}</p>
            <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="Grid density">
              {[["small", true], ["large", false]].map(([id, d]) => (
                <button key={String(id)} onClick={() => set("view", d ? [] : ["large"])} aria-pressed={dense === d} aria-label={d ? "Show more products per row" : "Show larger images"} className={cn("p-1.5", dense === d ? "text-chocolate" : "text-taupe/60 hover:text-chocolate")}>
                  {d ? <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><g fill="currentColor">{[0, 5, 10].flatMap((x) => [0, 5, 10].map((y) => <rect key={`${x}${y}`} x={x} y={y} width="4" height="4" />))}</g></svg>
                    : <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><g fill="currentColor"><rect width="6" height="14" /><rect x="8" width="6" height="14" /></g></svg>}
                </button>
              ))}
            </div>
          </div>
        </div>
        {activeChips.length > 0 || inStock ? (
          <div className="gutter no-scrollbar flex items-center gap-2 overflow-x-auto pb-3">
            {activeChips.map((c) => (
              <button key={c.k + c.v} onClick={() => toggle(c.k, c.v)} className="flex shrink-0 items-center gap-2 border border-line bg-porcelain px-3 py-1.5 text-[12px]" aria-label={`Remove filter ${c.label}`}>{c.label}<span aria-hidden>×</span></button>
            ))}
            {inStock && <button onClick={() => set("stock", [])} className="flex shrink-0 items-center gap-2 border border-line bg-porcelain px-3 py-1.5 text-[12px]" aria-label="Remove filter In stock">In stock<span aria-hidden>×</span></button>}
            <button onClick={clearAll} className="ulink ml-2 shrink-0">Clear all</button>
          </div>
        ) : null}
      </div>

      <ul className={cn("gutter grid gap-x-[clamp(8px,1.4vw,24px)] gap-y-[clamp(32px,3.4vw,56px)] pt-8 pb-12 transition-opacity max-md:gap-x-1.5 max-md:px-1.5", grid, pending && "opacity-60")} aria-busy={pending}>{cards}</ul>
      {items.length < total && (
        <div className="gutter pb-24 text-center">
          <p className="mb-4 text-[12px] text-taupe">Showing {items.length} of {total}</p>
          <button onClick={loadMore} disabled={pending} className="min-h-12 border border-chocolate px-10 text-[11px] tracking-[0.22em] uppercase hover:bg-chocolate hover:text-offwhite disabled:opacity-50">{pending ? "Loading…" : "Load more"}</button>
        </div>
      )}
      {items.length >= total && <div className="pb-12" />}
      {total === 0 && (
        <div className="gutter py-28 text-center">
          <p className="font-serif text-[26px]">Nothing matches just yet</p>
          <p className="mt-2 mb-6 text-taupe">Try removing a filter to see more of the collection.</p>
          <button onClick={clearAll} className="ulink">Clear all filters</button>
        </div>
      )}

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filter & sort"
        footer={
          <div className="grid grid-cols-2 gap-3 border-t border-line p-5">
            <button onClick={clearAll} className="min-h-12 border border-chocolate text-[11px] tracking-[0.2em] uppercase" disabled={!activeCount}>Clear all</button>
            <button onClick={() => setDrawer(false)} className="min-h-12 bg-chocolate text-[11px] tracking-[0.2em] text-offwhite uppercase">{pending ? "Updating…" : `Show ${total} ${total === 1 ? "piece" : "pieces"}`}</button>
          </div>
        }>
        <div className="divide-y divide-line px-6">
          <Section title="Sort by" open>
            <div className="grid gap-1" role="radiogroup" aria-label="Sort by">
              {SORTS.map((s) => (
                <label key={s.id} className="flex min-h-10 cursor-pointer items-center gap-3 text-[14px]">
                  <input type="radio" name="sort" checked={sort === s.id} onChange={() => set("sort", s.id === "featured" ? [] : [s.id])} className="h-4 w-4 accent-chocolate" />{s.label}
                </label>
              ))}
            </div>
          </Section>
          {facets.categories.length > 1 && !hideCategory && (
            <Section title="Category" open>
              {facets.categories.map((c) => <Check key={c.id} label={c.name} n={c.count} checked={sel.category.includes(c.id)} onChange={() => toggle("category", c.id)} />)}
            </Section>
          )}
          {facets.sizes.length > 0 && (
            <Section title="Size" open>
              <div className="grid grid-cols-4 gap-2">
                {facets.sizes.map(({ size: s, count: n }) => (
                  <button key={s} onClick={() => toggle("size", s)} disabled={!n && !sel.size.includes(s)} aria-pressed={sel.size.includes(s)} aria-label={`Size ${s} (${n})`} className={cn("min-h-11 border text-[13px] disabled:text-taupe/40", sel.size.includes(s) ? "border-chocolate bg-chocolate text-offwhite" : "border-line hover:border-chocolate")}>{s}</button>
                ))}
              </div>
            </Section>
          )}
          {facets.colours.length > 0 && (
            <Section title="Colour">
              <div className="grid grid-cols-2 gap-x-4">
                {facets.colours.map((c) => (
                  <Check key={c.name} label={<span className="flex items-center gap-2.5"><span className="h-4 w-4 rounded-full border border-chocolate/15" style={{ background: c.hex }} />{c.name}</span>} n={c.count} checked={sel.colour.includes(c.name)} onChange={() => toggle("colour", c.name)} />
                ))}
              </div>
            </Section>
          )}
          <Section title="Price">
            {facets.prices.map((b, i) => (b.count || sel.price.includes(b.id) ? <Check key={b.id} label={priceLabel(b, i)} n={b.count} checked={sel.price.includes(b.id)} onChange={() => toggle("price", b.id)} /> : null))}
          </Section>
          <Section title="Availability" open>
            <Check label="In stock now" n={facets.inStock} checked={inStock} onChange={() => set("stock", inStock ? [] : ["1"])} />
          </Section>
        </div>
      </Drawer>
    </>
  );
}

function Section({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [o, setO] = useState(!!open);
  return (
    <div className="py-4">
      <button onClick={() => setO(!o)} aria-expanded={o} className="flex w-full items-center justify-between py-1 text-[11px] tracking-[0.22em] uppercase">
        {title}<span aria-hidden className={cn("text-lg font-extralight transition-transform", o && "rotate-45")}>+</span>
      </button>
      <AnimatePresence initial={false}>
        {o && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }} className="overflow-hidden"><div className="pt-3 pb-1">{children}</div></motion.div>}
      </AnimatePresence>
    </div>
  );
}

function Check({ label, n, checked, onChange }: { label: React.ReactNode; n: number; checked: boolean; onChange: () => void }) {
  return (
    <label className={cn("flex min-h-10 cursor-pointer items-center gap-3 text-[14px]", !n && !checked && "opacity-40")}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={!n && !checked} className="h-4 w-4 accent-chocolate" />
      <span className="flex-1">{label}</span>
      <span className="text-[12px] text-taupe">{n}</span>
    </label>
  );
}

/** Server/fallback grid (before search params are available). */
export function StaticGrid({ items }: { items: CardProduct[] }) {
  return (
    <>
      <div className="h-14 border-y border-line" />
      <ul className="gutter grid grid-cols-2 gap-x-[clamp(8px,1.4vw,24px)] gap-y-[clamp(32px,3.4vw,56px)] pt-8 pb-24 max-md:gap-x-1.5 max-md:px-1.5 md:grid-cols-3 xl:grid-cols-4">
        {items.map((it, i) => <li key={it.id}><ProductCard product={it} priority={i < 4} /></li>)}
      </ul>
    </>
  );
}
