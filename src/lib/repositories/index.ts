import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import * as products from "@/server/catalog/products";
import { queryCatalog, type ListingFilter } from "@/server/catalog/query";
import { loadCommerce } from "@/server/commerce/config";
import { getPublishedHomepage } from "@/server/cms/homepage";
import { getSettings } from "@/server/settings";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { CatalogFilter, Category, Collection, Product, ProductImage } from "@/types";

/**
 * Storefront data access (MySQL via Drizzle), cached with Next.js Cache Components and tagged so that
 * Studio mutations invalidate exactly what changed:
 *   catalog  — products, prices, stock, categories, collections
 *   content  — homepage, navigation, policies, settings, media
 *   commerce — markets, shipping, tax, payment methods
 */
export const TAGS = { catalog: "catalog", content: "content", commerce: "commerce" } as const;

function catalogCache() {
  cacheTag(TAGS.catalog);
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
}

export const catalog = {
  async listProducts(filter?: CatalogFilter): Promise<Product[]> {
    "use cache";
    catalogCache();
    const ids = filter
      ? (await queryCatalog({
          currency: "PKR", pageSize: 96, categoryIds: filter.categoryIds, occasion: filter.occasionIds?.[0], collectionId: filter.collectionId,
          newOnly: filter.newOnly, inStockOnly: filter.inStockOnly, query: filter.query,
          sort: filter.sort === "featured" || !filter.sort ? "featured" : (filter.sort as ListingFilter["sort"]),
        })).ids
      : await products.visibleProductIds();
    return products.loadProducts(ids);
  },
  async query(filter: ListingFilter) {
    "use cache";
    catalogCache();
    const result = await queryCatalog(filter);
    return { ...result, products: await products.loadProducts(result.ids) };
  },
  async getProductBySlug(slug: string) {
    "use cache";
    catalogCache();
    return products.getProductBySlug(slug);
  },
  async getProductsByIds(ids: string[]) {
    "use cache";
    catalogCache();
    if (!ids.length) return [];
    const visible = await db.select({ id: s.products.id }).from(s.products).where(and(inArray(s.products.id, ids), products.visibleProduct()));
    const set = new Set(visible.map((v) => v.id));
    return products.loadProducts(ids.filter((i) => set.has(i)));
  },
  async listCategories(): Promise<Category[]> {
    "use cache";
    catalogCache();
    return products.listCategories();
  },
  async listCollections(): Promise<Collection[]> {
    "use cache";
    catalogCache();
    return products.listCollections();
  },
  async getCategoryBySlug(slug: string) {
    return (await catalog.listCategories()).find((c) => c.slug === slug) ?? null;
  },
  async getCollectionBySlug(slug: string) {
    return (await catalog.listCollections()).find((c) => c.slug === slug) ?? null;
  },
};

export const commerce = {
  async load() {
    "use cache";
    cacheTag(TAGS.commerce);
    cacheLife({ stale: 60, revalidate: 600, expire: 86_400 });
    return loadCommerce();
  },
};

export const content = {
  async settings() {
    "use cache";
    cacheTag(TAGS.content);
    cacheLife({ stale: 60, revalidate: 600, expire: 86_400 });
    return getSettings();
  },
  async homepage() {
    "use cache";
    cacheTag(TAGS.content);
    cacheLife({ stale: 60, revalidate: 600, expire: 86_400 });
    return getPublishedHomepage();
  },
  async media(ids: string[]): Promise<Record<string, ProductImage>> {
    "use cache";
    cacheTag(TAGS.content);
    if (!ids.length) return {};
    const rows = await db.select().from(s.mediaAssets).where(inArray(s.mediaAssets.id, ids));
    return Object.fromEntries(rows.map((m) => [m.id, products.toImage(m)]).filter(([, v]) => !!v)) as Record<string, ProductImage>;
  },
  async policy(slug: string) {
    "use cache";
    cacheTag(TAGS.content);
    const [p] = await db.select().from(s.policyPages).where(eq(s.policyPages.slug, slug));
    return p ?? null;
  },
  async policies() {
    "use cache";
    cacheTag(TAGS.content);
    return db.select().from(s.policyPages).orderBy(asc(s.policyPages.slug));
  },
  async navigation() {
    "use cache";
    cacheTag(TAGS.content);
    const [menus, items] = await Promise.all([db.select().from(s.navigationMenus), db.select().from(s.navigationItems).where(eq(s.navigationItems.enabled, true)).orderBy(asc(s.navigationItems.sortOrder))]);
    return Object.fromEntries(menus.map((m) => [m.key, items.filter((i) => i.menuId === m.id).map((i) => ({ label: i.label, href: i.href, panel: i.panel }))])) as Record<string, { label: string; href: string; panel: string }[]>;
  },
  async sizeGuide(id: string | null) {
    "use cache";
    cacheTag(TAGS.catalog);
    const [g] = await db.select().from(s.sizeGuides).where(eq(s.sizeGuides.id, id ?? "sg-womens"));
    return g ?? null;
  },
};
