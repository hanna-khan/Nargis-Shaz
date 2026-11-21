import Link from "next/link";
import { site } from "@/config/site";
import { MarketSwitcher } from "./market-switcher";
import type { NavData } from "./navigation-types";

export function SiteFooter({ nav }: { nav: NavData }) {
  const cols = [
    { title: "Shop", links: [{ name: "New arrivals", href: "/new-arrivals" }, ...nav.categories.slice(0, 6)] },
    { title: "Occasions", links: nav.occasions.map(({ name, href }) => ({ name, href })) },
    { title: "The house", links: [{ name: "Our story", href: "/our-story" }, { name: "Craft & ateliers", href: "/our-story#craft" }, ...nav.collections.slice(0, 2)] },
    { title: "Client care", links: [{ name: "Delivery & duties", href: "/our-story#care" }, { name: "Returns", href: "/our-story#care" }, { name: "Size guide", href: "/our-story#care" }, { name: "Contact us", href: `mailto:${site.email}` }] },
  ];
  return (
    <footer className="bg-charcoal px-[clamp(18px,3.2vw,48px)] pt-20 pb-9 text-ivory/80">
      <div className="grid gap-10 pb-16 md:grid-cols-[1.4fr_repeat(4,1fr)] max-md:grid-cols-2">
        <div className="max-md:col-span-2">
          <p className="font-serif text-[28px] tracking-[0.2em] text-ivory uppercase">Nargis<span className="mx-1 tracking-normal italic">&amp;</span>Shaz</p>
          <p className="mt-4 max-w-[300px] text-[14px] text-ivory/65">Considered clothing for working women, weekends and celebrations. Designed in Lahore, delivered worldwide.</p>
          <div className="mt-7 max-w-[300px] text-ivory [&_select]:border-ivory/25 [&_select]:text-ivory [&_option]:text-charcoal"><MarketSwitcher /></div>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-5 text-[10.5px] font-normal tracking-[0.26em] text-camel uppercase">{c.title}</h2>
            <ul>{c.links.map((l) => <li key={l.name}><Link href={l.href} className="text-[14px] leading-[2.1] hover:text-ivory hover:underline hover:underline-offset-4">{l.name}</Link></li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-3 border-t border-ivory/15 pt-7 text-[12px] tracking-[0.06em] text-ivory/55">
        <p>© {site.copyrightYear} {site.name}. All rights reserved.</p>
        <p>Privacy · Terms · Cookies · <a href={site.instagram} className="hover:text-ivory">Instagram</a></p>
      </div>
    </footer>
  );
}
