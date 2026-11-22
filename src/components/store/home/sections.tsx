import Link from "next/link";
import type { ReactNode } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Emph } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { ProductCard } from "../product/product-card";
import type { CardProduct } from "../product/card-data";
import { RailControls } from "./rail-controls";
import { Drift, HorizontalSequence, ScrollText } from "./scroll-effects";
import type { HomepageContent, ProductImage } from "@/types";

function SectionHead({ eyebrow, title, link, id, children, align = "split" }: { eyebrow: string; title: string; link?: { label: string; href: string }; id: string; children?: ReactNode; align?: "split" | "center" }) {
  return (
    <div className={cn("gutter mb-[clamp(28px,3.4vw,48px)]", align === "split" ? "flex items-end justify-between gap-6" : "text-center")}>
      <Reveal>
        <p className="eyebrow text-bronze">{eyebrow}</p>
        <h2 id={id} className="display mt-3 text-[clamp(34px,4.2vw,60px)]"><Emph text={title} /></h2>
      </Reveal>
      {(link || children) && (
        <div className="flex shrink-0 items-center gap-7">
          {link && <Link href={link.href} className="ulink max-sm:hidden">{link.label}</Link>}
          {children}
        </div>
      )}
    </div>
  );
}

/* B. New arrivals — premium grid */
export function NewArrivals({ content, products, link = { label: "Discover all", href: "/new-arrivals" }, id = "new-title" }: { content: Pick<HomepageContent["newArrivals"], "eyebrow" | "title">; products: CardProduct[]; link?: { label: string; href: string } | null; id?: string }) {
  return (
    <section className="pt-[clamp(72px,9vw,140px)] pb-[clamp(56px,7vw,110px)]" aria-labelledby={id}>
      <SectionHead id={id} eyebrow={content.eyebrow} title={content.title} link={link ?? undefined} />
      <ul className="gutter grid grid-cols-2 gap-x-[clamp(8px,1.4vw,24px)] gap-y-12 max-md:gap-x-1.5 max-md:px-1.5 lg:grid-cols-4">
        {products.map((p) => <li key={p.id}><ProductCard product={p} sizes="(max-width:1024px) 50vw, 25vw" /></li>)}
      </ul>
      {link && <div className="mt-12 text-center sm:hidden"><Link href={link.href} className="ulink">{link.label}</Link></div>}
    </section>
  );
}

