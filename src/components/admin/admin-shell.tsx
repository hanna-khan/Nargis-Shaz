"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { NAV_PERMISSIONS, ROLES } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAdmin } from "./admin-context";

const NAV: { group: string; items: { href: string; label: string; icon: string }[] }[] = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "◇" }] },
  { group: "Catalogue", items: [{ href: "/admin/products", label: "Products", icon: "▢" }, { href: "/admin/categories", label: "Categories", icon: "≡" }, { href: "/admin/collections", label: "Collections", icon: "◠" }, { href: "/admin/inventory", label: "Inventory", icon: "▤" }] },
  { group: "Sales", items: [{ href: "/admin/orders", label: "Orders", icon: "◫" }, { href: "/admin/customers", label: "Customers", icon: "○" }, { href: "/admin/discounts", label: "Discounts", icon: "%" }] },
  { group: "Storefront", items: [{ href: "/admin/content", label: "Homepage content", icon: "❖" }, { href: "/admin/media", label: "Media library", icon: "▣" }] },
  { group: "Store", items: [{ href: "/admin/team", label: "Team & roles", icon: "◎" }, { href: "/admin/audit-log", label: "Audit log", icon: "☰" }, { href: "/admin/settings", label: "Settings", icon: "⚙" }] },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me, staff, previewAs, can, toast, orders } = useAdmin();
  const [open, setOpen] = useState(false);
  const pendingOrders = orders.filter((o) => o.fulfilmentStatus === "unfulfilled" || o.fulfilmentStatus === "processing").length;
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col bg-charcoal text-ivory/80">
      <Link href="/admin" className="px-6 pt-6 pb-1 font-serif text-[20px] tracking-[0.18em] text-ivory uppercase">Nargis<span className="mx-1 tracking-normal italic">&amp;</span>Shaz</Link>
      <p className="px-6 pb-5 text-[10px] tracking-[0.24em] text-camel uppercase">Studio</p>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(NAV_PERMISSIONS[i.href]));
          if (!items.length) return null;
          return (
            <div key={g.group} className="mt-4">
              <p className="px-3 pb-1.5 text-[9.5px] tracking-[0.24em] text-ivory/40 uppercase">{g.group}</p>
              {items.map((i) => (
                <Link key={i.href} href={i.href} onClick={() => setOpen(false)} aria-current={isActive(i.href) ? "page" : undefined}
                  className={cn("flex items-center gap-3 rounded-[3px] px-3 py-2 text-[13px] transition-colors", isActive(i.href) ? "bg-ivory/10 text-ivory" : "hover:bg-ivory/5 hover:text-ivory")}>
                  <span aria-hidden className="w-4 text-center text-[12px] opacity-70">{i.icon}</span>{i.label}
                  {i.href === "/admin/orders" && pendingOrders > 0 && <span className="ml-auto rounded-full bg-mocha px-1.5 text-[10.5px] text-white">{pendingOrders}</span>}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
      <Link href="/" className="border-t border-ivory/10 px-6 py-4 text-[12px] text-ivory/60 hover:text-ivory">View storefront ↗</Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f3eee6] text-charcoal [font-size:14px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block">{sidebar}</aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <motion.div className="absolute inset-0 bg-charcoal/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-[260px]" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.35 }}>{sidebar}</motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[248px]">
        {/* Authentication boundary notice — Phase 1 has no admin authentication. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-[#efe2c7] px-5 py-2 text-[12px] text-[#6b5126]" role="note">
          <strong className="font-medium">Preview mode</strong>
          <span>Admin authentication is not connected yet. Changes stay in this browser tab and are not saved.</span>
        </div>
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-[#f3eee6]/90 px-5 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-charcoal/60">
              Preview as
              <select value={me.id} onChange={(e) => previewAs(e.target.value)} className="rounded-[3px] border border-line bg-white px-2 py-1.5 text-[12.5px] text-charcoal">
                {staff.filter((s) => s.status === "active").map((s) => <option key={s.id} value={s.id}>{s.name} — {ROLES[s.roleId].name}</option>)}
              </select>
            </label>
            <span className="grid h-8 w-8 place-items-center rounded-full text-[12px] text-white" style={{ background: me.avatarTone }} aria-hidden>{me.name.split(" ").map((n) => n[0]).join("")}</span>
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] px-5 py-8 lg:px-8">{children}</main>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed right-6 bottom-6 z-[130] rounded-[3px] bg-charcoal px-4 py-3 text-[13px] text-ivory shadow-lg">{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
