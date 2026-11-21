import { CartDrawer } from "@/components/store/cart-drawer";
import { ShopProvider } from "@/components/store/shop-context";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { PageTransition } from "@/components/store/page-transition";
import { JsonLd } from "@/components/ui/misc";
import { getStorefrontChrome } from "@/lib/services/storefront";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { nav, commerceConfig } = await getStorefrontChrome();
  return (
    <ShopProvider config={commerceConfig}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-paper focus:px-4 focus:py-2">Skip to content</a>
      <SiteHeader nav={nav} />
      <main id="main">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter nav={nav} />
      <CartDrawer />
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
    </ShopProvider>
  );
}
