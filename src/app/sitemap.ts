import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { catalog } from "@/lib/repositories";

/** Built from the repository, so it follows the catalogue automatically once Supabase is connected. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, categories] = await Promise.all([catalog.listProducts(), catalog.listCollections(), catalog.listCategories()]);
  const u = (path: string) => `${site.url}${path}`;
  const lastModified = products.reduce((a, p) => (p.createdAt > a ? p.createdAt : a), "2026-01-01T00:00:00.000Z");
  const pages: MetadataRoute.Sitemap = [
    { url: u("/"), lastModified, changeFrequency: "daily", priority: 1 },
    { url: u("/shop"), lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: u("/new-arrivals"), lastModified, changeFrequency: "daily", priority: 0.9 },
    ...["/workwear", "/everyday", "/evening", "/festive"].map((p) => ({ url: u(p), lastModified, changeFrequency: "weekly" as const, priority: 0.85 })),
    { url: u("/our-story"), changeFrequency: "monthly", priority: 0.5 },
    { url: u("/customer-care"), changeFrequency: "monthly", priority: 0.4 },
    ...["privacy", "terms", "shipping", "returns"].map((d) => ({ url: u(`/legal/${d}`), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
  return [
    ...pages,
    ...categories.filter((c) => products.some((p) => p.categoryId === c.id)).map((c) => ({ url: u(`/shop/${c.slug}`), lastModified, changeFrequency: "weekly" as const, priority: 0.85 })),
    ...collections.filter((c) => !c.occasionId).map((c) => ({ url: u(`/collections/${c.slug}`), lastModified, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: u(`/products/${p.slug}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
