import Link from "next/link";
import type { ReactNode } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { ButtonLink } from "@/components/ui/button";
import { Parallax, Tilt } from "@/components/ui/parallax";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Container, Display, Emph, Eyebrow } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { RailControls } from "./rail-controls";
import type { Collection, ProductImage } from "@/types";

export function CategoryTiles({ tiles }: { tiles: { label: string; href: string; image: ProductImage }[] }) {
  return (
    <section aria-label="Shop by category">
      <Stagger className="grid grid-cols-5 max-lg:grid-cols-3 max-md:grid-cols-2" gap={0.08}>
        {tiles.map((t) => (
          <StaggerItem key={t.label} variant="curtain">
            <Link href={t.href} className="zoom-on-hover group relative block aspect-[3/4.1] overflow-hidden max-md:aspect-[3/4.4]">
              <EditorialImage image={t.image} className="absolute inset-0" sizes="(max-width:768px) 50vw, 20vw" />
              <span className="absolute inset-0 z-10 bg-gradient-to-b from-transparent from-55% to-charcoal/30" />
              <span className="absolute inset-0 z-10 grid place-items-center font-serif text-[clamp(17px,1.8vw,26px)] tracking-[0.2em] text-white uppercase transition-[letter-spacing] duration-700 [text-shadow:0_2px_24px_rgba(0,0,0,.35)] group-hover:tracking-[0.3em]">{t.label}</span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function Statement({ eyebrow, text, link }: { eyebrow: string; text: string; link: { label: string; href: string } }) {
  return (
    <Container as="section" className="py-[clamp(80px,11vw,160px)]">
      <Reveal className="mx-auto max-w-[1040px] text-center">
        <Eyebrow>{eyebrow}</Eyebrow>
        <p className="display my-7 text-[clamp(32px,4.6vw,68px)]"><Emph text={text} emClassName="text-clay" /></p>
        <Link href={link.href} className="ulink">{link.label}</Link>
      </Reveal>
    </Container>
  );
}

export function ProductRail({ id, eyebrow, title, link, children }: { id: string; eyebrow: string; title: string; link: { label: string; href: string }; children: ReactNode }) {
  return (
    <section className="pb-[clamp(70px,9vw,130px)]" aria-labelledby={`${id}-title`}>
      <Container className="mb-10 flex items-end justify-between gap-6">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Display as="h2" size="xl" text={title} className="mt-3" />
        </Reveal>
        <div className="flex items-center gap-7">
          <Link href={link.href} className="ulink max-sm:hidden">{link.label}</Link>
          <RailControls target={id} />
        </div>
      </Container>
      <ul id={id} className="no-scrollbar flex snap-x snap-mandatory scroll-px-[clamp(18px,3.2vw,48px)] gap-[clamp(14px,1.6vw,26px)] overflow-x-auto px-[clamp(18px,3.2vw,48px)] pb-4 [&>li]:w-[clamp(240px,24vw,360px)] [&>li]:shrink-0 [&>li]:snap-start">
        {children}
      </ul>
    </section>
  );
}

export function SplitFeature({ collection, reverse, tint, cta }: { collection: Collection; reverse?: boolean; tint?: boolean; cta: string }) {
  const href = collection.occasionId ? `/${collection.occasionId}` : `/collections/${collection.slug}`;
  return (
    <section className={cn("grid min-h-[92vh] md:grid-cols-2", tint && "bg-beige/55")} aria-labelledby={`sf-${collection.id}`}>
      <Parallax className={cn("max-md:aspect-[4/5]", reverse && "md:order-2")} strength={50}>
        <EditorialImage image={collection.hero} className="h-full w-full" sizes="(max-width:768px) 100vw, 50vw" />
      </Parallax>
      <Reveal className="flex flex-col justify-center p-[clamp(40px,8vw,120px)]">
        <Eyebrow>{collection.eyebrow}</Eyebrow>
        <Display as="h2" size="xl" text={collection.headline} className="mt-6 mb-7" />
        <p className="mb-10 max-w-[430px] text-charcoal/75" id={`sf-${collection.id}`}>{collection.description}</p>
        <div><ButtonLink href={href} variant={reverse ? "outline" : "solid"}>{cta}</ButtonLink></div>
      </Reveal>
    </section>
  );
}

export function OccasionArches({ items }: { items: Collection[] }) {
  return (
    <section className="py-[clamp(80px,10vw,150px)]" aria-labelledby="occ-title">
      <Reveal className="mb-14 text-center">
        <Eyebrow>Dress for the day</Eyebrow>
        <Display as="h2" size="xl" text="Every *occasion*, considered" className="mt-3" />
      </Reveal>
      <Stagger className="grid grid-cols-3 gap-[clamp(14px,2vw,30px)] px-[clamp(18px,3.2vw,48px)] max-md:grid-cols-2" gap={0.14}>
        {items.map((c, i) => (
          <StaggerItem key={c.id} className={cn(i === 1 && "md:mt-16", i === 2 && "max-md:col-span-2")}>
            <Link href={`/${c.occasionId}`} className="zoom-on-hover group block">
              <EditorialImage image={c.hero} className={cn("arch aspect-[3/4.4]", i === 2 && "max-md:aspect-[4/3]")} sizes="(max-width:768px) 50vw, 33vw" />
              <h3 className="mt-5 font-serif text-[clamp(28px,3vw,44px)] leading-tight">{c.name}</h3>
              <p className="mt-1 max-w-[320px] text-[13.5px] text-charcoal/60">{c.description.split(".")[0]}.</p>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function StoryBand({ eyebrow, headline, body, image }: { eyebrow: string; headline: string; body: string; image: ProductImage }) {
  return (
    <section className="bg-cocoa text-ivory" aria-labelledby="story-band">
      <div className="grid items-center gap-[clamp(30px,6vw,110px)] px-[clamp(18px,3.2vw,48px)] py-[clamp(80px,11vw,170px)] md:grid-cols-[5fr_6fr]">
        <Reveal>
          <Eyebrow className="opacity-70">{eyebrow}</Eyebrow>
          <h2 id="story-band" className="display mt-5 text-[clamp(34px,4.4vw,66px)]"><Emph text={headline} emClassName="text-camel" /></h2>
          <p className="mt-6 mb-9 max-w-[460px] opacity-85">{body}</p>
          <ButtonLink href="/our-story" variant="light">Discover the house</ButtonLink>
          <dl className="mt-14 grid grid-cols-3 gap-5 border-t border-ivory/20 pt-7">
            {[["12", "Partner ateliers"], ["78%", "Natural fibres"], ["30", "Day returns"]].map(([n, l]) => (
              <div key={l}><dt className="sr-only">{l}</dt><dd className="font-serif text-[44px] leading-none font-light">{n}</dd><dd className="mt-2 text-[10.5px] tracking-[0.22em] uppercase opacity-70">{l}</dd></div>
            ))}
          </dl>
        </Reveal>
        <Tilt><EditorialImage image={image} className="arch aspect-[4/5]" sizes="(max-width:768px) 100vw, 50vw" /></Tilt>
      </div>
    </section>
  );
}

export function Quote({ text, attribution }: { text: string; attribution: string }) {
  return (
    <section className="bg-blush px-[clamp(18px,3.2vw,48px)] py-[clamp(70px,9vw,140px)] text-center">
      <Reveal>
        <blockquote className="mx-auto mb-7 max-w-[960px] font-serif text-[clamp(28px,4vw,56px)] leading-[1.15] font-light italic">“{text}”</blockquote>
        <p className="eyebrow">{attribution}</p>
      </Reveal>
    </section>
  );
}

export function Services({ items }: { items: { title: string; text: string }[] }) {
  return (
    <section aria-label="Client services" className="grid grid-cols-4 border-y border-line max-md:grid-cols-2">
      {items.map((s) => (
        <div key={s.title} className="border-line px-6 py-9 text-center not-last:border-r max-md:nth-2:border-r-0 max-md:nth-[-n+2]:border-b">
          <h3 className="mb-1.5 text-[11px] font-normal tracking-[0.22em] uppercase">{s.title}</h3>
          <p className="text-[13px] text-charcoal/60">{s.text}</p>
        </div>
      ))}
    </section>
  );
}
