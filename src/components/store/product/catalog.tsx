import Link from "next/link";
import { Suspense } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Display, Eyebrow } from "@/components/ui/typography";
import { catalog } from "@/lib/repositories";
import { baseColour } from "@/lib/services/catalog-filter";
import { ProductCard } from "./product-card";
import { CatalogBrowser, StaticCardGrid, type CardFacts, type FacetOptions } from "./catalog-browser";
import type { Collection, Product } from "@/types";

const OCCASIONS: FacetOptions["occasions"] = [
  { id: "workwear", name: "Workwear" }, { id: "everyday", name: "Everyday" }, { id: "evening", name: "Evening" }, { id: "festive", name: "Festive" },
];

/** Server component: renders every card on the server, then hands them to the client browser for filtering. */
export async function Catalog({ products, editorial, hideFacets }: { products: Product[]; editorial?: Collection; hideFacets?: ("category" | "occasion")[] }) {
  const categories = await catalog.listCategories();
  const cards = Object.fromEntries(products.map((p, i) => [p.id, <ProductCard key={p.id} product={p} priority={i < 4} />]));
  const facts: CardFacts[] = products.map((p) => ({
    id: p.id, categoryId: p.categoryId, occasionIds: p.occasionIds, isNew: p.isNew, createdAt: p.createdAt, prices: p.prices,
    colours: [...new Set(p.colours.map((c) => baseColour(c.name)))],
    sizes: [...new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size))],
    text: p.name,
  }));
  const colourMap = new Map<string, string>();
  products.forEach((p) => p.colours.forEach((c) => colourMap.set(baseColour(c.name), c.hex)));
  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "36", "37", "38", "39", "40", "41", "One size"];
  const facets: FacetOptions = {
    categories: categories.filter((c) => products.some((p) => p.categoryId === c.id)).map((c) => ({ id: c.id, name: c.name })),
    occasions: OCCASIONS.filter((o) => products.some((p) => p.occasionIds.includes(o.id))),
    colours: [...colourMap].map(([name, hex]) => ({ name, hex })),
    sizes: sizeOrder.filter((s) => facts.some((f) => f.sizes.includes(s))),
  };
  const tile = editorial ? <EditorialTile collection={editorial} /> : undefined;
  const ids = products.map((p) => p.id);
  return (
    <Suspense fallback={<StaticCardGrid ids={ids} cards={cards} editorial={tile} />}>
      <CatalogBrowser facts={facts} cards={cards} facets={facets} editorial={tile} hideFacets={hideFacets} />
    </Suspense>
  );
}

export function EditorialTile({ collection: c }: { collection: Collection }) {
  return (
    <Link href={c.occasionId ? `/${c.occasionId}` : `/collections/${c.slug}`} className="zoom-on-hover relative block h-full min-h-[420px]">
      <EditorialImage image={c.hero} className="absolute inset-0" sizes="50vw" />
      <div className="absolute inset-x-0 bottom-10 z-10 px-6 text-center text-white [text-shadow:0_2px_22px_rgba(0,0,0,.35)]">
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <Display as="p" size="md" text={c.headline} className="mx-auto mt-3 mb-5 max-w-[420px]" />
        <span className="ulink">Discover</span>
      </div>
    </Link>
  );
}
