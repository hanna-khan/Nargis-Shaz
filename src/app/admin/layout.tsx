import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminProvider, type AdminData } from "@/components/admin/admin-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { catalog, commerce, content, operations } from "@/lib/repositories";

// Private area: never indexed, never followed.
export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio · Nargis & Shaz" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

/**
 * Phase 2: `await requirePermission(...)` / getStaffSession() here (cookies → request-time),
 * which is why data loading already sits inside <Suspense>.
 */
async function AdminData({ children }: { children: React.ReactNode }) {
  const [products, categories, collections, orders, customers, discounts, staff, audit, settings, media, homepage, markets, countries, shipping, taxRules, sales] = await Promise.all([
    catalog.listProducts(), catalog.listCategories(), catalog.listCollections({ includeDrafts: true }), operations.listOrders(), operations.listCustomers(),
    operations.listDiscounts(), operations.listStaff(), operations.listAuditLog(), operations.getSettings(), content.listMedia(), content.getHomepage(),
    commerce.listMarkets(), commerce.listCountries(), commerce.listShippingMethods(), commerce.listTaxRules(), operations.getSalesSeries(),
  ]);
  const data: AdminData = { products, categories, collections, orders, customers, discounts, staff, audit, settings, media, homepage, markets, countries, shipping, taxRules, sales };
  return (
    <AdminProvider data={data}>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3eee6]" />}>
      <AdminData>{children}</AdminData>
    </Suspense>
  );
}
