import Link from "next/link";
import { Suspense } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Emph } from "@/components/ui/typography";
import { catalog } from "@/lib/repositories";
import { baseColour } from "@/lib/services/catalog-filter";
import { toCard } from "./card-data";
import { CatalogBrowser, StaticGrid, type CatalogItem, type FacetOptions } from "./catalog-browser";
import type { Collection, Product } from "@/types";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

/** Server component: prepares card data + facets from the repository; the client browser filters. */
export async function Catalog({ products, editorial, hideCategory }: { products: Product[]; editorial?: Collection; hideCategory?: boolean }) {
  const categories = await catalog.listCategories();
  const items: CatalogItem[] = products.map((p) => ({
    card: toCard(p),
    categoryId: p.categoryId,
    colours: [...new Set(p.colours.map((c) => baseColour(c.name)))],
    sizesInStock: [...new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size))],
    inStock: p.variants.some((v) => v.stock > 0),
    createdAt: p.createdAt,
    unitsSold: p.stats?.unitsSold30d ?? 0,
  }));
  const colourMap = new Map<string, string>();
  products.forEach((p) => p.colours.forEach((c) => colourMap.set(baseColour(c.name), c.hex)));
  const facets: FacetOptions = {
    categories: categories.filter((c) => products.some((p) => p.categoryId === c.id)).map((c) => ({ id: c.id, name: c.name })),
    colours: [...colourMap].map(([name, hex]) => ({ name, hex })),
    sizes: SIZE_ORDER.filter((s) => items.some((it) => it.sizesInStock.includes(s))),
  };
  const tile = editorial ? <EditorialTile collection={editorial} /> : undefined;
  return (
    <Suspense fallback={<StaticGrid items={items} />}>
      <CatalogBrowser items={items} facets={facets} hideCategory={hideCategory} editorial={tile} />
    </Suspense>
  );
}

/** Editorial break inside product grids. */
export function EditorialTile({ collection: c }: { collection: Collection }) {
  return (
    <Link href={c.occasionId ? `/${c.occasionId}` : `/collections/${c.slug}`} className="group relative block h-full min-h-[460px] overflow-hidden">
      <EditorialImage image={c.hero} className="absolute inset-0" imgClassName="transition-transform duration-[1.6s] ease-[var(--ease-editorial)] group-hover:scale-[1.03]" sizes="(max-width:768px) 100vw, 50vw" position="center 30%" />
      <span className="absolute inset-0 bg-gradient-to-t from-chocolate/60 via-chocolate/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-[clamp(20px,3vw,40px)] text-offwhite">
        <p className="eyebrow">{c.eyebrow}</p>
        <p className="display mt-3 mb-5 max-w-[460px] text-[clamp(28px,3vw,44px)]"><Emph text={c.headline} /></p>
        <span className="ulink">Discover</span>
      </div>
    </Link>
  );
}
