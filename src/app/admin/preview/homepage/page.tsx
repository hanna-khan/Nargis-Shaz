import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HomeSections } from "@/components/store/home/renderer";
import { ShopProvider } from "@/components/store/shop-context";
import { getStorefrontChrome } from "@/lib/services/storefront";
import { getStaff } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { loadDraftSections } from "@/server/cms/homepage";

export const metadata = { title: "Homepage preview", robots: { index: false, follow: false } };

/** Draft homepage rendered with the real storefront components (staff only). */
async function Preview() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (!hasPermission(staff.permissions, "content.view", staff.isSuperAdmin)) redirect("/admin");
  const [sections, { commerceConfig }] = await Promise.all([loadDraftSections(), getStorefrontChrome()]);
  return (
    <ShopProvider config={commerceConfig}>
      <div className="sticky top-0 z-[200] flex items-center justify-center gap-4 bg-bronze px-4 py-2 text-[12px] text-offwhite">
        <span>Preview of the unpublished draft — customers can&apos;t see this.</span>
        <Link href="/admin/homepage" className="underline">Back to editor</Link>
      </div>
      <main>{sections.some((x) => x.enabled) ? <HomeSections sections={sections} /> : <p className="py-40 text-center">No sections are enabled in the draft.</p>}</main>
    </ShopProvider>
  );
}

export default function PreviewPage() {
  return <Suspense fallback={<div className="min-h-screen" />}><Preview /></Suspense>;
}
