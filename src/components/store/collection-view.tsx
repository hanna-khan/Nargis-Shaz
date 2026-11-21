import { EditorialImage } from "@/components/media/editorial-image";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { Reveal } from "@/components/ui/reveal";
import { Display, Eyebrow } from "@/components/ui/typography";
import { Catalog } from "./product/catalog";
import { breadcrumbJsonLd } from "@/lib/seo";
import { stripEmphasis } from "@/lib/utils";
import type { Collection, Product } from "@/types";

/** Shared template for collections, occasions and curated listings. */
export function CollectionView({ collection, products, path, editorial, hideFacets }: { collection: Pick<Collection, "name" | "eyebrow" | "headline" | "description"> & { hero?: Collection["hero"] }; products: Product[]; path: string; editorial?: Collection; hideFacets?: ("category" | "occasion")[] }) {
  const crumbs = [{ name: "Home", path: "/" }, { name: collection.name, path }];
  return (
    <>
      {collection.hero ? (
        <section className="relative grid min-h-[72vh] place-items-center overflow-hidden text-center text-white">
          <EditorialImage image={collection.hero} className="absolute inset-0" priority sizes="100vw" />
          <div className="absolute inset-0 bg-charcoal/25" />
          <Reveal className="relative z-10 px-6 pt-24">
            <Eyebrow>{collection.eyebrow}</Eyebrow>
            <Display as="h1" size="hero" text={collection.headline} className="mx-auto mt-5 max-w-[980px] [text-shadow:0_2px_30px_rgba(0,0,0,.25)]" />
            <p className="mx-auto mt-6 max-w-[540px] text-[15.5px] opacity-95">{collection.description}</p>
          </Reveal>
        </section>
      ) : (
        <section className="px-6 pt-16 pb-12 text-center">
          <Eyebrow>{collection.eyebrow}</Eyebrow>
          <Display as="h1" size="xl" text={collection.headline} className="mt-4" />
          <p className="mx-auto mt-5 max-w-[540px] text-charcoal/65">{collection.description}</p>
        </section>
      )}
      <div className="px-[clamp(18px,3.2vw,48px)] py-5"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: stripEmphasis(collection.name) }]} /></div>
      <Catalog products={products} editorial={editorial} hideFacets={hideFacets} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
