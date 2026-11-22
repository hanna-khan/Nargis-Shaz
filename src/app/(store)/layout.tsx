import { CartDrawer } from "@/components/store/cart-drawer";
import { ShopProvider } from "@/components/store/shop-context";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader, SiteHeaderView } from "@/components/store/site-header";
import { Suspense } from "react";
import { Lockup } from "@/components/brand/logo";
import { JsonLd } from "@/components/ui/misc";
import { content } from "@/lib/repositories";
import { getStorefrontChrome } from "@/lib/services/storefront";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [{ nav, commerceConfig }, settings] = await Promise.all([getStorefrontChrome(), content.settings()]);
  if (settings.maintenance.enabled) {
    return (
      <main id="main" className="grid min-h-screen place-items-center bg-offwhite px-6 text-center text-chocolate">
        <div><div className="flex justify-center"><Lockup /></div><p className="mx-auto mt-10 max-w-[460px] text-[16px] text-taupe">{settings.maintenance.message}</p><p className="mt-6 text-[13px] text-taupe">{settings.supportEmail}</p></div>
      </main>
    );
  }
  return (
    <ShopProvider config={commerceConfig}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-paper focus:px-4 focus:py-2">Skip to content</a>
      <Suspense fallback={<SiteHeaderView nav={nav} pathname="" />}><SiteHeader nav={nav} /></Suspense>
      <main id="main">{children}</main>
      <SiteFooter nav={nav} />
      <CartDrawer />
      <JsonLd data={organizationJsonLd(settings)} />
      <JsonLd data={websiteJsonLd()} />
    </ShopProvider>
  );
}
