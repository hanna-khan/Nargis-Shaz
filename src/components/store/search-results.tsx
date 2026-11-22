"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["Satin", "Blazer", "Linen", "Lehenga", "Trench", "Skirt"];

/** Search box; results below are queried from MySQL (names, categories, SKUs, colours, collections). */
export function SearchBox() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [value, setValue] = useState(q);
  return (
    <section className="gutter pt-14 pb-8">
      <h1 className="eyebrow mb-6 text-bronze">{q ? <>Results for “{q}”</> : "Search"}</h1>
      <form role="search" onSubmit={(e) => { e.preventDefault(); const t = value.trim(); if (t) router.replace(`/search?q=${encodeURIComponent(t)}`); }}>
        <label htmlFor="q" className="sr-only">Search the collection</label>
        <input id="q" type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="What are you looking for?" autoComplete="off" maxLength={80}
          className="w-full border-b border-chocolate bg-transparent py-3 font-serif text-[clamp(30px,4.6vw,60px)] outline-none placeholder:text-taupe/45" />
      </form>
      <div className="mt-6 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => <Link key={s} href={`/search?q=${s.toLowerCase()}`} onClick={() => setValue(s.toLowerCase())} className="border border-line px-4 py-2 text-[10.5px] tracking-[0.18em] uppercase hover:border-chocolate">{s}</Link>)}
      </div>
    </section>
  );
}
