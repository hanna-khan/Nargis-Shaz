"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useShop } from "../shop-context";
import type { OccasionId, SortKey } from "@/types";

/** Minimal facts needed to filter/sort a card client-side. Cards themselves are server-rendered. */
export interface CardFacts {
  id: string;
  categoryId: string;
  occasionIds: OccasionId[];
  colours: string[];
  sizes: string[]; // in stock
  isNew: boolean;
  createdAt: string;
  prices: Record<string, number>;
  text: string;
}

export interface FacetOptions {
  categories: { id: string; name: string }[];
  occasions: { id: OccasionId; name: string }[];
  colours: { name: string; hex: string }[];
  sizes: string[];
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
];

/**
 * Filters & sorting kept in the URL (shareable, crawlable canonical stays clean).
 * Rendered inside <Suspense>; the fallback is the full server-rendered grid.
 */
export function CatalogBrowser({ facts, cards, facets, editorial, hideFacets = [] }: { facts: CardFacts[]; cards: Record<string, ReactNode>; facets: FacetOptions; editorial?: ReactNode; hideFacets?: ("category" | "occasion")[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { currency } = useShop();
  const [panel, setPanel] = useState(false);

  const get = (k: string) => params.get(k)?.split(",").filter(Boolean) ?? [];
  const sel = { category: get("category"), occasion: get("occasion"), colour: get("colour"), size: get("size") };
  const sort = (params.get("sort") as SortKey) || "featured";

  const set = (key: string, values: string[]) => {
    const next = new URLSearchParams(params.toString());
    if (values.length) next.set(key, values.join(",")); else next.delete(key);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  const toggle = (key: keyof typeof sel, v: string) => set(key, sel[key].includes(v) ? sel[key].filter((x) => x !== v) : [...sel[key], v]);

  const key = params.toString();
  const visible = useMemo(() => {
    const list = facts.filter((f) =>
      (!sel.category.length || sel.category.includes(f.categoryId)) &&
      (!sel.occasion.length || f.occasionIds.some((o) => sel.occasion.includes(o))) &&
      (!sel.colour.length || f.colours.some((c) => sel.colour.includes(c))) &&
      (!sel.size.length || f.sizes.some((s) => sel.size.includes(s))));
    const by = { newest: (a: CardFacts, b: CardFacts) => b.createdAt.localeCompare(a.createdAt), "price-asc": (a: CardFacts, b: CardFacts) => a.prices[currency] - b.prices[currency], "price-desc": (a: CardFacts, b: CardFacts) => b.prices[currency] - a.prices[currency], featured: () => 0 };
    return [...list].sort(by[sort]);
  }, [facts, key, currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = sel.category.length + sel.occasion.length + sel.colour.length + sel.size.length;
  const chipGroups = [
    !hideFacets.includes("occasion") && { key: "occasion" as const, items: facets.occasions.map((o) => ({ id: o.id, label: o.name })) },
    !hideFacets.includes("category") && { key: "category" as const, items: facets.categories.map((c) => ({ id: c.id, label: c.name })) },
  ].filter(Boolean) as { key: "occasion" | "category"; items: { id: string; label: string }[] }[];

  return (
    <>
      <div className="sticky top-[68px] z-20 border-y border-line bg-paper/95 backdrop-blur-md max-md:top-[58px]">
        <div className="flex items-center gap-4 px-[clamp(18px,3.2vw,48px)] py-3.5">
          <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {chipGroups.flatMap((g) => g.items.map((it) => (
              <button key={g.key + it.id} onClick={() => toggle(g.key, it.id)} aria-pressed={sel[g.key].includes(it.id)}
                className={cn("rounded-full border px-4 py-2 text-[10.5px] tracking-[0.16em] whitespace-nowrap uppercase transition-colors", sel[g.key].includes(it.id) ? "border-charcoal bg-charcoal text-ivory" : "border-line hover:border-charcoal")}>
                {it.label}
              </button>
            )))}
          </div>
          <button onClick={() => setPanel((v) => !v)} aria-expanded={panel} className="shrink-0 text-[11px] tracking-[0.18em] uppercase">
            Filter{activeCount ? ` (${activeCount})` : ""}
          </button>
          <label className="shrink-0 text-[11px] tracking-[0.18em] uppercase max-sm:hidden">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => set("sort", e.target.value === "featured" ? [] : [e.target.value])} className="cursor-pointer bg-transparent uppercase outline-none">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>
        <AnimatePresence initial={false}>
          {panel && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.45, ease: [0.22, 0.8, 0.24, 1] }} className="overflow-hidden border-t border-line">
              <div className="grid gap-8 px-[clamp(18px,3.2vw,48px)] py-7 md:grid-cols-[1fr_1fr_auto]">
                <fieldset>
                  <legend className="eyebrow mb-3">Colour</legend>
                  <div className="flex flex-wrap gap-2">
                    {facets.colours.map((c) => (
                      <button key={c.name} onClick={() => toggle("colour", c.name)} aria-pressed={sel.colour.includes(c.name)} className={cn("flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-[12.5px]", sel.colour.includes(c.name) ? "border-charcoal" : "border-line")}>
                        <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.hex }} />{c.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="eyebrow mb-3">Size in stock</legend>
                  <div className="flex flex-wrap gap-2">
                    {facets.sizes.map((s) => (
                      <button key={s} onClick={() => toggle("size", s)} aria-pressed={sel.size.includes(s)} className={cn("min-w-12 border px-3 py-2 text-[12.5px]", sel.size.includes(s) ? "border-charcoal bg-charcoal text-ivory" : "border-line")}>{s}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-end gap-5">
                  <label className="sm:hidden text-[11px] tracking-[0.18em] uppercase">
                    <span className="sr-only">Sort by</span>
                    <select value={sort} onChange={(e) => set("sort", e.target.value === "featured" ? [] : [e.target.value])} className="border border-line bg-transparent px-3 py-2 uppercase">
                      {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </label>
                  {activeCount > 0 && <button onClick={() => router.replace(pathname, { scroll: false })} className="ulink">Clear all</button>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="px-[clamp(18px,3.2vw,48px)] pt-6 text-[11px] tracking-[0.16em] text-charcoal/55 uppercase" aria-live="polite">{visible.length} piece{visible.length === 1 ? "" : "s"}</p>
      <CardGrid ids={visible.map((v) => v.id)} cards={cards} editorial={activeCount === 0 && sort === "featured" ? editorial : undefined} />
      {visible.length === 0 && <p className="py-24 text-center text-charcoal/60">No pieces match these filters. <button className="ulink ml-2" onClick={() => router.replace(pathname, { scroll: false })}>Clear filters</button></p>}
    </>
  );
}

export function CardGrid({ ids, cards, editorial }: { ids: string[]; cards: Record<string, ReactNode>; editorial?: ReactNode }) {
  const items: ReactNode[] = ids.map((id) => (
    <motion.li key={id} layout="position" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 0.8, 0.24, 1] }}>{cards[id]}</motion.li>
  ));
  if (editorial && items.length > 4) items.splice(4, 0, <li key="editorial" className="col-span-2 row-span-2 max-md:row-span-1">{editorial}</li>);
  return <ul className="grid grid-cols-2 gap-x-[clamp(12px,1.6vw,26px)] gap-y-[clamp(30px,3vw,48px)] px-[clamp(18px,3.2vw,48px)] pt-6 pb-24 md:grid-cols-3 xl:grid-cols-4">{items}</ul>;
}

/** Static fallback used for SSR / before search params are available. */
export function StaticCardGrid({ ids, cards, editorial }: { ids: string[]; cards: Record<string, ReactNode>; editorial?: ReactNode }) {
  const items: ReactNode[] = ids.map((id) => <li key={id}>{cards[id]}</li>);
  if (editorial && items.length > 4) items.splice(4, 0, <li key="editorial" className="col-span-2 row-span-2 max-md:row-span-1">{editorial}</li>);
  return (
    <>
      <div className="h-[62px] border-y border-line" />
      <p className="px-[clamp(18px,3.2vw,48px)] pt-6 text-[11px] tracking-[0.16em] text-charcoal/55 uppercase">{ids.length} pieces</p>
      <ul className="grid grid-cols-2 gap-x-[clamp(12px,1.6vw,26px)] gap-y-[clamp(30px,3vw,48px)] px-[clamp(18px,3.2vw,48px)] pt-6 pb-24 md:grid-cols-3 xl:grid-cols-4">{items}</ul>
    </>
  );
}
