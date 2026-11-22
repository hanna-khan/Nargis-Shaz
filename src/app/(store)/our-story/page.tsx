import type { Metadata } from "next";
import Link from "next/link";
import { Monogram } from "@/components/brand/logo";
import { EditorialImage } from "@/components/media/editorial-image";
import { Drift, ScrollText } from "@/components/store/home/scroll-effects";
import { Newsletter } from "@/components/store/newsletter";
import { JsonLd } from "@/components/ui/misc";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Emph } from "@/components/ui/typography";
import { campaign, shoots } from "@/data/photography";
import { breadcrumbJsonLd, ogImage, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Our Story",
  description: "Nargis & Shaz is a Lahore designer label making considered clothing for working women and their celebrations: natural fibres, artisan ateliers and pieces designed to last.",
  path: "/our-story",
  type: "article",
  image: ogImage(campaign.fields.src),
});

export default function OurStoryPage() {
  return (
    <>
      <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-espresso text-offwhite">
        <EditorialImage image={campaign.fields} className="absolute inset-0 -z-10" imgClassName="animate-kenburns" priority sizes="100vw" position="center 40%" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-chocolate/75 via-chocolate/20 to-chocolate/30" />
        <div className="gutter w-full pb-[clamp(48px,7vw,100px)] [&>*]:animate-rise">
          <p className="eyebrow">Our story</p>
          <h1 className="display mt-5 max-w-[900px] text-[clamp(46px,7vw,108px)]"><Emph text="Two names, one *idea*" /></h1>
        </div>
      </section>

      <section className="gutter py-[clamp(80px,10vw,160px)]">
        <ScrollText className="display mx-auto max-w-[1080px] text-center text-[clamp(26px,3.2vw,48px)] leading-[1.2]" text="Nargis & Shaz began at a kitchen table in Lahore with a simple frustration: beautiful clothes rarely understood how *women actually live* — between boardrooms and family tables, early flights and *late celebrations*." />
      </section>

      <section className="grid bg-linen md:grid-cols-2">
        <Drift className="min-h-[72vh] max-md:aspect-[4/5] max-md:min-h-0" amount={50}><EditorialImage image={shoots.trench[1]} className="h-full w-full" sizes="(max-width:768px) 100vw, 50vw" /></Drift>
        <Reveal className="flex flex-col justify-center px-[clamp(24px,7vw,120px)] py-[clamp(56px,7vw,110px)]">
          <p className="eyebrow text-bronze">The house</p>
          <h2 className="display mt-4 text-[clamp(32px,3.4vw,52px)]"><Emph text="A wardrobe that works *as hard as you do*" /></h2>
          <p className="mt-6 max-w-[460px] text-taupe">We design for all of it: tailoring with ease in the shoulder, dresses that move, knitwear you will live in — and festive pieces finished by hand. Every collection is small, every pattern is fitted on real women, and every piece is made to be worn for years rather than a season.</p>
        </Reveal>
      </section>

      <section id="values" className="gutter scroll-mt-28 py-[clamp(80px,10vw,150px)]" aria-labelledby="values-title">
        <Reveal className="mb-14 text-center"><p className="eyebrow text-bronze">What we believe</p><h2 id="values-title" className="display mt-3 text-[clamp(34px,4vw,58px)]"><Emph text="Made to be *worn*" /></h2></Reveal>
        <Stagger className="grid gap-[clamp(20px,3vw,48px)] md:grid-cols-3" gap={0.15}>
          {[
            { id: "fibres", title: "Natural, always", text: "Organic cotton, washed linen, merino and raw silk from mills we know by name. We avoid fabrics that will not age well.", image: shoots.linenBlouse[0] },
            { id: "craft", title: "Made by hand", text: "Our embroidery is worked by master karigars in small ateliers across Punjab — paid fairly and credited by name.", image: shoots.lehenga[2] },
            { id: "last", title: "Designed to last", text: "Generous seams, considered construction and complimentary alterations. The best piece is the one you keep.", image: shoots.turtleneck[1] },
          ].map((v, i) => (
            <StaggerItem key={v.id} className={i === 1 ? "md:mt-16" : undefined}>
              <article id={v.id} className="scroll-mt-28">
                <div className="relative aspect-[3/4] overflow-hidden"><EditorialImage image={v.image} className="absolute inset-0" sizes="(max-width:768px) 100vw, 33vw" /></div>
                <h3 className="mt-6 font-serif text-[26px]">{v.title}</h3>
                <p className="mt-2 text-taupe">{v.text}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="bg-chocolate py-[clamp(80px,10vw,150px)] text-offwhite" aria-labelledby="atelier-title">
        <div className="gutter grid items-center gap-[clamp(32px,6vw,100px)] md:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <Monogram className="h-16 text-bronze-light" />
            <p className="eyebrow mt-8 text-bronze-light">The atelier</p>
            <h2 id="atelier-title" className="display mt-4 text-[clamp(32px,3.6vw,54px)]"><Emph text="Gold thread, *patience* and pride" /></h2>
            <p className="mt-6 max-w-[460px] text-offwhite/75">Our festive and bridal pieces are made to measure in Lahore. A single lehenga can take a team of karigars more than three hundred hours — every zari stitch placed by hand.</p>
            <Link href="/festive" className="mt-9 inline-flex min-h-12 items-center border border-offwhite/70 px-8 text-[11px] tracking-[0.24em] uppercase transition-colors duration-500 hover:bg-offwhite hover:text-chocolate">Discover festive &amp; occasion</Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            <Reveal variant="curtain"><EditorialImage image={shoots.bridal[1]} className="aspect-[3/4]" sizes="(max-width:768px) 50vw, 25vw" /></Reveal>
            <Reveal variant="curtain" delay={0.15} className="mt-16"><EditorialImage image={shoots.lehenga[1]} className="aspect-[3/4]" sizes="(max-width:768px) 50vw, 25vw" /></Reveal>
          </div>
        </div>
      </section>

      <section className="gutter grid gap-8 py-[clamp(80px,10vw,140px)] md:grid-cols-4" aria-label="Our history">
        {[["2016", "A first capsule of twelve pieces, made in a single Lahore atelier."], ["2019", "The Working Edit launches and becomes our best-loved collection."], ["2022", "Jashn, our festive line, is born with artisan partners."], ["2026", "Delivery to the UK, Europe, North America and the Gulf."]].map(([y, t], i) => (
          <Reveal key={y} delay={i * 0.08} className="border-t border-chocolate pt-5">
            <p className="font-serif text-[46px] leading-none text-bronze">{y}</p>
            <p className="mt-3 text-taupe">{t}</p>
          </Reveal>
        ))}
      </section>
      <Newsletter />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Our story", path: "/our-story" }])} />
    </>
  );
}
