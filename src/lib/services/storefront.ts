import "server-only";
import { catalog, commerce, content } from "@/lib/repositories";
import type { CommerceConfig } from "@/components/store/shop-context";
import type { NavData, NavItem, NavLink, NavPanel } from "@/components/store/navigation-types";
import type { Collection, Product, ProductImage } from "@/types";

export const categoryHref = (slug: string) => `/shop/${slug}`;
export const collectionHref = (c: Pick<Collection, "slug" | "occasionId">) => (c.occasionId ? `/${c.occasionId}` : `/collections/${c.slug}`);

/** Everything the storefront chrome needs, from MySQL (cached; invalidated by Studio edits). */
export async function getStorefrontChrome(): Promise<{ nav: NavData; commerceConfig: CommerceConfig }> {
  const [categories, collections, products, settings, menus, cfg] = await Promise.all([
    catalog.listCategories(), catalog.listCollections(), catalog.listProducts(), content.settings(), content.navigation(), commerce.load(),
  ]);
  const used = categories.filter((c) => products.some((p) => p.categoryId === c.id)); // never link to an empty category
  const catLinks: NavLink[] = used.map((c) => ({ name: c.name, href: categoryHref(c.slug), image: c.image }));
  const occasionCols = collections.filter((c) => c.occasionId && products.some((p) => p.occasionIds.includes(c.occasionId!)));
  const editorialCols = collections.filter((c) => !c.occasionId);
  const occLinks: NavLink[] = occasionCols.map((c) => ({ name: c.name, href: collectionHref(c), image: c.hero }));
  const colLinks: NavLink[] = editorialCols.map((c) => ({ name: c.name, href: collectionHref(c), image: c.hero }));
  const occCats = (occ: string) => used.filter((c) => products.some((p) => p.occasionIds.includes(occ as Product["occasionIds"][number]) && p.categoryId === c.id))
    .map((c) => ({ name: c.name, href: `/${occ}?category=${c.id}`, image: c.image }));
  const newest = products.find((p) => p.isNew);
  const feature = (c: Collection | undefined, cta = "Discover") => c ? [{ eyebrow: c.eyebrow, title: c.name, href: collectionHref(c), cta, image: c.hero }] : [];

  const panelFor = (panel: string): NavPanel | undefined => {
    if (panel === "shop") {
      return {
        preview: true,
        columns: [
          { title: "Clothing", links: [{ name: "New in", href: "/new-arrivals", image: newest?.colours[0]?.images[0] }, ...catLinks, { name: "View all clothing", href: "/shop" }] },
          { title: "Shop by occasion", links: [...occLinks, { name: "Bestsellers", href: "/shop?sort=bestselling" }] },
        ],
        features: feature(editorialCols.find((c) => c.seasonal) ?? editorialCols[0]),
      };
    }
    if (panel.startsWith("occasion:")) {
      const occ = panel.slice(9);
      const col = collections.find((c) => c.occasionId === occ);
      const links = occCats(occ);
      if (!col || !links.length) return undefined;
      const related = editorialCols.find((c) => products.some((p) => p.collectionIds.includes(c.id) && p.occasionIds.includes(occ as Product["occasionIds"][number])));
      return {
        columns: [{ title: col.eyebrow || col.name, links: [{ name: `All ${col.name.toLowerCase()}`, href: collectionHref(col) }, ...links] }],
        features: [...feature(col, "Shop the edit"), ...feature(related)].slice(0, 2),
      };
    }
    if (panel === "collections") {
      return {
        columns: [{ title: "Collections", links: colLinks }, { title: "The house", links: [{ name: "Our story", href: "/our-story" }, { name: "The atelier", href: "/our-story#craft" }, { name: "Customer care", href: "/customer-care" }] }],
        features: editorialCols.slice(0, 2).flatMap((c) => feature(c)),
      };
    }
    return undefined;
  };

  const primary: NavItem[] = (menus.header ?? []).map((m, i) => ({ id: `${m.panel.replace(/\W/g, "-")}-${i}`, label: m.label, href: m.href, panel: panelFor(m.panel) }));
  const bestsellers = [...products].sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller) || (b.stats?.unitsSold30d ?? 0) - (a.stats?.unitsSold30d ?? 0)).slice(0, 4);

  const nav: NavData = {
    announcement: settings.announcement.enabled ? settings.announcement.message : "",
    announcementHref: settings.announcement.href || null,
    categories: catLinks,
    occasions: occLinks,
    collections: colLinks,
    paymentNote: settings.paymentNote,
    primary,
    footer: [
      { title: "Shop", links: (menus["footer-shop"] ?? []).map((l) => ({ name: l.label, href: l.href })) },
      { title: "Client care", links: (menus["footer-care"] ?? []).map((l) => ({ name: l.label, href: l.href })) },
      { title: "The house", links: (menus["footer-house"] ?? []).map((l) => ({ name: l.label, href: l.href })) },
    ].filter((c) => c.links.length),
    about: settings.footer.about,
    copyright: settings.footer.copyright,
    social: (Object.entries(settings.social) as [string, string][]).filter(([, url]) => /^https:\/\//.test(url)).map(([k, url]) => ({ name: k[0].toUpperCase() + k.slice(1), url })),
    searchIndex: bestsellers.map((p) => ({ id: p.id, name: p.name, subtitle: p.subtitle, href: `/products/${p.slug}`, image: p.colours[0]?.images[0] as ProductImage, prices: p.prices, keywords: "" })),
  };

  const commerceConfig: CommerceConfig = {
    markets: cfg.markets, countries: cfg.countries, taxRules: cfg.taxRules, defaultMarketId: settings.defaultMarketId,
    shipping: cfg.shipping,
    paymentMethods: Object.fromEntries(cfg.markets.map((m) => [m.id, cfg.paymentMethods.filter((p) => p.marketIds.includes(m.id)).map((p) => ({ id: p.id, kind: p.kind, label: p.label, description: p.description }))])),
  };
  return { nav, commerceConfig };
}
