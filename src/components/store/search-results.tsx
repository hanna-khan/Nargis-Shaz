"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "./product/product-card";
import type { CardProduct } from "./product/card-data";

const SUGGESTIONS = ["Satin", "Blazer", "Linen", "Lehenga", "Trench", "Skirt"];

export function SearchResults({ items }: { items: { card: CardProduct; text: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [value, setValue] = useState(q);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return items.filter((p) => t.split(/\s+/).every((w) => p.text.includes(w))).map((p) => p.card);
  }, [q, items]);

  return (
    <>
      <section className="gutter pt-14 pb-8">
        <h1 className="eyebrow mb-6 text-bronze">Search</h1>
        <form role="search" onSubmit={(e) => { e.preventDefault(); router.replace(`/search?q=${encodeURIComponent(value.trim())}`); }}>
          <label htmlFor="q" className="sr-only">Search the collection</label>
          <input id="q" type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="What are you looking for?" autoComplete="off"
            className="w-full border-b border-chocolate bg-transparent py-3 font-serif text-[clamp(30px,4.6vw,60px)] outline-none placeholder:text-taupe/45" />
        </form>
        <div className="mt-6 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => <Link key={s} href={`/search?q=${s.toLowerCase()}`} onClick={() => setValue(s.toLowerCase())} className="border border-line px-4 py-2 text-[10.5px] tracking-[0.18em] uppercase hover:border-chocolate">{s}</Link>)}
        </div>
        {q && <p className="mt-10 text-[11px] tracking-[0.16em] text-taupe uppercase" aria-live="polite">{results.length} result{results.length === 1 ? "" : "s"} for “{q}”</p>}
      </section>
      {results.length > 0 ? (
        <ul className="gutter grid grid-cols-2 gap-x-[clamp(8px,1.4vw,24px)] gap-y-12 pb-24 max-md:gap-x-1.5 max-md:px-1.5 md:grid-cols-3 xl:grid-cols-4">
          {results.map((p, i) => <li key={p.id}><ProductCard product={p} priority={i < 4} /></li>)}
        </ul>
      ) : q ? (
        <p className="gutter py-24 text-center text-taupe">Nothing found for “{q}”. Try a fabric, a colour or an occasion — or <Link href="/shop" className="underline underline-offset-4">browse the full collection</Link>.</p>
      ) : <div className="pb-24" />}
    </>
  );
}
