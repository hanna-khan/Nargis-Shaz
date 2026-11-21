import "server-only";
import { catalog, commerce, content, operations } from "@/lib/repositories";
import { methodsForMarket } from "@/lib/payments/registry";
import type { CommerceConfig } from "@/components/store/shop-context";
import type { NavData, NavLink } from "@/components/store/navigation-types";
import type { HomepageContent, MediaAsset, Product, ProductImage } from "@/types";

export const categoryHref = (slug: string) => `/shop/${slug}`;

/** Everything the storefront chrome needs, assembled once per build (Supabase: cache-tagged). */
export async function getStorefrontChrome(): Promise<{ nav: NavData; commerceConfig: CommerceConfig }> {
  "use cache";
  const [categories, collections, products, home, markets, countries, shipping, taxRules, settings] = await Promise.all([
    catalog.listCategories(), catalog.listCollections(), catalog.listProducts(), content.getHomepage(),
    commerce.listMarkets(), commerce.listCountries(), commerce.listShippingMethods(), commerce.listTaxRules(), operations.getSettings(),
  ]);
  const col = (slug: string) => collections.find((c) => c.slug === slug)!;
  const occasionCols = collections.filter((c) => c.occasionId);
  const editorialCols = collections.filter((c) => !c.occasionId);
  const used = categories.filter((c) => products.some((p) => p.categoryId === c.id)); // never link to an empty category
  const catLinks: NavLink[] = used.map((c) => ({ name: c.name, href: categoryHref(c.slug), image: c.image }));
  const occLinks: NavLink[] = occasionCols.map((c) => ({ name: c.name, href: `/${c.occasionId}`, image: c.hero }));
  const colLinks: NavLink[] = editorialCols.map((c) => ({ name: c.name, href: `/collections/${c.slug}`, image: c.hero }));
  const inOcc = (occ: string, catId: string) => products.some((p) => p.occasionIds.includes(occ as Product["occasionIds"][number]) && p.categoryId === catId);
  const occCats = (occ: string) => used.filter((c) => inOcc(occ, c.id)).map((c) => ({ name: c.name, href: `/${occ}?category=${c.id}`, image: c.image }));
  const newest = products.filter((p) => p.isNew)[0];

  const nav: NavData = {
    announcement: home.announcement,
    categories: catLinks,
    occasions: occLinks,
    collections: colLinks,
    paymentNote: "Cash on delivery in Pakistan · Visa · Mastercard · PayPal (UK, Europe & US)",
    primary: [
      { id: "new", label: "New in", href: "/new-arrivals" },
      {
        id: "shop", label: "Shop women", href: "/shop",
        panel: {
          preview: true,
          columns: [
            { title: "Clothing", links: [{ name: "New in", href: "/new-arrivals", image: newest?.colours[0].images[0] }, ...catLinks, { name: "View all clothing", href: "/shop" }] },
            { title: "Shop by occasion", links: [...occLinks, { name: "Bestsellers", href: "/shop?sort=bestselling" }] },
          ],
          features: [
            { eyebrow: col("autumn-winter-2026").eyebrow, title: col("autumn-winter-2026").name, href: "/collections/autumn-winter-2026", cta: "Discover", image: col("autumn-winter-2026").hero },
          ],
        },
      },
      {
        id: "workwear", label: "Workwear", href: "/workwear",
        panel: {
          columns: [{ title: "The Working Edit", links: [{ name: "All workwear", href: "/workwear" }, ...occCats("workwear")] }],
          features: [
            { eyebrow: "Tailoring", title: "The tailored blazer", href: categoryHref("blazers-coats"), cta: "Shop blazers & coats", image: col("workwear").hero },
            { eyebrow: "Two-piece", title: "Co-ords & suits", href: categoryHref("co-ords"), cta: "Shop suits", image: categories.find((c) => c.slug === "co-ords")!.image! },
          ],
        },
      },
      {
        id: "festive", label: "Festive", href: "/festive",
        panel: {
          columns: [{ title: "Celebrate", links: [{ name: "All festive & occasion", href: "/festive" }, ...occCats("festive"), { name: "Evening", href: "/evening" }] }],
          features: [
            { eyebrow: "Hand-embroidered", title: "Lehengas & bridal", href: categoryHref("festive-sets"), cta: "Discover", image: col("festive").hero },
            { eyebrow: col("jashn-2026").eyebrow, title: col("jashn-2026").name, href: "/collections/jashn-2026", cta: "Discover", image: col("jashn-2026").hero },
          ],
        },
      },
      {
        id: "collections", label: "Collections", href: "/collections/autumn-winter-2026",
        panel: {
          columns: [{ title: "Collections", links: colLinks }, { title: "The house", links: [{ name: "Our story", href: "/our-story" }, { name: "The atelier", href: "/our-story#craft" }, { name: "Customer care", href: "/customer-care" }] }],
          features: editorialCols.slice(0, 2).map((c) => ({ eyebrow: c.eyebrow, title: c.name, href: `/collections/${c.slug}`, cta: "Discover", image: c.hero })),
        },
      },
    ],
    searchIndex: products.map((p) => ({
      id: p.id, name: p.name, subtitle: p.subtitle, href: `/products/${p.slug}`, image: p.colours[0].images[0], prices: p.prices,
      keywords: [p.name, p.subtitle, p.fabric, ...p.colours.map((c) => c.name), ...p.occasionIds, categories.find((c) => c.id === p.categoryId)?.name ?? ""].join(" ").toLowerCase(),
    })),
  };
  const commerceConfig: CommerceConfig = {
    markets, countries, shipping, taxRules, defaultMarketId: settings.defaultMarketId,
    paymentMethods: Object.fromEntries(markets.map((m) => [m.id, methodsForMarket(m, settings)])),
  };
  return { nav, commerceConfig };
}

/** Resolves homepage content (asset ids → images, bestseller mode → products). */
export async function getHomepageView() {
  "use cache";
  const [home, media, products, collections] = await Promise.all([content.getHomepage(), content.listMedia(), catalog.listProducts({ sort: "newest" }), catalog.listCollections()]);
  // Plain object (not a Map/function) so the cached result stays serializable.
  const images: Record<string, ProductImage> = Object.fromEntries(media.map((m: MediaAsset) => [m.id, m]));
  const bestsellers = home.bestsellers.mode === "manual" && home.bestsellers.productIds.length
    ? home.bestsellers.productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p)
    : [...products].sort((a, b) => (b.stats?.unitsSold30d ?? 0) - (a.stats?.unitsSold30d ?? 0));
  return {
    home: home as HomepageContent,
    images,
    // New pieces first, then the most recent of the rest, so the grid is always complete.
    newArrivals: [...products.filter((p) => p.isNew), ...products.filter((p) => !p.isNew)].slice(0, home.newArrivals.limit),
    bestsellers: bestsellers.slice(0, home.bestsellers.limit),
    featured: home.featuredCollectionIds.map((id) => collections.find((c) => c.id === id)).filter((c) => !!c),
  };
}
