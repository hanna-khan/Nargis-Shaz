import { loadProducts } from "@/server/catalog/products";
import { searchSuggestions } from "@/server/catalog/query";
import { listCategories, listCollections } from "@/server/catalog/products";
import { ok, route } from "@/server/http";
import { CURRENCIES, type CurrencyCode } from "@/types";

/** GET /api/search?q=…&currency=PKR — product suggestions plus matching categories/collections. */
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const cur = (url.searchParams.get("currency") ?? "PKR").toUpperCase();
  const currency: CurrencyCode = (CURRENCIES as readonly string[]).includes(cur) ? (cur as CurrencyCode) : "PKR";
  if (q.length < 2) return ok({ query: q, total: 0, products: [], categories: [], collections: [] });
  const [{ productIds, total }, cats, cols] = await Promise.all([searchSuggestions(q, currency), listCategories(), listCollections()]);
  const products = await loadProducts(productIds);
  const lc = q.toLowerCase();
  return ok({
    query: q, total,
    products: products.map((p) => ({ id: p.id, name: p.name, subtitle: p.subtitle, href: `/products/${p.slug}`, image: p.colours[0]?.images[0] ?? null, prices: p.prices })),
    categories: cats.filter((c) => c.name.toLowerCase().includes(lc)).slice(0, 4).map((c) => ({ name: c.name, href: `/shop/${c.slug}` })),
    collections: cols.filter((c) => c.name.toLowerCase().includes(lc)).slice(0, 3).map((c) => ({ name: c.name, href: c.occasionId ? `/${c.occasionId}` : `/collections/${c.slug}` })),
  }, { headers: { "Cache-Control": "public, max-age=30" } });
});
