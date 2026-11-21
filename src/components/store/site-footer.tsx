import Link from "next/link";
import { Lockup } from "@/components/brand/logo";
import { site } from "@/config/site";
import { MarketSwitcher } from "./market-switcher";
import { NewsletterForm } from "./newsletter";
import type { NavData } from "./navigation-types";

export function SiteFooter({ nav }: { nav: NavData }) {
  const cols = [
    { title: "Customer care", links: [
      { name: "Contact us", href: "/customer-care#contact" },
      { name: "Shipping & delivery", href: "/customer-care#shipping" },
      { name: "Returns & exchanges", href: "/customer-care#returns" },
      { name: "FAQs", href: "/customer-care#faqs" },
      { name: "Track your order", href: "/customer-care#track" },
    ] },
    { title: "Explore", links: [
      { name: "New in", href: "/new-arrivals" },
      { name: "Workwear", href: "/workwear" },
      { name: "Everyday", href: "/everyday" },
      { name: "Dresses", href: "/shop/dresses" },
      { name: "Festive & Occasion", href: "/festive" },
      { name: "Our story", href: "/our-story" },
    ] },
    { title: "Information", links: [
      { name: "Privacy policy", href: "/legal/privacy" },
      { name: "Terms & conditions", href: "/legal/terms" },
      { name: "Shipping policy", href: "/legal/shipping" },
      { name: "Return policy", href: "/legal/returns" },
    ] },
  ];
  return (
    <footer className="bg-chocolate text-offwhite/80">
      <div className="gutter grid gap-12 pt-20 pb-14 lg:grid-cols-[1.1fr_repeat(3,0.7fr)_1.3fr]">
        <div className="text-offwhite max-lg:order-last max-lg:border-t max-lg:border-offwhite/12 max-lg:pt-12">
          <Lockup />
          <p className="mt-6 max-w-[280px] text-[13.5px] leading-relaxed text-offwhite/60">Designed in Lahore. Made in small ateliers. Delivered to Pakistan and around the world.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="eyebrow mb-5 text-bronze-light">{c.title}</h2>
            <ul className="space-y-2.5">
              {c.links.map((l) => <li key={l.name}><Link href={l.href} className="hairline text-[14px] text-offwhite/80 transition-colors hover:text-offwhite">{l.name}</Link></li>)}
            </ul>
          </nav>
        ))}
        <div>
          <h2 className="eyebrow mb-5 text-bronze-light">Stay connected</h2>
          <p className="mb-4 text-[14px] text-offwhite/70">New collections and private events, first.</p>
          <NewsletterForm tone="light" id="newsletter-footer" />
          <ul className="mt-6 flex gap-5 text-[11px] tracking-[0.2em] uppercase">
            {site.social.map((s) => <li key={s.name}><a href={s.url} target="_blank" rel="noopener noreferrer" className="hairline text-offwhite/80 hover:text-offwhite">{s.name}</a></li>)}
          </ul>
        </div>
      </div>
      <div className="gutter flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-offwhite/12 py-7 text-[12px] text-offwhite/55">
        <div className="w-full max-w-[260px] text-offwhite [&_option]:text-chocolate [&_select]:border-offwhite/25"><MarketSwitcher /></div>
        <p>{nav.paymentNote}</p>
        <p>© {site.copyrightYear} {site.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
