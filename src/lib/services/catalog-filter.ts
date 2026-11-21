import type { CatalogFilter, CurrencyCode, Product } from "@/types";

/** Pure filtering/sorting — shared by server repositories and client-side refinement. */
export function applyCatalogFilter(products: Product[], f: CatalogFilter, currency: CurrencyCode = "PKR"): Product[] {
  const q = f.query?.trim().toLowerCase();
  const list = products.filter((p) => {
    if (f.categoryIds?.length && !f.categoryIds.includes(p.categoryId)) return false;
    if (f.occasionIds?.length && !f.occasionIds.some((o) => p.occasionIds.includes(o))) return false;
    if (f.collectionId && !p.collectionIds.includes(f.collectionId)) return false;
    if (f.newOnly && !p.isNew) return false;
    if (f.colours?.length && !p.colours.some((c) => f.colours!.includes(baseColour(c.name)))) return false;
    if (f.sizes?.length && !p.variants.some((v) => f.sizes!.includes(v.size) && v.stock > 0)) return false;
    if (q) {
      const hay = [p.name, p.subtitle, p.description, p.fabric, ...p.colours.map((c) => c.name), ...p.occasionIds, ...p.tags].join(" ").toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  switch (f.sort) {
    case "newest":
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "price-asc":
      return list.sort((a, b) => a.prices[currency] - b.prices[currency]);
    case "price-desc":
      return list.sort((a, b) => b.prices[currency] - a.prices[currency]);
    default:
      return list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  }
}

export const baseColour = (name: string) => name.replace(/\s+II$/, "");

export function totalStock(p: Product) {
  return p.variants.reduce((a, v) => a + v.stock, 0);
}
