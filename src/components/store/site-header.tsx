"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";
import { MarketSwitcher } from "./market-switcher";
import { MegaMenu } from "./mega-menu";
import { MobileMenu } from "./mobile-menu";
import { SearchOverlay } from "./search-overlay";
import { useShop } from "./shop-context";
import type { NavData } from "./navigation-types";

/** Pages whose first section is a full-bleed photograph: header starts transparent over it. */
const OVER_HERO = ["/", "/our-story"];

/** Reads the pathname (dynamic) — rendered inside <Suspense>, with SiteHeaderView as the fallback. */
export function SiteHeader({ nav }: { nav: NavData }) {
  return <SiteHeaderView nav={nav} pathname={usePathname()} />;
}

export function SiteHeaderView({ nav, pathname }: { nav: NavData; pathname: string }) {
  const overHero = OVER_HERO.includes(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const { cartCount, setCartOpen, wishlist, hydrated, lastAdded, customer } = useShop();
  const headerRef = useRef<HTMLElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // Close everything on route change.
  useEffect(() => { setOpen(null); setMobile(false); setSearch(false); }, [pathname]); // eslint-disable-line react-hooks/set-state-in-effect

  /* Hover intent: small open delay avoids flicker when the pointer passes over the nav;
     a close delay keeps the panel stable while the pointer travels into it. */
  const intendOpen = (id: string | null) => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpen(id), open ? 40 : 120);
  };
  const intendClose = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 180);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); triggers.current[open]?.focus(); } };
    const onDown = (e: PointerEvent) => { if (!headerRef.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  const transparent = overHero && !scrolled && !open;
  const compact = scrolled || !overHero;
  const active = nav.primary.find((n) => n.id === open);

  return (
    <>
      {nav.announcement && (
        <div className="relative z-[60] flex h-8 items-center justify-center bg-chocolate px-10 text-center text-[10px] tracking-[0.22em] text-offwhite/90 uppercase">
          {nav.announcementHref ? <Link href={nav.announcementHref} className="truncate hover:text-offwhite">{nav.announcement}</Link> : <p className="truncate">{nav.announcement}</p>}
        </div>
      )}
      <header
        ref={headerRef}
        onMouseLeave={intendClose}
        onMouseEnter={() => clearTimeout(closeTimer.current)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(null); }}
        className={cn(
          "sticky top-0 z-50 border-b transition-[background-color,color,border-color] duration-500",
          overHero && "-mb-[var(--hdr)] max-xl:-mb-[58px]",
          transparent ? "border-transparent bg-transparent text-offwhite" : "border-line bg-offwhite/95 text-chocolate backdrop-blur-md",
        )}
        style={{ ["--hdr" as string]: compact ? "64px" : "84px" }}
      >
        <div className={cn("gutter grid grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-500 ease-[var(--ease-editorial)]", compact ? "h-16" : "h-[84px]", "max-xl:h-[58px]")}>
          {/* Left: primary navigation (desktop) · menu + search (mobile) */}
          <div className="flex h-full items-center">
            <div className="flex items-center gap-4 xl:hidden">
              <button onClick={() => setMobile(true)} aria-label="Open menu" className="-ml-1 p-1"><MenuIcon width={22} height={22} /></button>
              <button onClick={() => setSearch(true)} aria-label="Search" className="p-1"><SearchIcon /></button>
            </div>
            <nav aria-label="Primary" className="hidden h-full xl:block">
              <ul className="flex h-full items-center gap-[clamp(16px,1.7vw,30px)]">
                {nav.primary.map((item) => (
                  <li key={item.id} className="flex h-full items-center" onMouseEnter={() => intendOpen(item.panel ? item.id : null)}>
                    {item.panel ? (
                      <button
                        ref={(el) => { triggers.current[item.id] = el; }}
                        aria-expanded={open === item.id}
                        aria-controls={`mega-${item.id}`}
                        onClick={() => setOpen(open === item.id ? null : item.id)}
                        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(item.id); setTimeout(() => document.querySelector<HTMLElement>(`#mega-${item.id} a`)?.focus(), 60); } }}
                        className={cn("hairline py-1.5 text-[11px] tracking-[0.2em] whitespace-nowrap uppercase", open === item.id && "!bg-[length:100%_1px]")}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="hairline py-1.5 text-[11px] tracking-[0.2em] whitespace-nowrap uppercase" onFocus={() => setOpen(null)}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Centre: wordmark */}
          <Link href="/" aria-label="Nargis & Shaz — home" className="justify-self-center">
            <Wordmark size={compact ? "sm" : "md"} subtitle={!compact} className="transition-all duration-500 max-xl:hidden" />
            <Wordmark size="sm" subtitle={false} className="xl:hidden" />
          </Link>

          {/* Right: market · search · account · wishlist · bag */}
          <div className="flex items-center justify-end gap-[clamp(12px,1.4vw,22px)]">
            <div className="hidden xl:block"><MarketSwitcher compact tone={transparent ? "light" : "dark"} /></div>
            <button onClick={() => setSearch(true)} aria-label="Search" className="hidden p-1 xl:block"><SearchIcon /></button>
            <Link href="/account" aria-label={customer ? `Your account (${customer.firstName})` : "Sign in or create an account"} className="hidden p-1 xl:block"><UserIcon /></Link>
            <Link href="/wishlist" aria-label={`Wishlist${hydrated && wishlist.length ? `, ${wishlist.length} saved` : ""}`} className="relative p-1">
              <HeartIcon />
              {hydrated && wishlist.length > 0 && <Count n={wishlist.length} />}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${hydrated ? cartCount : 0} items`} className="relative p-1">
              <motion.span key={lastAdded ?? "none"} initial={lastAdded ? { scale: 1.25 } : false} animate={{ scale: 1 }} transition={{ duration: 0.5 }} className="block"><BagIcon /></motion.span>
              {hydrated && cartCount > 0 && <Count n={cartCount} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {active?.panel && (
            <MegaMenu key="mega" item={active} onNavigate={() => setOpen(null)} />
          )}
        </AnimatePresence>
      </header>
      {/* Dim the page while a panel is open (desktop only) */}
      <AnimatePresence>
        {open && <motion.div aria-hidden className="fixed inset-0 z-40 hidden bg-chocolate/20 xl:block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />}
      </AnimatePresence>

      <MobileMenu open={mobile} onClose={() => setMobile(false)} nav={nav} onSearch={() => { setMobile(false); setSearch(true); }} />
      <SearchOverlay open={search} onClose={() => setSearch(false)} index={nav.searchIndex} />
    </>
  );
}

function Count({ n }: { n: number }) {
  return <span className="absolute -top-0.5 -right-1.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-bronze px-1 text-[9.5px] tracking-normal text-white">{n}</span>;
}
