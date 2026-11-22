import Link from "next/link";
import { EditorialImage } from "@/components/media/editorial-image";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { Reveal } from "@/components/ui/reveal";
import { Emph } from "@/components/ui/typography";
import { Catalog, type CatalogScope } from "./product/catalog";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn, stripEmphasis } from "@/lib/utils";
import type { Collection, ProductImage } from "@/types";

interface Header { name: string; eyebrow: string; headline: string; description: string; hero?: ProductImage }

/**
 * Shared listing template: shop, categories, occasions, collections, new arrivals.
 * Breadcrumb → title & editorial description → optional banner → filters → grid.
 */
export function CollectionView({ collection, scope, searchParams, path, editorial, hideCategory, crumbs, siblings }: {
  collection: Header; scope: CatalogScope; searchParams: Promise<Record<string, string | string[] | undefined>>; path: string; editorial?: Collection; hideCategory?: boolean;
  crumbs?: { name: string; href?: string }[]; siblings?: { name: string; href: string; active?: boolean }[];
}) {
  const trail = crumbs ?? [{ name: "Home", href: "/" }, { name: stripEmphasis(collection.name) }];
  return (
    <>
      {collection.hero ? (
        <section className="relative grid min-h-[min(78vh,760px)] grid-cols-1 bg-espresso text-offwhite md:grid-cols-[1fr_1.15fr]">
          <div className="gutter relative z-10 flex flex-col justify-end pt-10 pb-[clamp(36px,5vw,72px)] max-md:order-2">
            <Breadcrumbs items={trail} tone="light" />
            <Reveal>
              <p className="eyebrow mt-8 text-bronze-light">{collection.eyebrow}</p>
              <h1 className="display mt-4 text-[clamp(40px,5vw,76px)]"><Emph text={collection.headline} /></h1>
              <p className="mt-5 max-w-[440px] text-[15px] text-offwhite/75">{collection.description}</p>
            </Reveal>
          </div>
          <div className="relative min-h-[56vh] overflow-hidden max-md:order-1">
            <EditorialImage image={collection.hero} className="absolute inset-0" imgClassName="animate-kenburns" priority sizes="(max-width:768px) 100vw, 55vw" position="center 30%" />
          </div>
        </section>
      ) : (
        <section className="gutter pt-8 pb-10 text-center">
          <div className="flex justify-center"><Breadcrumbs items={trail} /></div>
          <p className="eyebrow mt-10 text-bronze">{collection.eyebrow}</p>
          <h1 className="display mt-3 text-[clamp(38px,4.6vw,68px)]"><Emph text={collection.headline} /></h1>
          <p className="mx-auto mt-4 max-w-[520px] text-taupe">{collection.description}</p>
        </section>
      )}
      {siblings && siblings.length > 1 && (
        <nav aria-label="Categories" className="gutter no-scrollbar flex justify-center gap-7 overflow-x-auto py-5 max-md:justify-start">
          {siblings.map((s) => (
            <Link key={s.href} href={s.href} aria-current={s.active ? "page" : undefined} className={cn("hairline shrink-0 py-1 font-serif text-[16px] whitespace-nowrap", s.active ? "text-chocolate" : "text-taupe hover:text-chocolate")}>{s.name}</Link>
          ))}
        </nav>
      )}
      <Catalog scope={scope} searchParams={searchParams} editorial={editorial} hideCategory={hideCategory} />
      <JsonLd data={breadcrumbJsonLd(trail.map((t, i) => ({ name: t.name, path: t.href ?? (i === trail.length - 1 ? path : "/") })))} />
    </>
  );
}
