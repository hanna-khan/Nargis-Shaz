"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Price, useShop } from "./shop-context";
import type { NavData } from "./navigation-types";
import type { PriceSet, ProductImage } from "@/types";

interface Suggestion {
  total: number;
  products: { id: string; name: string; href: string; image: ProductImage | null; prices: PriceSet }[];
  categories: { name: string; href: string }[];
  collections: { name: string; href: string }[];
}

const RECENT = "ns.searches.v1";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT) ?? "[]"); } catch { return []; } };

/** Search overlay: live suggestions from the server (names, categories, SKUs, colours, collections). */
export function SearchOverlay({ open, onClose, index }: { open: boolean; onClose: () => void; index: NavData["searchIndex"] }) {
  const { currency } = useShop();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent()); // eslint-disable-line react-hooks/set-state-in-effect
    const t = setTimeout(() => input.current?.focus(), 350);
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => { clearTimeout(t); document.removeEventListener("keydown", k); };
  }, [open, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}&currency=${currency}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setData(d); })
        .catch(() => {}).finally(() => setLoading(false));
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, currency]);

  const submit = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    try { localStorage.setItem(RECENT, JSON.stringify(next)); } catch { /* ignore */ }
    router.push(`/search?q=${encodeURIComponent(t)}`);
    onClose();
  };

  const active = q.trim().length >= 2 ? data : null;
  const products = active ? active.products : index.slice(0, 4).map((p) => ({ id: p.id, name: p.name, href: p.href, image: p.image, prices: p.prices }));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog" aria-modal="true" aria-label="Search"
          className="fixed inset-0 z-[110] overflow-y-auto bg-offwhite px-[clamp(18px,3.4vw,56px)] py-8"
          initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.7, ease: [0.22, 0.8, 0.24, 1] }}
        >
          <div className="mx-auto max-w-[1100px]">
            <div className="mb-8 flex items-center justify-between">
              <p className="eyebrow">Search</p>
              <button onClick={onClose} aria-label="Close search" className="text-[30px] leading-none font-extralight">×</button>
            </div>
            <form role="search" onSubmit={(e) => { e.preventDefault(); submit(q); }}>
              <input
                ref={input} value={q} onChange={(e) => setQ(e.target.value)} type="search" aria-label="Search the collection" maxLength={80}
                placeholder="Satin, blazers, lehengas, SKU…"
                className="w-full border-b border-chocolate bg-transparent py-3 font-serif text-[clamp(30px,5vw,60px)] outline-none placeholder:text-taupe/45"
              />
            </form>

            {!active && recent.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <p className="eyebrow mr-2 text-charcoal/55">Recent</p>
                {recent.map((r) => <button key={r} onClick={() => submit(r)} className="border border-line px-3 py-1.5 text-[13px] hover:border-chocolate">{r}</button>)}
                <button onClick={() => { try { localStorage.removeItem(RECENT); } catch { /* ignore */ } setRecent([]); }} className="ulink ml-2">Clear</button>
              </div>
            )}

            {active && (active.categories.length > 0 || active.collections.length > 0) && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {[...active.categories, ...active.collections].map((l) => <li key={l.href}><Link href={l.href} onClick={onClose} className="inline-block border border-line px-3 py-1.5 text-[13px] hover:border-chocolate">{l.name}</Link></li>)}
              </ul>
            )}

            <p className="eyebrow mt-10 mb-6 text-charcoal/55" aria-live="polite">
              {active ? (loading ? "Searching…" : `${active.total} result${active.total === 1 ? "" : "s"}`) : "Popular now"}
            </p>
            <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {products.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} onClick={onClose} className="zoom-on-hover block">
                    <EditorialImage image={r.image ?? undefined} className="aspect-[3/4]" sizes="(max-width:768px) 50vw, 25vw" />
                    <p className="label mt-3 text-[12.5px]">{r.name}</p>
                    <Price prices={r.prices} className="text-[13px]" />
                  </Link>
                </li>
              ))}
            </ul>
            {active && active.total > products.length && <button onClick={() => submit(q)} className="ulink mt-8">See all {active.total} results</button>}
            {active && !loading && active.total === 0 && <p className="text-taupe">Nothing found for “{q}”. Try “satin”, “linen” or “festive”.</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
