import type { Metadata } from "next";
import Link from "next/link";
import { Accordion, Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { Emph } from "@/components/ui/typography";
import { site } from "@/config/site";
import { faqs, policies } from "@/content/policies";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Customer Care",
  description: "Contact Nargis & Shaz, delivery and returns information, order tracking and frequently asked questions.",
  path: "/customer-care",
});

const ship = policies.find((p) => p.slug === "shipping")!;
const returns = policies.find((p) => p.slug === "returns")!;

export default function CustomerCarePage() {
  return (
    <>
      <section className="gutter pt-8 pb-12 text-center">
        <div className="flex justify-center"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Customer care" }]} /></div>
        <p className="eyebrow mt-10 text-bronze">Here to help</p>
        <h1 className="display mt-3 text-[clamp(38px,4.6vw,66px)]"><Emph text="Customer *care*" /></h1>
        <nav aria-label="Sections" className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[11px] tracking-[0.2em] uppercase">
          {[["contact", "Contact"], ["shipping", "Shipping"], ["returns", "Returns"], ["faqs", "FAQs"], ["track", "Track an order"]].map(([id, l]) => <a key={id} href={`#${id}`} className="hairline">{l}</a>)}
        </nav>
      </section>
      <div className="gutter mx-auto max-w-[920px] space-y-20 pb-28">
        <section id="contact" className="scroll-mt-28">
          <h2 className="display text-[32px]">Contact us</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div><p className="eyebrow text-bronze">Email</p><a href={`mailto:${site.email}`} className="mt-2 block hover:text-bronze">{site.email}</a></div>
            <div><p className="eyebrow text-bronze">Telephone</p><a href={`tel:${site.phone.replace(/\s/g, "")}`} className="mt-2 block hover:text-bronze">{site.phone}</a><p className="text-[13px] text-taupe">Mon–Sat, 10:00–19:00 PKT</p></div>
            <div><p className="eyebrow text-bronze">Atelier</p><p className="mt-2">{site.address.street}<br />{site.address.city}</p><p className="text-[13px] text-taupe">By appointment</p></div>
          </div>
        </section>
        <section id="shipping" className="scroll-mt-28">
          <h2 className="display text-[32px]">Shipping &amp; delivery</h2>
          <div className="mt-6 space-y-5">{ship.sections.map((s) => <div key={s.heading}><h3 className="font-serif text-[19px]">{s.heading}</h3>{s.body.map((b) => <p key={b} className="mt-1.5 text-taupe">{b}</p>)}</div>)}</div>
          <Link href="/legal/shipping" className="ulink mt-6 inline-block">Full shipping policy</Link>
        </section>
        <section id="returns" className="scroll-mt-28">
          <h2 className="display text-[32px]">Returns &amp; exchanges</h2>
          <div className="mt-6 space-y-5">{returns.sections.map((s) => <div key={s.heading}><h3 className="font-serif text-[19px]">{s.heading}</h3>{s.body.map((b) => <p key={b} className="mt-1.5 text-taupe">{b}</p>)}</div>)}</div>
          <Link href="/legal/returns" className="ulink mt-6 inline-block">Full return policy</Link>
        </section>
        <section id="faqs" className="scroll-mt-28">
          <h2 className="display mb-6 text-[32px]">Frequently asked questions</h2>
          <Accordion defaultOpen={-1} items={faqs.map((f) => ({ title: f.q, content: <p>{f.a}</p> }))} />
        </section>
        <section id="track" className="scroll-mt-28 bg-linen p-[clamp(24px,4vw,48px)]">
          <h2 className="display text-[32px]">Track your order</h2>
          <p className="mt-3 max-w-[560px] text-taupe">Every order confirmation email includes your tracking link as soon as your parcel is dispatched. Can&apos;t find it? Email <a href={`mailto:${site.email}?subject=Order%20tracking`} className="underline underline-offset-4">{site.email}</a> with your order number (for example NS-10432) and we&apos;ll reply the same working day.</p>
        </section>
      </div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Customer care", path: "/customer-care" }])} />
    </>
  );
}
