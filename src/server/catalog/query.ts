import { sql, type SQL } from "drizzle-orm";
import { db, type Executor } from "../db";
import type { CurrencyCode } from "@/types";

/**
 * Catalogue listing with every filter, facet count, sort and page computed in MySQL.
 * Facet counts follow the usual e-commerce rule: each facet ignores its own selection
 * (so you can widen within a facet) but respects all the others.
 */

export interface ListingFilter {
  categoryIds?: string[];
  /** Scope that never shows up as a removable chip (e.g. the category page itself). */
  scopeCategoryIds?: string[];
  occasion?: string;
  collectionId?: string;
  colours?: string[]; // colour families
  sizes?: string[]; // size labels (in stock)
  priceBands?: string[];
  inStockOnly?: boolean;
  newOnly?: boolean;
  featuredOnly?: boolean;
  bestsellersOnly?: boolean;
  query?: string;
  sort?: "featured" | "recommended" | "newest" | "price-asc" | "price-desc" | "bestselling";
  currency: CurrencyCode;
  page?: number;
  pageSize?: number;
}

/** Price bands per currency in major units → minor-unit ranges. */
const BANDS: Record<CurrencyCode, number[]> = { PKR: [10000, 20000, 40000], USD: [100, 200, 400], GBP: [80, 160, 320], EUR: [90, 180, 360] };
export function priceBands(currency: CurrencyCode) {
  const t = BANDS[currency].map((x) => x * 100);
  return [
    { id: "1", min: 0, max: t[0] - 1 },
    { id: "2", min: t[0], max: t[1] - 1 },
    { id: "3", min: t[1], max: t[2] - 1 },
    { id: "4", min: t[2], max: 2_000_000_000 },
  ];
}

