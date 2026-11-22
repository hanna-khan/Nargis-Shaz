import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/store/account/forms";
import { Accordion, Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { Emph } from "@/components/ui/typography";
import { content } from "@/lib/repositories";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Customer Care",
  description: "Contact Nargis & Shaz, delivery and returns information, order tracking and frequently asked questions.",
  path: "/customer-care",
});

export default async function CustomerCarePage() {
  const [settings, ship, returns, faqDoc] = await Promise.all([content.settings(), content.policy("shipping"), content.policy("returns"), content.policy("faqs")]);
  const faqs = (faqDoc?.sections ?? []).map((s) => ({ q: s.heading, a: s.body.join(" ") }));
  return (
    <>
      <section className="gutter pt-8 pb-12 text-center">
        <div className="flex justify-center"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Customer care" }]} /></div>
        <p className="eyebrow mt-10 text-bronze">Here to help</p>
        <h1 className="display mt-3 text-[clamp(38px,4.6vw,66px)]"><Emph text="Customer *care*" /></h1>
        <nav aria-label="Sections" className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[11px] tracking-[0.2em] uppercase">
          {[["contact", "Contact"], ["delivery", "Delivery"], ["returns", "Returns"], ["faqs", "FAQs"], ["track", "Track an order"]].map(([id, l]) => <a key={id} href={`#${id}`} className="hairline">{l}</a>)}
        </nav>
      </section>
      <div className="gutter mx-auto max-w-[920px] space-y-20 pb-28">
        <section id="contact" className="scroll-mt-28">
          <h2 className="display text-[32px]">Contact us</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div><p className="eyebrow text-bronze">Email</p><a href={`mailto:${settings.supportEmail}`} className="mt-2 block hover:text-bronze">{settings.supportEmail}</a></div>
            <div><p className="eyebrow text-bronze">Telephone</p><a href={`tel:${settings.supportPhone.replace(/\s/g, "")}`} className="mt-2 block hover:text-bronze">{settings.supportPhone}</a></div>
            <div><p className="eyebrow text-bronze">Atelier</p><p className="mt-2 whitespace-pre-line">{settings.address}</p></div>
          </div>
          <h3 className="mt-12 mb-6 font-serif text-[22px]">Send us a message</h3>
          <ContactForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        </section>
        {ship && (
          <section id="delivery" className="scroll-mt-28">
            <h2 className="display text-[32px]">Shipping &amp; delivery</h2>
            <div className="mt-6 space-y-5">{ship.sections.map((s) => <div key={s.heading}><h3 className="font-serif text-[19px]">{s.heading}</h3>{s.body.map((b) => <p key={b} className="mt-1.5 text-taupe">{b}</p>)}</div>)}</div>
            <Link href="/legal/shipping" className="ulink mt-6 inline-block">Full shipping policy</Link>
          </section>
        )}
        {returns && (
          <section id="returns" className="scroll-mt-28">
            <h2 className="display text-[32px]">Returns &amp; exchanges</h2>
            <div className="mt-6 space-y-5">{returns.sections.map((s) => <div key={s.heading}><h3 className="font-serif text-[19px]">{s.heading}</h3>{s.body.map((b) => <p key={b} className="mt-1.5 text-taupe">{b}</p>)}</div>)}</div>
            <Link href="/legal/returns" className="ulink mt-6 inline-block">Full return policy</Link>
          </section>
        )}
        {faqs.length > 0 && (
          <section id="faqs" className="scroll-mt-28">
            <h2 className="display mb-6 text-[32px]">Frequently asked questions</h2>
            <Accordion defaultOpen={-1} items={faqs.map((f) => ({ title: f.q, content: <p>{f.a}</p> }))} />
          </section>
        )}
        <section id="track" className="scroll-mt-28 bg-linen p-[clamp(24px,4vw,48px)]">
          <h2 className="display text-[32px]">Track your order</h2>
          <p className="mt-3 max-w-[560px] text-taupe">Use your order number and email to see the latest status and tracking details. Signed-in customers can follow every order from their account.</p>
          <Link href="/track-order" className="mt-6 inline-flex min-h-12 items-center bg-chocolate px-8 text-[11px] tracking-[0.22em] text-offwhite uppercase">Track an order</Link>
        </section>
      </div>
      {faqs.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />}
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Customer care", path: "/customer-care" }])} />
    </>
  );
}
