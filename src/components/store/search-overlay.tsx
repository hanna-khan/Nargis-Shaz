"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Price } from "./shop-context";
import type { NavData } from "./navigation-types";

export function SearchOverlay({ open, onClose, index }: { open: boolean; onClose: () => void; index: NavData["searchIndex"] }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 350);
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => { clearTimeout(t); document.removeEventListener("keydown", k); };
  }, [open, onClose]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return index.slice(0, 4);
    return index.filter((p) => t.split(/\s+/).every((w) => p.keywords.includes(w))).slice(0, 8);
  }, [q, index]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog" aria-modal="true" aria-label="Search"
          className="fixed inset-0 z-[110] overflow-y-auto bg-paper px-[clamp(18px,3.2vw,48px)] py-10"
          initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.7, ease: [0.22, 0.8, 0.24, 1] }}
        >
          <div className="mx-auto max-w-[1100px]">
            <div className="mb-8 flex items-center justify-between">
              <p className="eyebrow">Search</p>
              <button onClick={onClose} aria-label="Close search" className="text-[30px] leading-none font-extralight">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q)}`); onClose(); }}>
              <input
                ref={input} value={q} onChange={(e) => setQ(e.target.value)} type="search" aria-label="Search the collection"
                placeholder="Dresses, cashmere, festive…"
                className="w-full border-b border-charcoal bg-transparent py-3 font-serif text-[clamp(30px,5vw,60px)] font-light outline-none placeholder:text-charcoal/30"
              />
            </form>
            <p className="eyebrow mt-10 mb-6 text-charcoal/55">{q ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Popular now"}</p>
            <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {results.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} onClick={onClose} className="zoom-on-hover block">
                    <EditorialImage image={r.image} className="aspect-[4/5]" sizes="25vw" />
                    <p className="mt-3 font-serif text-[19px] leading-tight">{r.name}</p>
                    <Price prices={r.prices} className="text-[13px]" />
                  </Link>
                </li>
              ))}
            </ul>
            {q && results.length === 0 && <p className="text-charcoal/60">Nothing found for “{q}”. Try “dress”, “silk” or “festive”.</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