/* C. Shop by collection / category — editorial, staggered */
export function CategoryCards({ cards, eyebrow = "Dress for the day", title = "Shop by *occasion*" }: { cards: { title: string; href: string; image: ProductImage | null }[]; eyebrow?: string; title?: string }) {
  return (
    <section className="pb-[clamp(72px,9vw,140px)]" aria-labelledby="cat-title">
      <SectionHead id="cat-title" eyebrow={eyebrow} title={title} align="center" />
      <Stagger className="gutter grid grid-cols-2 gap-[clamp(8px,1.4vw,24px)] max-md:gap-1.5 max-md:px-1.5 lg:grid-cols-4" gap={0.12}>
        {cards.map((c, i) => (
          <StaggerItem key={c.href} className={cn(i % 2 === 1 && "lg:mt-20")}>
            <Link href={c.href} className="group relative block aspect-[3/4.3] overflow-hidden">
              <EditorialImage image={c.image} className="absolute inset-0" imgClassName="transition-transform duration-[1.8s] ease-[var(--ease-editorial)] group-hover:scale-[1.045]" sizes="(max-width:1024px) 50vw, 25vw" position="center 25%" />
              <span className="absolute inset-0 bg-gradient-to-t from-chocolate/60 via-transparent to-transparent" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-[clamp(14px,2vw,26px)] text-offwhite">
                <span className="font-serif text-[clamp(20px,2.2vw,32px)] leading-tight">{c.title}</span>
                <span aria-hidden className="mb-1.5 hidden h-px w-8 bg-current transition-all duration-500 group-hover:w-14 sm:block" />
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* D. Featured campaign — layered composition */
export function Campaign({ content, images }: { content: Omit<HomepageContent["campaign"], "imageIds" | "cta"> & { cta: { label: string; href: string } | null }; images: (ProductImage | null)[] }) {
  const [main, second, third] = images;
  return (
    <section className="bg-linen py-[clamp(72px,9vw,140px)]" aria-labelledby="campaign-title">
      <div className="gutter grid items-center gap-[clamp(28px,4vw,72px)] lg:grid-cols-12">
        <Reveal variant="curtain" className="lg:col-span-8">
          <Drift className="aspect-[3/2]" amount={40}>
            <EditorialImage image={main} className="h-full w-full" sizes="(max-width:1024px) 100vw, 66vw" />
          </Drift>
        </Reveal>
        <div className="lg:col-span-4">
          <Reveal>
            <p className="eyebrow text-bronze">{content.eyebrow}</p>
            <h2 id="campaign-title" className="display mt-4 text-[clamp(34px,3.8vw,58px)]"><Emph text={content.headline} /></h2>
            <p className="mt-5 max-w-[380px] text-taupe">{content.body}</p>
            {content.cta && <Link href={content.cta.href} className="mt-8 inline-flex min-h-12 items-center bg-chocolate px-8 text-[11px] tracking-[0.24em] text-offwhite uppercase transition-colors duration-500 hover:bg-espresso">{content.cta.label}</Link>}
          </Reveal>
          {(second || third) && (
            <div className="mt-12 grid grid-cols-2 gap-4">
              {second && <Reveal variant="curtain" delay={0.1}><EditorialImage image={second} className="aspect-[3/4]" sizes="(max-width:1024px) 50vw, 16vw" /></Reveal>}
              {third && <Reveal variant="curtain" delay={0.25} className="mt-10"><EditorialImage image={third} className="aspect-[3/4]" sizes="(max-width:1024px) 50vw, 16vw" /></Reveal>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* E. Bestsellers — data-driven rail */
export function Bestsellers({ content, products, link = { label: "Shop bestsellers", href: "/shop?sort=bestselling" }, id = "best" }: { content: Pick<HomepageContent["bestsellers"], "eyebrow" | "title">; products: CardProduct[]; link?: { label: string; href: string } | null; id?: string }) {
  return (
    <section className="py-[clamp(72px,9vw,140px)]" aria-labelledby={`${id}-title`}>
      <SectionHead id={`${id}-title`} eyebrow={content.eyebrow} title={content.title} link={link ?? undefined}>
        <RailControls target={`${id}-rail`} />
      </SectionHead>
      <ol id={`${id}-rail`} className="no-scrollbar flex snap-x snap-mandatory scroll-px-[clamp(18px,3.4vw,56px)] gap-[clamp(8px,1.4vw,24px)] overflow-x-auto px-[clamp(18px,3.4vw,56px)] pb-2">
        {products.map((p, i) => (
          <li key={p.id} className="relative w-[clamp(240px,27vw,400px)] shrink-0 snap-start">
            <span className="pointer-events-none absolute -top-1 left-0 z-10 -translate-y-full font-serif text-[13px] text-bronze">{String(i + 1).padStart(2, "0")}</span>
            <ProductCard product={p} sizes="(max-width:768px) 70vw, 27vw" />
          </li>
        ))}
      </ol>
    </section>
  );
}

/* G. Editorial composition — varied proportions, parallax, scroll-written text */
export function ArtOfDressing({ content, statement, images }: { content: Omit<HomepageContent["editorial"], "imageIds" | "cta"> & { cta: { label: string; href: string } | null }; statement?: string; images: (ProductImage | null)[] }) {
  const [tall, square, wide, small] = images;
  return (
    <section className="bg-chocolate py-[clamp(80px,10vw,160px)] text-offwhite" aria-labelledby="art-title">
      {statement && (
        <div className="gutter mb-[clamp(64px,8vw,128px)]">
          <ScrollText text={statement} className="display mx-auto max-w-[1100px] text-center text-[clamp(28px,3.6vw,54px)] leading-[1.18]" />
        </div>
      )}
      <div className="gutter grid grid-cols-12 gap-[clamp(10px,1.6vw,28px)]">
        <Reveal variant="curtain" className="col-span-7 md:col-span-5"><Drift className="aspect-[3/4.4]" amount={50}><EditorialImage image={tall} className="h-full w-full" sizes="(max-width:768px) 58vw, 42vw" /></Drift></Reveal>
        <div className="col-span-5 flex flex-col justify-end gap-[clamp(10px,1.6vw,28px)] md:col-span-3">
          <Reveal variant="curtain" delay={0.1}><EditorialImage image={square} className="aspect-square" sizes="(max-width:768px) 40vw, 25vw" /></Reveal>
          <Reveal className="hidden md:block" delay={0.2}>
            <p className="eyebrow text-bronze-light">{content.eyebrow}</p>
            <h2 id="art-title" className="display mt-3 text-[clamp(30px,2.6vw,42px)]"><Emph text={content.headline} /></h2>
          </Reveal>
        </div>
        <div className="col-span-12 flex flex-col gap-[clamp(10px,1.6vw,28px)] md:col-span-4 md:pt-[18%]">
          <Reveal variant="curtain" delay={0.15}><Drift className="aspect-[4/3]" amount={30}><EditorialImage image={wide} className="h-full w-full" sizes="(max-width:768px) 100vw, 33vw" position="center 35%" /></Drift></Reveal>
          <Reveal className="md:hidden"><p className="eyebrow text-bronze-light">{content.eyebrow}</p><h2 className="display mt-3 text-[32px]"><Emph text={content.headline} /></h2></Reveal>
          <Reveal delay={0.25}>
            <p className="max-w-[380px] text-offwhite/75">{content.body}</p>
            {content.cta && <Link href={content.cta.href} className="ulink mt-6 inline-block">{content.cta.label}</Link>}
          </Reveal>
          <Reveal variant="curtain" delay={0.3} className="ml-auto w-[62%]"><EditorialImage image={small} className="aspect-[3/4]" sizes="(max-width:768px) 60vw, 20vw" /></Reveal>
        </div>
      </div>
    </section>
  );
}

/* H. A closer look at the details */
export function Details({ content, images }: { content: HomepageContent["details"]; images: (ProductImage | null)[] }) {
  return (
    <section className="py-[clamp(72px,9vw,140px)]" aria-labelledby="details-title">
      <SectionHead id="details-title" eyebrow={content.eyebrow} title={content.headline} align="center" />
      <Stagger className="gutter grid gap-[clamp(20px,2.4vw,40px)] md:grid-cols-3" gap={0.15}>
        {content.items.map((it, i) => (
          <StaggerItem key={it.title}>
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden"><EditorialImage image={images[i]} className="absolute inset-0" sizes="(max-width:768px) 100vw, 33vw" /></div>
              <figcaption className="mt-5">
                <p className="font-serif text-[22px]">{it.title}</p>
                <p className="mt-1.5 max-w-[340px] text-[14px] text-taupe">{it.body}</p>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* I. Discover our collections — pinned horizontal sequence */
export function CollectionsSequence({ items, eyebrow = "The Nargis & Shaz edit", title = "Discover our *collections*" }: { items: { title: string; eyebrow: string; href: string; image: ProductImage; blurb: string }[]; eyebrow?: string; title?: string }) {
  return (
    <HorizontalSequence intro={<Reveal><p className="eyebrow text-bronze">{eyebrow}</p><h2 className="display mt-3 text-[clamp(34px,4.2vw,60px)]"><Emph text={title} /></h2></Reveal>}>
      {items.map((c, i) => (
        <Link key={c.href} href={c.href} className={cn("group block shrink-0 snap-start", i % 2 ? "w-[min(70vw,360px)] lg:mt-16 lg:w-[34vh]" : "w-[min(78vw,440px)] lg:w-[42vh]")}>
          <div className={cn("relative overflow-hidden", i % 2 ? "aspect-[3/4]" : "aspect-[4/5]")}>
            <EditorialImage image={c.image} className="absolute inset-0" imgClassName="transition-transform duration-[1.8s] ease-[var(--ease-editorial)] group-hover:scale-[1.04]" sizes="(max-width:768px) 78vw, 520px" position="center 30%" />
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-4">
            <div><p className="eyebrow text-taupe">{c.eyebrow}</p><p className="mt-1 font-serif text-[clamp(22px,2vw,30px)]">{c.title}</p></div>
            <span className="ulink shrink-0">Discover</span>
          </div>
          <p className="mt-2 max-w-[400px] text-[13.5px] text-taupe">{c.blurb}</p>
        </Link>
      ))}
    </HorizontalSequence>
  );
}

/* F. Brand story */
export function StoryBand({ content, image, quote, cta = { label: "Discover the house", href: "/our-story" } }: { content: HomepageContent["story"]; image: ProductImage | null; quote?: HomepageContent["quote"] | null; cta?: { label: string; href: string } | null }) {
  return (
    <section className="grid bg-espresso text-offwhite md:grid-cols-2" aria-labelledby="story-title">
      <Drift className="min-h-[70vh] max-md:aspect-[4/5] max-md:min-h-0" amount={50}><EditorialImage image={image} className="h-full w-full" sizes="(max-width:768px) 100vw, 50vw" /></Drift>
      <div className="flex flex-col justify-center px-[clamp(24px,7vw,120px)] py-[clamp(64px,8vw,120px)]">
        <Reveal>
          <p className="eyebrow text-bronze-light">{content.eyebrow}</p>
          <h2 id="story-title" className="display mt-5 text-[clamp(34px,3.8vw,58px)]"><Emph text={content.headline} /></h2>
          <p className="mt-6 max-w-[460px] text-offwhite/75">{content.body}</p>
          {cta && <Link href={cta.href} className="mt-9 inline-flex min-h-12 items-center border border-offwhite/70 px-8 text-[11px] tracking-[0.24em] uppercase transition-colors duration-500 hover:bg-offwhite hover:text-chocolate">{cta.label}</Link>}
          {quote && (
            <blockquote className="mt-14 border-t border-offwhite/15 pt-8">
              <p className="font-serif text-[clamp(20px,1.8vw,26px)] leading-snug italic">“{quote.text}”</p>
              {quote.attribution && <footer className="eyebrow mt-4 text-offwhite/60">— {quote.attribution}</footer>}
            </blockquote>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/* Standalone statement band (when not paired with an editorial composition) */
export function StatementBand({ eyebrow, text }: { eyebrow: string; text: string }) {
  return (
    <section className="bg-chocolate py-[clamp(72px,9vw,140px)] text-offwhite">
      <div className="gutter text-center">
        {eyebrow && <p className="eyebrow mb-6 text-bronze-light">{eyebrow}</p>}
        <ScrollText text={text} className="display mx-auto max-w-[1100px] text-[clamp(28px,3.6vw,54px)] leading-[1.18]" />
      </div>
    </section>
  );
}

/* Standalone quote */
export function QuoteBand({ text, attribution }: { text: string; attribution: string }) {
  return (
    <section className="gutter py-[clamp(64px,8vw,120px)] text-center">
      <Reveal>
        <blockquote className="mx-auto max-w-[900px]">
          <p className="font-serif text-[clamp(24px,2.6vw,38px)] leading-snug italic">“{text}”</p>
          {attribution && <footer className="eyebrow mt-6 text-taupe">— {attribution}</footer>}
        </blockquote>
      </Reveal>
    </section>
  );
}

/* Promotional banner */
export function PromoBanner({ eyebrow, heading, body, cta, image }: { eyebrow: string; heading: string; body: string; cta: { label: string; href: string } | null; image: ProductImage | null }) {
  return (
    <section className="relative isolate overflow-hidden bg-espresso text-offwhite">
      {image && <EditorialImage image={image} className="absolute inset-0 -z-10 opacity-60" sizes="100vw" />}
      <div className="gutter py-[clamp(72px,9vw,140px)] text-center">
        <Reveal>
          {eyebrow && <p className="eyebrow text-bronze-light">{eyebrow}</p>}
          <h2 className="display mt-4 text-[clamp(34px,4.4vw,64px)]"><Emph text={heading} /></h2>
          {body && <p className="mx-auto mt-5 max-w-[520px] text-offwhite/80">{body}</p>}
          {cta && <Link href={cta.href} className="mt-9 inline-flex min-h-12 items-center border border-offwhite px-8 text-[11px] tracking-[0.24em] uppercase transition-colors duration-500 hover:bg-offwhite hover:text-chocolate">{cta.label}</Link>}
        </Reveal>
      </div>
    </section>
  );
}
