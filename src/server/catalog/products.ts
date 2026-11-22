import { and, asc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, type Executor } from "../db";
import * as s from "../db/schema";
import { CURRENCIES, type Category, type Collection, type CurrencyCode, type PriceSet, type Product, type ProductImage } from "@/types";

/** Storefront visibility: published (or scheduled and due), not deleted. */
export const visibleProduct = () =>
  and(isNull(s.products.deletedAt), or(eq(s.products.status, "active"), and(eq(s.products.status, "scheduled"), sql`${s.products.publishAt} <= UTC_TIMESTAMP(3)`)))!;

type MediaRow = typeof s.mediaAssets.$inferSelect;

export function toImage(m: MediaRow | undefined | null, altOverride?: string | null): ProductImage | undefined {
  if (!m || m.deletedAt) return undefined;
  return {
    id: m.id, src: m.url, alt: altOverride || m.alt, width: m.width ?? undefined, height: m.height ?? undefined,
    credit: m.credit ? { source: m.credit.source as "Pexels", photographer: m.credit.photographer, photographerUrl: m.credit.photographerUrl, sourceUrl: m.credit.sourceUrl, license: m.credit.license } : undefined,
  };
}

async function mediaMap(ids: (string | null | undefined)[], exec: Executor) {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map<string, MediaRow>();
  const rows = await exec.select().from(s.mediaAssets).where(inArray(s.mediaAssets.id, list));
  return new Map(rows.map((r) => [r.id, r]));
}

async function currencyRates(exec: Executor) {
  const rows = await exec.select().from(s.currencies);
  return Object.fromEntries(rows.map((r) => [r.code, r.rateFromPkrMicros])) as Record<string, number>;
}

function fillPrices(partial: Partial<Record<CurrencyCode, number>>, rates: Record<string, number>): PriceSet {
  const pkr = partial.PKR ?? 0;
  return Object.fromEntries(CURRENCIES.map((c) => [c, partial[c] ?? Math.round((pkr * (rates[c] ?? 0)) / 1_000_000 / 100) * 100])) as PriceSet;
}

/** Units sold per product over the last N days (paid or COD orders that weren't cancelled). */
export async function unitsSold(productIds: string[], days = 30, exec: Executor = db) {
  if (!productIds.length) return new Map<string, number>();
  const rows = await exec.select({ productId: s.orderItems.productId, units: sql<number>`CAST(SUM(${s.orderItems.quantity}) AS SIGNED)` })
    .from(s.orderItems).innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(inArray(s.orderItems.productId, productIds), sql`${s.orders.placedAt} >= UTC_TIMESTAMP(3) - INTERVAL ${days} DAY`, sql`${s.orders.status} NOT IN ('cancelled')`, sql`${s.orders.paymentStatus} IN ('paid','awaiting_cod','partially_refunded')`))
    .groupBy(s.orderItems.productId);
  return new Map(rows.map((r) => [r.productId!, Number(r.units)]));
}

