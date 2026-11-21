"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { EditorialImage } from "@/components/media/editorial-image";
import { cn } from "@/lib/utils";
import { HeartIcon, SearchIcon, UserIcon } from "./icons";
import { MarketSwitcher } from "./market-switcher";
import type { NavData } from "./navigation-types";

const ease = [0.22, 0.8, 0.24, 1] as const;

/**
 * Mobile navigation: full-height sheet, large tap targets, the main actions (close, search)
 * within thumb reach at the bottom, and occasion images to browse visually.
 */
export function MobileMenu({ open, onClose, nav, onSearch }: { open: boolean; onClose: () => void; nav: NavData; onSearch: () => void }) {
  const [section, setSection] = useState<string | null>("shop");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => panel.current?.focus(), 60);
    return () => { document.removeEventListener("keydown", k); document.documentElement.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);

  const groups = [
    { id: "shop", label: "Shop women", links: [{ name: "View all clothing", href: "/shop" }, ...nav.categories] },
    { id: "collections", label: "Collections", links: nav.collections },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <motion.div className="absolute inset-0 bg-chocolate/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={panel}
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[min(92vw,440px)] flex-col bg-offwhite outline-none"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.55, ease }}
          >
            <div className="flex h-[58px] items-center justify-between border-b border-line px-5">
              <Wordmark size="sm" subtitle={false} />
              <button onClick={onClose} aria-label="Close menu" className="-mr-1 p-2 text-[26px] leading-none font-extralight">×</button>
            </div>

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 pb-6">
              <Link href="/new-arrivals" onClick={onClose} className="flex items-center justify-between border-b border-line py-4 font-serif text-[26px]">New in<span className="eyebrow text-bronze">Just arrived</span></Link>
              {groups.map((g) => (
                <div key={g.id} className="border-b border-line">
                  <button className="flex w-full items-center justify-between py-4 font-serif text-[26px]" aria-expanded={section === g.id} onClick={() => setSection(section === g.id ? null : g.id)}>
                    {g.label}<span aria-hidden className={cn("text-[22px] font-extralight transition-transform duration-300", section === g.id && "rotate-45")}>+</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {section === g.id && (
                      <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease }} className="overflow-hidden">
                        {g.links.map((l) => (
                          <li key={l.href + l.name}>
                            <Link href={l.href} onClick={onClose} className="flex min-h-12 items-center gap-4 py-1.5">
                              {l.image ? <EditorialImage image={l.image} className="h-12 w-10 shrink-0" sizes="40px" /> : <span className="h-12 w-10 shrink-0" aria-hidden />}
                              <span className="text-[13px] tracking-[0.14em] uppercase">{l.name}</span>
                            </Link>
                          </li>
                        ))}
                        <li className="h-3" />
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <p className="eyebrow mt-7 mb-3 text-taupe">Shop by occasion</p>
              <ul className="grid grid-cols-2 gap-3">
                {nav.occasions.map((o) => (
                  <li key={o.href}>
                    <Link href={o.href} onClick={onClose} className="group relative block aspect-[3/4] overflow-hidden">
                      <EditorialImage image={o.image} className="absolute inset-0" sizes="45vw" position="center 25%" />
                      <span className="absolute inset-0 bg-gradient-to-t from-chocolate/55 via-transparent" />
                      <span className="absolute inset-x-3 bottom-3 font-serif text-[18px] leading-tight text-offwhite">{o.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <ul className="mt-7 space-y-1 text-[13px] tracking-[0.12em] uppercase">
                <li><Link href="/our-story" onClick={onClose} className="flex min-h-11 items-center">Our story</Link></li>
                <li><Link href="/account" onClick={onClose} className="flex min-h-11 items-center gap-3"><UserIcon width={18} height={18} />Account</Link></li>
                <li><Link href="/wishlist" onClick={onClose} className="flex min-h-11 items-center gap-3"><HeartIcon width={18} height={18} />Wishlist</Link></li>
                <li><Link href="/customer-care" onClick={onClose} className="flex min-h-11 items-center">Customer care</Link></li>
              </ul>
              <div className="mt-6"><MarketSwitcher /></div>
            </nav>

            {/* Thumb-reach actions */}
            <div className="grid grid-cols-2 border-t border-line">
              <button onClick={onSearch} className="flex min-h-14 items-center justify-center gap-2 text-[11px] tracking-[0.2em] uppercase"><SearchIcon width={18} height={18} />Search</button>
              <button onClick={onClose} className="flex min-h-14 items-center justify-center border-l border-line text-[11px] tracking-[0.2em] uppercase">Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
