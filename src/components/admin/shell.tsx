"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NavGroup { group: string; items: { href: string; label: string; badge?: number }[] }

export function AdminShell({ nav, staff, children, signOut }: { nav: NavGroup[]; staff: { name: string; email: string; roles: string }; children: ReactNode; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <nav aria-label="Studio" className="flex h-full flex-col bg-charcoal text-ivory/80">
      <Link href="/admin" className="px-6 pt-6 pb-1 font-serif text-[20px] tracking-[0.18em] text-ivory uppercase">Nargis<span className="mx-1 tracking-normal italic">&amp;</span>Shaz</Link>
      <p className="px-6 pb-5 text-[10px] tracking-[0.24em] text-camel uppercase">Studio</p>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {nav.map((g) => (
          <div key={g.group} className="mt-4">
            <p className="px-3 pb-1.5 text-[9.5px] tracking-[0.24em] text-ivory/40 uppercase">{g.group}</p>
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setOpen(false)} aria-current={isActive(i.href) ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-[3px] px-3 py-2 text-[13px] transition-colors", isActive(i.href) ? "bg-ivory/10 text-ivory" : "hover:bg-ivory/5 hover:text-ivory")}>
                {i.label}
                {!!i.badge && <span className="ml-auto rounded-full bg-mocha px-1.5 text-[10.5px] text-white">{i.badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <Link href="/" target="_blank" className="border-t border-ivory/10 px-6 py-4 text-[12px] text-ivory/60 hover:text-ivory">View storefront ↗</Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f3eee6] text-charcoal [font-size:14px] print:bg-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block print:hidden">{sidebar}</aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <motion.div className="absolute inset-0 bg-charcoal/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-[260px]" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.35 }}>{sidebar}</motion.aside>
          </div>
        )}
      </AnimatePresence>
      <div className="lg:pl-[248px] print:pl-0">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-[#f3eee6]/90 px-5 py-3 backdrop-blur print:hidden">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right leading-tight">
              <p className="text-[13px]">{staff.name}</p>
              <p className="text-[11px] text-charcoal/55">{staff.roles}</p>
            </div>
            <form action={signOut}><button className="rounded-[3px] border border-line bg-white px-3 py-1.5 text-[12px] hover:border-charcoal">Sign out</button></form>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1320px] px-5 py-8 lg:px-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}