/** Loads full domain products (colours, images, variants, prices, live stock) for the given ids, preserving order. */
export async function loadProducts(ids: string[], exec: Executor = db): Promise<Product[]> {
  if (!ids.length) return [];
  const [rows, prices, variants, images, cols, related, rates] = await Promise.all([
    exec.select().from(s.products).where(inArray(s.products.id, ids)),
    exec.select().from(s.productPrices).where(inArray(s.productPrices.productId, ids)),
    exec.select({ v: s.productVariants, inv: s.inventory }).from(s.productVariants).leftJoin(s.inventory, eq(s.inventory.variantId, s.productVariants.id))
      .where(and(inArray(s.productVariants.productId, ids), eq(s.productVariants.active, true))).orderBy(asc(s.productVariants.sortOrder)),
    exec.select().from(s.productImages).where(inArray(s.productImages.productId, ids)).orderBy(asc(s.productImages.sortOrder)),
    exec.select().from(s.productCollections).where(inArray(s.productCollections.productId, ids)),
    exec.select().from(s.relatedProducts).where(inArray(s.relatedProducts.productId, ids)).orderBy(asc(s.relatedProducts.sortOrder)),
    currencyRates(exec),
  ]);
  const variantIds = variants.map((x) => x.v.id);
  const attrIds = [...new Set(variants.flatMap((x) => [x.v.colourValueId, x.v.sizeValueId]).filter((x): x is string => !!x))];
  const [vPrices, attrs, media, sold] = await Promise.all([
    variantIds.length ? exec.select().from(s.variantPrices).where(inArray(s.variantPrices.variantId, variantIds)) : Promise.resolve([]),
    attrIds.length ? exec.select().from(s.productAttributeValues).where(inArray(s.productAttributeValues.id, attrIds)) : Promise.resolve([]),
    mediaMap(images.map((i) => i.mediaId), exec),
    unitsSold(ids, 30, exec),
  ]);
  const attr = new Map(attrs.map((a) => [a.id, a]));

  const out = new Map<string, Product>();
  for (const p of rows) {
    const pp = prices.filter((x) => x.productId === p.id);
    const priceSet = fillPrices(Object.fromEntries(pp.map((x) => [x.currency, x.price])), rates);
    const compare = pp.some((x) => x.compareAtPrice) ? fillPrices(Object.fromEntries(pp.map((x) => [x.currency, x.compareAtPrice ?? x.price])), rates) : undefined;
    const pv = variants.filter((x) => x.v.productId === p.id);
    const colourIds = [...new Set(pv.map((x) => x.v.colourValueId ?? "default"))]
      .sort((a, b) => (attr.get(a)?.sortOrder ?? 0) - (attr.get(b)?.sortOrder ?? 0));
    const pImages = images.filter((i) => i.productId === p.id);
    const colours = colourIds.map((cid, idx) => {
      const a = attr.get(cid);
      const imgs = pImages.filter((i) => (i.colourValueId ?? colourIds[0]) === cid || (!i.colourValueId && idx === 0))
        .map((i) => toImage(media.get(i.mediaId), i.alt)).filter((x): x is ProductImage => !!x);
      return { id: cid, name: a?.label ?? "One colour", hex: a?.hex ?? "#d8cfc2", images: imgs };
    });
    const sizeIds = [...new Set(pv.map((x) => x.v.sizeValueId ?? "one-size"))].sort((a, b) => (attr.get(a)?.sortOrder ?? 0) - (attr.get(b)?.sortOrder ?? 0));
    out.set(p.id, {
      id: p.id, slug: p.slug, sku: p.sku, name: p.name, subtitle: p.subtitle, shortDescription: p.shortDescription, description: p.description,
      categoryId: p.categoryId ?? "", collectionIds: cols.filter((c) => c.productId === p.id).map((c) => c.collectionId),
      occasionIds: (p.occasions ?? []) as Product["occasionIds"],
      prices: priceSet, compareAtPrices: compare,
      colours,
      sizes: sizeIds.map((id) => attr.get(id)?.label ?? "One size"),
      variants: pv.map((x) => {
        const vp = vPrices.filter((y) => y.variantId === x.v.id);
        return {
          id: x.v.id, sku: x.v.sku, colourId: x.v.colourValueId ?? "default", size: attr.get(x.v.sizeValueId ?? "")?.label ?? "One size",
          prices: vp.length ? fillPrices({ ...Object.fromEntries(pp.map((y) => [y.currency, y.price])), ...Object.fromEntries(vp.map((y) => [y.currency, y.price])) }, rates) : undefined,
          stock: Math.max(0, (x.inv?.onHand ?? 0) - (x.inv?.reserved ?? 0)),
        };
      }),
      sizeGuideId: p.sizeGuideId, fabric: p.fabric, care: p.care ?? [], details: p.details ?? [], fit: p.fit ?? undefined, tags: p.tags ?? [],
      completeTheLook: related.filter((r) => r.productId === p.id && r.kind === "look").map((r) => r.relatedId),
      relatedIds: related.filter((r) => r.productId === p.id && r.kind === "related").map((r) => r.relatedId),
      stats: { unitsSold30d: sold.get(p.id) ?? 0 },
      isNew: p.isNew, isFeatured: p.isFeatured, isBestseller: p.isBestseller,
      status: p.status, publishAt: p.publishAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      seo: { title: p.seoTitle ?? undefined, description: p.seoDescription ?? undefined },
    });
  }
  return ids.map((id) => out.get(id)).filter((p): p is Product => !!p);
}

export async function visibleProductIds(where?: SQL, exec: Executor = db) {
  const rows = await exec.select({ id: s.products.id }).from(s.products).where(where ? and(visibleProduct(), where) : visibleProduct())
    .orderBy(sql`${s.products.isFeatured} DESC`, sql`${s.products.isNew} DESC`, asc(s.products.sortOrder), sql`${s.products.createdAt} DESC`);
  return rows.map((r) => r.id);
}

export async function getProductBySlug(slug: string, opts: { includeHidden?: boolean } = {}, exec: Executor = db) {
  const [row] = await exec.select({ id: s.products.id }).from(s.products)
    .where(opts.includeHidden ? eq(s.products.slug, slug) : and(eq(s.products.slug, slug), visibleProduct())).limit(1);
  return row ? (await loadProducts([row.id], exec))[0] ?? null : null;
}

/* ─────────────── Categories & collections ─────────────── */

export async function listCategories(opts: { includeInactive?: boolean } = {}, exec: Executor = db): Promise<Category[]> {
  const rows = await exec.select().from(s.categories).where(opts.includeInactive ? undefined : eq(s.categories.active, true)).orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
  const media = await mediaMap(rows.flatMap((r) => [r.imageId, r.bannerId]), exec);
  return rows.map((c) => ({
    id: c.id, slug: c.slug, name: c.name, description: c.description, sortOrder: c.sortOrder, parentId: c.parentId,
    image: toImage(media.get(c.imageId ?? "")), banner: toImage(media.get(c.bannerId ?? "")),
    seo: { title: c.seoTitle ?? undefined, description: c.seoDescription ?? undefined },
  }));
}

export async function listCollections(opts: { includeDrafts?: boolean } = {}, exec: Executor = db): Promise<Collection[]> {
  const rows = await exec.select().from(s.collections)
    .where(opts.includeDrafts ? undefined : and(eq(s.collections.status, "published"), or(isNull(s.collections.startsAt), sql`${s.collections.startsAt} <= UTC_TIMESTAMP(3)`), or(isNull(s.collections.endsAt), sql`${s.collections.endsAt} > UTC_TIMESTAMP(3)`)))
    .orderBy(asc(s.collections.sortOrder));
  const media = await mediaMap(rows.map((r) => r.heroId), exec);
  return rows.map((c) => ({
    id: c.id, slug: c.slug, name: c.name, eyebrow: c.eyebrow, headline: c.headline, description: c.description,
    occasionId: (c.occasion ?? undefined) as Collection["occasionId"],
    hero: toImage(media.get(c.heroId ?? "")) ?? { id: "none", alt: c.name },
    featured: c.featured, seasonal: c.seasonal, sortOrder: c.sortOrder, status: c.status,
    seo: { title: c.seoTitle ?? undefined, description: c.seoDescription ?? undefined },
  }));
}
