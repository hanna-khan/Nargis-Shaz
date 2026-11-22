import { and, eq, inArray, sql } from "drizzle-orm";
import { Suspense } from "react";
import { AdminShell, type NavGroup } from "@/components/admin/shell";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import type { Permission } from "@/server/auth/permissions";
import { staffLogoutAction } from "../_actions/auth";

const NAV: { group: string; items: { href: string; label: string; perm: Permission }[] }[] = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", perm: "dashboard.view" }] },
  { group: "Sales", items: [
    { href: "/admin/orders", label: "Orders", perm: "orders.view" }, { href: "/admin/returns", label: "Returns", perm: "returns.view" },
    { href: "/admin/customers", label: "Customers", perm: "customers.view" }, { href: "/admin/coupons", label: "Coupons", perm: "coupons.view" },
  ] },
  { group: "Catalogue", items: [
    { href: "/admin/products", label: "Products", perm: "products.view" }, { href: "/admin/categories", label: "Categories", perm: "categories.view" },
    { href: "/admin/collections", label: "Collections", perm: "categories.view" }, { href: "/admin/inventory", label: "Inventory", perm: "inventory.view" },
  ] },
  { group: "Storefront", items: [
    { href: "/admin/homepage", label: "Homepage", perm: "content.view" }, { href: "/admin/content", label: "Pages & navigation", perm: "content.view" },
    { href: "/admin/media", label: "Media library", perm: "media.view" },
  ] },
  { group: "Operations", items: [
    { href: "/admin/shipping", label: "Shipping", perm: "shipping.view" }, { href: "/admin/payments", label: "Payments", perm: "payments.view" },
    { href: "/admin/reports", label: "Reports", perm: "reports.view" }, { href: "/admin/messages", label: "Messages & emails", perm: "notifications.view" },
  ] },
  { group: "Store", items: [
    { href: "/admin/staff", label: "Staff & roles", perm: "staff.view" }, { href: "/admin/audit-log", label: "Audit log", perm: "audit.view" },
    { href: "/admin/settings", label: "Settings", perm: "settings.view" },
  ] },
];

async function Studio({ children }: { children: React.ReactNode }) {
  const { staff } = await staffPage();
  const [[pending], [messages]] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(s.orders).where(inArray(s.orders.status, ["pending", "confirmed", "processing"])),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.contactMessages).where(and(eq(s.contactMessages.status, "new"))),
  ]);
  const badges: Record<string, number> = { "/admin/orders": Number(pending.n), "/admin/messages": Number(messages.n) };
  const nav: NavGroup[] = NAV.map((g) => ({ group: g.group, items: g.items.filter((i) => staffCan(staff, i.perm)).map((i) => ({ href: i.href, label: i.label, badge: badges[i.href] })) })).filter((g) => g.items.length);
  return (
    <AdminShell nav={nav} staff={{ name: staff.name, email: staff.email, roles: staff.isSuperAdmin ? "Super Admin" : staff.roles.map((r) => r.name).join(", ") || "No role" }} signOut={staffLogoutAction}>
      {children}
    </AdminShell>
  );
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#f3eee6]" aria-busy="true" />}><Studio>{children}</Studio></Suspense>;
}