const VISIBLE = sql`p.deleted_at IS NULL AND (p.status = 'active' OR (p.status = 'scheduled' AND p.publish_at <= UTC_TIMESTAMP(3)))`;
const PRICE = (currency: string) => sql`(SELECT pp.price FROM product_prices pp WHERE pp.product_id = p.id AND pp.currency = ${currency})`;
const IN_STOCK = sql`EXISTS (SELECT 1 FROM product_variants v JOIN inventory i ON i.variant_id = v.id WHERE v.product_id = p.id AND v.active = 1 AND i.on_hand - i.reserved > 0)`;
const like = (w: string) => `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

type FacetKey = "category" | "colour" | "size" | "price" | "stock";

function conditions(f: ListingFilter, skip?: FacetKey): SQL[] {
  const c: SQL[] = [VISIBLE];
  const catIn = (ids: string[]) => sql`(p.category_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) OR p.category_id IN (SELECT id FROM categories WHERE parent_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})) OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})))`;
  if (f.scopeCategoryIds?.length) c.push(catIn(f.scopeCategoryIds));
  if (skip !== "category" && f.categoryIds?.length) c.push(catIn(f.categoryIds));
  if (f.occasion) c.push(sql`JSON_CONTAINS(p.occasions, JSON_QUOTE(${f.occasion}))`);
  if (f.collectionId) c.push(sql`EXISTS (SELECT 1 FROM product_collections pc WHERE pc.product_id = p.id AND pc.collection_id = ${f.collectionId})`);
  if (f.newOnly) c.push(sql`p.is_new = 1`);
  if (f.featuredOnly) c.push(sql`p.is_featured = 1`);
  if (f.bestsellersOnly) c.push(sql`p.is_bestseller = 1`);
  if (skip !== "stock" && f.inStockOnly) c.push(IN_STOCK);
  if (skip !== "colour" && f.colours?.length) {
    c.push(sql`EXISTS (SELECT 1 FROM product_variants v JOIN product_attribute_values av ON av.id = v.colour_value_id WHERE v.product_id = p.id AND v.active = 1 AND COALESCE(av.family, av.label) IN (${sql.join(f.colours.map((x) => sql`${x}`), sql`, `)}))`);
  }
  if (skip !== "size" && f.sizes?.length) {
    c.push(sql`EXISTS (SELECT 1 FROM product_variants v JOIN product_attribute_values av ON av.id = v.size_value_id JOIN inventory i ON i.variant_id = v.id WHERE v.product_id = p.id AND v.active = 1 AND i.on_hand - i.reserved > 0 AND av.label IN (${sql.join(f.sizes.map((x) => sql`${x}`), sql`, `)}))`);
  }
  if (skip !== "price" && f.priceBands?.length) {
    const bands = priceBands(f.currency).filter((b) => f.priceBands!.includes(b.id));
    if (bands.length) c.push(sql`(${sql.join(bands.map((b) => sql`${PRICE(f.currency)} BETWEEN ${b.min} AND ${b.max}`), sql` OR `)})`);
  }
  const q = f.query?.trim().toLowerCase().slice(0, 80);
  if (q) {
    for (const w of q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      const L = like(w);
      c.push(sql`(LOWER(p.name) LIKE ${L} OR LOWER(p.subtitle) LIKE ${L} OR LOWER(p.sku) LIKE ${L} OR LOWER(p.fabric) LIKE ${L} OR LOWER(p.description) LIKE ${L}
        OR LOWER(CAST(p.tags AS CHAR)) LIKE ${L} OR LOWER(CAST(p.occasions AS CHAR)) LIKE ${L}
        OR EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND LOWER(c.name) LIKE ${L})
        OR EXISTS (SELECT 1 FROM product_collections pc JOIN collections co ON co.id = pc.collection_id WHERE pc.product_id = p.id AND LOWER(co.name) LIKE ${L})
        OR EXISTS (SELECT 1 FROM product_variants v LEFT JOIN product_attribute_values av ON av.id = v.colour_value_id WHERE v.product_id = p.id AND (LOWER(v.sku) LIKE ${L} OR LOWER(av.label) LIKE ${L})))`);
    }
  }
  return c;
}

const where = (c: SQL[]) => sql.join(c, sql` AND `);

const SOLD_90 = sql`(SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status <> 'cancelled' AND o.payment_status IN ('paid','awaiting_cod','partially_refunded') AND o.placed_at >= UTC_TIMESTAMP(3) - INTERVAL 90 DAY)`;

function orderBy(f: ListingFilter): SQL {
  switch (f.sort) {
    case "newest": return sql`p.created_at DESC, p.id`;
    case "price-asc": return sql`${PRICE(f.currency)} ASC, p.id`;
    case "price-desc": return sql`${PRICE(f.currency)} DESC, p.id`;
    case "bestselling": return sql`p.is_bestseller DESC, ${SOLD_90} DESC, p.created_at DESC`;
    case "recommended": return sql`p.is_featured DESC, ${SOLD_90} DESC, p.is_new DESC, p.sort_order, p.created_at DESC`;
    default: return sql`p.is_featured DESC, p.is_new DESC, p.sort_order, p.created_at DESC`;
  }
}

type Rows<T> = [T[], unknown];

export interface ListingResult {
  ids: string[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    categories: { id: string; count: number }[];
    colours: { name: string; hex: string; count: number }[];
    sizes: { size: string; count: number }[];
    prices: { id: string; min: number; max: number; count: number }[];
    inStock: number;
  };
}

export async function queryCatalog(f: ListingFilter, exec: Executor = db): Promise<ListingResult> {
  const pageSize = Math.min(Math.max(f.pageSize ?? 24, 1), 96);
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const run = async <T>(q: SQL) => ((await exec.execute(q)) as unknown as Rows<T>)[0];

  const [idRows, totalRows, catRows, colourRows, sizeRows, stockRows] = await Promise.all([
    run<{ id: string }>(sql`SELECT p.id FROM products p WHERE ${where(conditions(f))} ORDER BY ${orderBy(f)} LIMIT ${pageSize * page} OFFSET 0`),
    run<{ n: number }>(sql`SELECT COUNT(*) AS n FROM products p WHERE ${where(conditions(f))}`),
    run<{ id: string; n: number }>(sql`SELECT p.category_id AS id, COUNT(*) AS n FROM products p WHERE ${where(conditions(f, "category"))} GROUP BY p.category_id`),
    run<{ name: string; hex: string; n: number }>(sql`SELECT COALESCE(av.family, av.label) AS name, MIN(av.hex) AS hex, COUNT(DISTINCT p.id) AS n FROM products p JOIN product_variants v ON v.product_id = p.id AND v.active = 1 JOIN product_attribute_values av ON av.id = v.colour_value_id WHERE ${where(conditions(f, "colour"))} GROUP BY COALESCE(av.family, av.label) ORDER BY MIN(av.sort_order)`),
    run<{ size: string; n: number; sort: number }>(sql`SELECT av.label AS size, COUNT(DISTINCT p.id) AS n, MIN(av.sort_order) AS sort FROM products p JOIN product_variants v ON v.product_id = p.id AND v.active = 1 JOIN inventory i ON i.variant_id = v.id AND i.on_hand - i.reserved > 0 JOIN product_attribute_values av ON av.id = v.size_value_id WHERE ${where(conditions(f, "size"))} GROUP BY av.label ORDER BY sort`),
    run<{ n: number }>(sql`SELECT COUNT(*) AS n FROM products p WHERE ${where([...conditions(f, "stock"), IN_STOCK])}`),
  ]);
  const bands = priceBands(f.currency);
  const priceRows = await run<Record<string, number>>(sql`SELECT ${sql.join(bands.map((b) => sql`SUM(CASE WHEN ${PRICE(f.currency)} BETWEEN ${b.min} AND ${b.max} THEN 1 ELSE 0 END) AS ${sql.raw(`b${b.id}`)}`), sql`, `)} FROM products p WHERE ${where(conditions(f, "price"))}`);

  return {
    ids: idRows.map((r) => r.id),
    total: Number(totalRows[0]?.n ?? 0),
    page, pageSize,
    facets: {
      categories: catRows.filter((r) => r.id).map((r) => ({ id: r.id, count: Number(r.n) })),
      colours: colourRows.map((r) => ({ name: r.name, hex: r.hex ?? "#ccc", count: Number(r.n) })),
      sizes: sizeRows.map((r) => ({ size: r.size, count: Number(r.n) })),
      prices: bands.map((b) => ({ ...b, count: Number(priceRows[0]?.[`b${b.id}`] ?? 0) })),
      inStock: Number(stockRows[0]?.n ?? 0),
    },
  };
}

/** Lightweight suggestions for the search overlay (names, categories, collections, SKUs, colours). */
export async function searchSuggestions(q: string, currency: CurrencyCode, exec: Executor = db) {
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return { productIds: [] as string[], total: 0 };
  const r = await queryCatalog({ query: term, currency, pageSize: 6, sort: "recommended" }, exec);
  return { productIds: r.ids.slice(0, 6), total: r.total };
}
