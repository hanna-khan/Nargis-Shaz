import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account/account-shell";
import { ResendVerification } from "@/components/store/account/forms";
import { formatMoney } from "@/lib/commerce/currency";
import { pageMetadata } from "@/lib/seo";
import { ordersForCustomer } from "@/server/orders/view";
import { AccountFallback, requireCustomerPage } from "./_shared";
import type { CurrencyCode } from "@/types";

export const metadata: Metadata = pageMetadata({ title: "Your Account", description: "Your Nargis & Shaz account.", path: "/account", noIndex: true });

async function Overview() {
  const c = await requireCustomerPage("/account");
  const orders = await ordersForCustomer(c.id);
  const recent = orders.slice(0, 3);
  return (
    <AccountShell title="Your account" active="/account" firstName={c.firstName}>
      {!c.emailVerified && <p className="mb-8 bg-[#f3e6cf] px-5 py-4 text-[14px]">Please confirm your email address ({c.email}). <ResendVerification /></p>}
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/account/orders" className="border border-line p-6 hover:border-chocolate"><p className="eyebrow">Orders</p><p className="mt-3 font-serif text-[32px]">{orders.length}</p></Link>
        <Link href="/account/addresses" className="border border-line p-6 hover:border-chocolate"><p className="eyebrow">Addresses</p><p className="mt-3 text-[14px] text-taupe">Manage delivery addresses</p></Link>
        <Link href="/wishlist" className="border border-line p-6 hover:border-chocolate"><p className="eyebrow">Wishlist</p><p className="mt-3 text-[14px] text-taupe">Pieces saved for later</p></Link>
      </div>
      <h2 className="eyebrow mt-14 mb-4">Recent orders</h2>
      {recent.length ? (
        <ul className="border-t border-line">
          {recent.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 text-[14px]">
              <Link href={`/account/orders/${o.number}`} className="label hover:text-bronze">{o.number}</Link>
              <span className="text-taupe">{o.placedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="capitalize">{o.status}</span>
              <span>{formatMoney(o.total, o.currency as CurrencyCode)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-[14px] text-taupe">You haven&apos;t placed an order yet. <Link href="/new-arrivals" className="underline">Discover new arrivals</Link>.</p>}
    </AccountShell>
  );
}

export default function AccountPage() {
  return <Suspense fallback={<AccountFallback />}><Overview /></Suspense>;
}
