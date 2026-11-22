import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/(store)/actions";

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account/password", label: "Password" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/delete", label: "Delete account" },
];

export function AccountShell({ title, active, children, firstName }: { title: string; active: string; children: ReactNode; firstName: string }) {
  return (
    <section className="gutter grid gap-[clamp(28px,5vw,80px)] pt-14 pb-28 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Account" className="lg:pt-3">
        <p className="eyebrow text-bronze">Hello, {firstName}</p>
        <ul className="no-scrollbar mt-5 flex gap-5 overflow-x-auto border-b border-line pb-3 lg:block lg:space-y-3 lg:border-0">
          {NAV.map((n) => (
            <li key={n.href} className="shrink-0">
              <Link href={n.href} aria-current={active === n.href ? "page" : undefined} className={active === n.href ? "text-[14px] text-chocolate underline underline-offset-[6px]" : "text-[14px] text-taupe hover:text-chocolate"}>{n.label}</Link>
            </li>
          ))}
          <li className="shrink-0 lg:pt-4"><form action={logoutAction}><button className="text-[14px] text-taupe hover:text-chocolate">Sign out</button></form></li>
        </ul>
      </nav>
      <div className="min-w-0">
        <h1 className="display mb-10 text-[clamp(34px,4vw,52px)]">{title}</h1>
        {children}
      </div>
    </section>
  );
}

export function AuthCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="gutter mx-auto max-w-[520px] py-[clamp(56px,8vw,112px)]">
      <p className="eyebrow text-center text-bronze">{eyebrow}</p>
      <h1 className="display mt-4 mb-10 text-center text-[clamp(34px,4vw,52px)]">{title}</h1>
      {children}
    </section>
  );
}
