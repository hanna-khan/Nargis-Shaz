"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { EditorialImage } from "@/components/media/editorial-image";
import { Drawer } from "@/components/ui/drawer";
import { BagIcon, HeartIcon, MenuIcon, SearchIcon } from "./icons";
import { MarketSwitcher } from "./market-switcher";
import { SearchOverlay } from "./search-overlay";
import { useShop } from "./shop-context";
import type { NavData } from "./navigation-types";

const ease = [0.22, 0.8, 0.24, 1] as const;

export function SiteHeader({ nav }: { nav: NavData }) {
  const pathname = usePathname();
  const overHero = pathname === "/" || pathname === "/our-story";
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const { cartCount, setCartOpen, wishlist, hydrated } = useShop();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // Close menus on navigation (component stays mounted under <Activity>).
  useEffect(() => { setMenu(null); setMobile(false); setSearch(false); }, [pathname]); // eslint-disable-line react-hooks/set-state-in-effect

  const transparent = overHero && !scrolled && !menu;
  const panels: Record<string, React.ReactNode> = {
    shop: (
      <div className="grid grid-cols-[repeat(3,minmax(150px,220px))_1fr_1fr] gap-10">
        <MenuColumn title="Clothing" links={nav.categories.slice(0, 6)} />
        <MenuColumn title="Accessories" links={nav.categories.slice(6)} />
        <MenuColumn title="Highlights" links={[{ name: "New arrivals", href: "/new-arrivals" }, { name: "Shop all", href: "/shop" }, ...nav.collections.slice(-2)]} />
        {nav.occasions.slice(0, 2).map((o) => <MenuTile key={o.href} {...o} />)}
      </div>
    ),
    occasions: (
      <div className="grid grid-cols-[minmax(150px,240px)_repeat(4,1fr)] gap-8">
        <MenuColumn title="Dress for" links={nav.occasions.map(({ name, href }) => ({ name, href }))} />
        {nav.occasions.map((o) => <MenuTile key={o.href} {...o} />)}
      </div>
    ),
    collections: (
      <div className="grid grid-cols-[repeat(2,minmax(150px,260px))_1fr_1fr] gap-10">
        <MenuColumn title="Collections" links={nav.collections} />
        <MenuColumn title="The house" links={[{ name: "Our story", href: "/our-story" }, { name: "Craft & ateliers", href: "/our-story#craft" }, { name: "Wishlist", href: "/wishlist" }]} />
        {nav.occasions.slice(2, 4).map((o) => <MenuTile key={o.href} {...o} />)}
      </div>
    ),
  };

  return (
    <>
      <div className="relative z-[60] flex h-9 items-center justify-center bg-cocoa px-10 text-center text-[10px] tracking-[0.22em] text-ivory uppercase">
        <p className="truncate">{nav.announcement}</p>
      </div>
      <header
        onMouseLeave={() => setMenu(null)}
        className={cn(
          "sticky top-0 z-50 h-[68px] border-b transition-colors duration-500 max-md:h-[58px]",
          overHero && "-mb-[68px] max-md:-mb-[58px]",
          transparent ? "border-transparent bg-transparent text-ivory" : "border-line bg-paper/95 text-charcoal backdrop-blur-md",
        )}
      >
        <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center px-[clamp(18px,3.2vw,48px)]">
          <nav aria-label="Primary" className="flex h-full items-center gap-7">
            <button className="lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><MenuIcon width={22} height={22} /></button>
            <ul className="hidden h-full items-center gap-7 lg:flex">
              <NavItem href="/new-arrivals" label="New in" onEnter={() => setMenu(null)} />
              <NavItem href="/shop" label="Shop" onEnter={() => setMenu("shop")} active={menu === "shop"} />
              <NavItem href="/workwear" label="Occasions" onEnter={() => setMenu("occasions")} active={menu === "occasions"} />
              <NavItem href="/collections/autumn-winter-2026" label="Collections" onEnter={() => setMenu("collections")} active={menu === "collections"} />
              <NavItem href="/our-story" label="Our story" onEnter={() => setMenu(null)} />
            </ul>
          </nav>
          <Link href="/" aria-label="Nargis & Shaz — home" className="font-serif text-[25px] tracking-[0.2em] whitespace-nowrap uppercase max-md:text-[18px] max-md:tracking-[0.14em]">
            Nargis<span className="mx-[0.18em] text-[1.1em] tracking-normal italic">&amp;</span>Shaz
          </Link>
          <div className="flex items-center justify-end gap-5 max-md:gap-3.5">
            <div className="hidden md:block"><MarketSwitcher compact tone={transparent ? "light" : "dark"} /></div>
            <button onClick={() => setSearch(true)} aria-label="Search" className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase">
              <SearchIcon /><span className="hidden xl:inline">Search</span>
            </button>
            <Link href="/wishlist" aria-label={`Wishlist${hydrated && wishlist.length ? `, ${wishlist.length} items` : ""}`} className="relative hidden sm:block">
              <HeartIcon />
              {hydrated && wishlist.length > 0 && <Dot n={wishlist.length} />}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label={`Bag, ${cartCount} items`} className="relative">
              <BagIcon />
              {hydrated && cartCount > 0 && <Dot n={cartCount} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menu && (
            <motion.div
              key={menu}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.45, ease }}
              className="absolute inset-x-0 top-full hidden border-b border-line bg-paper px-[clamp(18px,3.2vw,48px)] pt-11 pb-13 text-charcoal lg:block"
            >
              {panels[menu]}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <Drawer open={mobile} onClose={() => setMobile(false)} side="left" title="Menu">
        <MobileMenu nav={nav} />
      </Drawer>
      <SearchOverlay open={search} onClose={() => setSearch(false)} index={nav.searchIndex} />
    </>
  );
}

