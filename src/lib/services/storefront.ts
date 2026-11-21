import "server-only";
import { catalog, commerce, content, operations } from "@/lib/repositories";
import { methodsForMarket } from "@/lib/payments/registry";
import type { CommerceConfig } from "@/components/store/shop-context";
import type { NavData } from "@/components/store/navigation-types";

/** Everything the storefront chrome needs, assembled once per build (Supabase: cache-tagged). */
export async function getStorefrontChrome(): Promise<{ nav: NavData; commerceConfig: CommerceConfig }> {
  "use cache";
  const [categories, collections, products, home, markets, countries, shipping, taxRules, settings] = await Promise.all([
    catalog.listCategories(), catalog.listCollections(), catalog.listProducts(), content.getHomepage(),
    commerce.listMarkets(), commerce.listCountries(), commerce.listShippingMethods(), commerce.listTaxRules(), operations.getSettings(),
  ]);
  const occasionCols = collections.filter((c) => c.occasionId);
  const nav: NavData = {
    announcement: home.announcement,
    categories: categories.map((c) => ({ name: c.name, href: `/shop?category=${c.id}` })),
    occasions: occasionCols.map((c) => ({ name: c.name, href: `/${c.occasionId}`, image: c.hero })),
    collections: collections.filter((c) => !c.occasionId).map((c) => ({ name: c.name, href: `/collections/${c.slug}` })),
    searchIndex: products.map((p) => ({
      id: p.id, name: p.name, subtitle: p.subtitle, href: `/products/${p.slug}`, image: p.colours[0].images[0], prices: p.prices,
      keywords: [p.name, p.subtitle, p.fabric, ...p.colours.map((c) => c.name), ...p.occasionIds, categories.find((c) => c.id === p.categoryId)?.name ?? ""].join(" ").toLowerCase(),
    })),
  };
  // Settings only expose public payment display config — secrets never leave the server.
  const commerceConfig: CommerceConfig = {
    markets, countries, shipping, taxRules, defaultMarketId: settings.defaultMarketId,
    paymentMethods: Object.fromEntries(markets.map((m) => [m.id, methodsForMarket(m, settings)])),
  };
  return { nav, commerceConfig };
}
