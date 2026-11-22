import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Emph } from "@/components/ui/typography";
import { catalog, commerce, content } from "@/lib/repositories";
import type { ListingFilter } from "@/server/catalog/query";
import { toCard } from "./card-data";
import { CatalogBrowser, StaticGrid } from "./catalog-browser";
import type { Collection, CurrencyCode } from "@/types";

export type CatalogScope = Omit<ListingFilter, "currency" | "page" | "pageSize" | "sort" | "categoryIds" | "colours" | "sizes" | "priceBands" | "inStockOnly">;
type SP = Record<string, string | string[] | undefined>;

const SORTS = ["featured", "recommended", "newest", "price-asc", "price-desc", "bestselling"] as const;
const list = (v: string | string[] | undefined) => (typeof v === "string" ? v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12) : []);

async function Results({ scope, searchParams, editorial, hideCategory, pageSize }: { scope: CatalogScope; searchParams: Promise<SP>; editorial?: Collection; hideCategory?: boolean; pageSize: number }) {
  const [sp, cfg, settings, jar] = await Promise.all([searchParams, commerce.load(), content.settings(), cookies()]);
  const marketId = jar.get("ns_market")?.value;
  const market = cfg.markets.find((m) => m.id === marketId) ?? cfg.markets.find((m) => m.id === settings.defaultMarketId) ?? cfg.markets[0];
  const currency = market.currency as CurrencyCode;
  const sort = SORTS.includes(sp.sort as (typeof SORTS)[number]) ? (sp.sort as ListingFilter["sort"]) : "featured";
  const page = Math.min(20, Math.max(1, Number(sp.page) || 1));
  const filter: ListingFilter = {
    ...scope, currency, sort, page, pageSize,
    categoryIds: list(sp.category), colours: list(sp.colour), sizes: list(sp.size), priceBands: list(sp.price),
    inStockOnly: sp.stock === "1", query: scope.query ?? (typeof sp.q === "string" ? sp.q : undefined),
  };
  const [result, categories] = await Promise.all([catalog.query(filter), catalog.listCategories()]);
  const catNames = new Map(categories.map((c) => [c.id, c.name]));
  return (
    <CatalogBrowser
      items={result.products.map(toCard)}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      currency={currency}
      facets={{
        categories: result.facets.categories.filter((c) => catNames.has(c.id)).map((c) => ({ id: c.id, name: catNames.get(c.id)!, count: c.count })).sort((a, b) => a.name.localeCompare(b.name)),
        colours: result.facets.colours, sizes: result.facets.sizes, prices: result.facets.prices, inStock: result.facets.inStock,
      }}
      hideCategory={hideCategory}
      editorial={editorial ? <EditorialTile collection={editorial} /> : undefined}
    />
  );
}

/**
 * Catalogue grid. Filtering, facet counts, sorting and pagination all run as MySQL queries on the
 * server (URL search params → query); the client component only edits the URL.
 */
export async function Catalog({ scope, searchParams, editorial, hideCategory, pageSize = 24 }: { scope: CatalogScope; searchParams: Promise<SP>; editorial?: Collection; hideCategory?: boolean; pageSize?: number }) {
  const fallback = await catalog.query({ ...scope, currency: "PKR", pageSize, sort: "featured" });
  return (
    <Suspense fallback={<StaticGrid items={fallback.products.map(toCard)} />}>
      <Results scope={scope} searchParams={searchParams} editorial={editorial} hideCategory={hideCategory} pageSize={pageSize} />
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