function Dot({ n }: { n: number }) {
  return <span className="absolute -top-1.5 -right-2 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-clay px-1 text-[10px] tracking-normal text-white">{n}</span>;
}

function NavItem({ href, label, onEnter, active }: { href: string; label: string; onEnter: () => void; active?: boolean }) {
  return (
    <li className="flex h-full items-center" onMouseEnter={onEnter} onFocus={onEnter}>
      <Link href={href} className={cn("group relative py-1.5 text-[11px] tracking-[0.2em] uppercase", active && "after:scale-x-100")}>
        {label}
        <span className={cn("absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-current transition-transform duration-500 group-hover:scale-x-100", active && "scale-x-100")} />
      </Link>
    </li>
  );
}

function MenuColumn({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div>
      <p className="eyebrow mb-5 !text-[10.5px] text-clay">{title}</p>
      <ul>
        {links.map((l) => (
          <li key={l.href + l.name}>
            <Link href={l.href} className="block font-serif text-[21px] leading-[1.9] font-normal transition-all duration-300 hover:pl-1.5 hover:italic">{l.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MenuTile({ name, href, image }: NavData["occasions"][number]) {
  return (
    <Link href={href} className="zoom-on-hover group relative block">
      <EditorialImage image={image} className="arch aspect-[4/5]" sizes="240px" />
      <span className="absolute inset-x-0 bottom-5 text-center text-[10.5px] tracking-[0.24em] text-white uppercase [text-shadow:0_1px_12px_rgba(0,0,0,.35)]">{name}</span>
    </Link>
  );
}

function MobileMenu({ nav }: { nav: NavData }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = [
    { id: "shop", label: "Shop", links: [{ name: "Shop all", href: "/shop" }, ...nav.categories] },
    { id: "occ", label: "Occasions", links: nav.occasions.map(({ name, href }) => ({ name, href })) },
    { id: "col", label: "Collections", links: nav.collections },
  ];
  return (
    <div className="px-7 pb-10">
      <ul>
        <li className="border-b border-line"><Link href="/new-arrivals" className="block py-5 font-serif text-[30px]">New in</Link></li>
        {groups.map((g) => (
          <li key={g.id} className="border-b border-line">
            <button className="flex w-full items-center justify-between py-5 font-serif text-[30px]" aria-expanded={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)}>
              {g.label}<span className={cn("text-2xl font-extralight transition-transform", open === g.id && "rotate-45")}>+</span>
            </button>
            <AnimatePresence initial={false}>
              {open === g.id && (
                <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.45, ease }} className="overflow-hidden">
                  {g.links.map((l) => <li key={l.href + l.name}><Link href={l.href} className="block py-2 pl-1 text-[13px] tracking-[0.14em] uppercase">{l.name}</Link></li>)}
                  <li className="h-4" />
                </motion.ul>
              )}
            </AnimatePresence>
          </li>
        ))}
        <li className="border-b border-line"><Link href="/our-story" className="block py-5 font-serif text-[30px]">Our story</Link></li>
        <li className="border-b border-line"><Link href="/wishlist" className="block py-5 font-serif text-[30px]">Wishlist</Link></li>
      </ul>
      <div className="mt-8"><MarketSwitcher /></div>
    </div>
  );
}
