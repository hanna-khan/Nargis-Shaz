"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CardGrid } from "./product/catalog-browser";

const SUGGESTIONS = ["Silk", "Cashmere", "Dress", "Festive", "Workwear", "Gold"];

export function SearchResults({ index, cards }: { index: { id: string; text: string }[]; cards: Record<string, ReactNode> }) {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [value, setValue] = useState(q);
  const ids = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return index.filter((p) => t.split(/\s+/).every((w) => p.text.includes(w))).map((p) => p.id);
  }, [q, index]);

  return (
    <>
      <section className="px-[clamp(18px,3.2vw,48px)] pt-16 pb-6">
        <h1 className="eyebrow mb-6">Search</h1>
        <form role="search" onSubmit={(e) => { e.preventDefault(); router.replace(`/search?q=${encodeURIComponent(value)}`); }}>
          <label htmlFor="q" className="sr-only">Search the collection</label>
          <input id="q" type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="What are you looking for?"
            className="w-full border-b border-charcoal bg-transparent py-3 font-serif text-[clamp(32px,5vw,64px)] font-light outline-none placeholder:text-charcoal/30" />
        </form>
        <div className="mt-6 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => <Link key={s} href={`/search?q=${s.toLowerCase()}`} onClick={() => setValue(s.toLowerCase())} className="rounded-full border border-line px-4 py-2 text-[10.5px] tracking-[0.16em] uppercase hover:border-charcoal">{s}</Link>)}
        </div>
        {q && <p className="mt-10 text-[11px] tracking-[0.16em] text-charcoal/55 uppercase" aria-live="polite">{ids.length} result{ids.length === 1 ? "" : "s"} for “{q}”</p>}
      </section>
      {ids.length > 0 ? <CardGrid ids={ids} cards={cards} /> : q ? <p className="px-6 py-24 text-center text-charcoal/60">We couldn&apos;t find anything for “{q}”. Try a fabric, colour or occasion.</p> : <div className="pb-24" />}
    </>
  );
}
