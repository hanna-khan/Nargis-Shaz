import type { Metadata } from "next";
import { EditorialImage } from "@/components/media/editorial-image";
import { Quote } from "@/components/store/home/sections";
import { Newsletter } from "@/components/store/newsletter";
import { SilkBackdrop } from "@/components/store/silk/silk-backdrop";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/ui/misc";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Display, Eyebrow } from "@/components/ui/typography";
import { catalog } from "@/lib/repositories";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Our Story",
  description: "Nargis & Shaz began in Lahore with one idea: clothing that understands how women really live. Natural fibres, artisan ateliers and pieces designed to last.",
  path: "/our-story",
  type: "article",
});

export default async function OurStoryPage() {
  const products = await catalog.listProducts();
  const img = (slug: string, c = 0, v = 2) => products.find((p) => p.slug === slug)!.colours[c].images[v];
  return (
    <>
      <section className="relative grid h-[88vh] min-h-[560px] place-items-center overflow-hidden bg-cocoa text-center text-ivory">
        <SilkBackdrop palette={["#2e231c", "#655044", "#e7d3b5"]} gradient="radial-gradient(120% 90% at 30% 20%, #9A8069, #655044 60%, #292722)" />
        <div className="relative z-10 px-6 pt-16">
          <Eyebrow>Our story</Eyebrow>
          <Display as="h1" size="hero" text="Two names, one *idea*" className="mt-5" />
        </div>
      </section>

      <Reveal as="section" className="mx-auto max-w-[900px] px-6 py-[clamp(80px,10vw,150px)] text-center">
        <p className="font-serif text-[clamp(22px,2.2vw,30px)] leading-[1.4]">Nargis &amp; Shaz began at a kitchen table in Lahore, with a simple frustration: beautiful clothes rarely understood how women actually live.</p>
        <p className="mt-6 text-charcoal/70">They move between boardrooms and family tables, from early flights to late dinners, from everyday errands to the biggest celebrations of the year. We design for all of it — clothing that is easy to wear, effortless to style, and made to be loved for a very long time.</p>
      </Reveal>

      <Stagger className="grid gap-[clamp(20px,3vw,50px)] px-[clamp(18px,3.2vw,48px)] pb-[clamp(80px,10vw,140px)] md:grid-cols-3">
        {[
          { id: "values", title: "Natural, always", text: "Silk, cashmere, cotton and linen from mills we know by name. We avoid fabrics that will not age well.", image: img("aaliya-silk-blouse") },
          { id: "craft", title: "Made by hand", text: "Our embroidery and finishing are done by artisans in small ateliers across Punjab, paid fairly and credited by name.", image: img("gul-embroidered-dress", 0, 0) },
          { id: "last", title: "Designed to last", text: "Timeless shapes, generous seams and repairs for life. The best piece is the one you keep.", image: img("zainab-wrap-coat") },
        ].map((v) => (
          <StaggerItem key={v.id}>
            <article id={v.id} className="scroll-mt-28">
              <EditorialImage image={v.image} className="mb-6 aspect-[4/5]" sizes="33vw" />
              <h2 className="mb-2 font-serif text-[32px] font-normal">{v.title}</h2>
              <p className="text-charcoal/65">{v.text}</p>
            </article>
          </StaggerItem>
        ))}
      </Stagger>

      <section className="grid gap-8 px-[clamp(18px,3.2vw,48px)] pb-[clamp(80px,10vw,140px)] md:grid-cols-4" aria-label="Our history">
        {[["2016", "A first capsule of twelve pieces, made in a single Lahore atelier."], ["2019", "The Working Edit launches and becomes our best-loved collection."], ["2022", "Jashn, our festive line, is born with artisan partners."], ["2026", "International delivery to the UK, Europe, North America and the Gulf."]].map(([y, t]) => (
          <Reveal key={y} className="border-t border-charcoal pt-5">
            <p className="mb-2 font-serif text-[50px] leading-none font-light text-clay">{y}</p>
            <p className="text-charcoal/65">{t}</p>
          </Reveal>
        ))}
      </section>

      <section id="care" className="scroll-mt-28 bg-beige/55 px-[clamp(18px,3.2vw,48px)] py-[clamp(70px,9vw,120px)]">
        <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-3">
          {[
            ["Delivery & duties", "Pakistan: 2–4 working days with cash on delivery. UK & EU: duties and VAT paid, 5–9 days. USA & rest of world: tracked delivery, import duties may be collected by the carrier."],
            ["Returns", "Return unworn pieces within 30 days. Returns are free within Pakistan; international returns are refunded to the original payment method."],
            ["Size guide", "XS (UK 6 · EU 34) · S (UK 8 · EU 36) · M (UK 10 · EU 38) · L (UK 12 · EU 40) · XL (UK 14 · EU 42) · XXL (UK 16 · EU 44)."],
          ].map(([t, b]) => <div key={t}><h2 className="eyebrow mb-3">{t}</h2><p className="text-[14px] text-charcoal/75">{b}</p></div>)}
        </div>
      </section>

      <Quote text="Dress as though you have somewhere beautiful to be." attribution="Nargis & Shaz" />
      <div className="flex justify-center bg-blush pb-20"><ButtonLink href="/new-arrivals">Shop new arrivals</ButtonLink></div>
      <Newsletter />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Our story", path: "/our-story" }])} />
    </>
  );
}
