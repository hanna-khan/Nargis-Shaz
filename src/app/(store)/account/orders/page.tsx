import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account/account-shell";
import { formatMoney } from "@/lib/commerce/currency";
import { pageMetadata } from "@/lib/seo";
import { ordersForCustomer } from "@/server/orders/view";
import { AccountFallback, requireCustomerPage } from "../_shared";
import type { CurrencyCode } from "@/types";

export const metadata: Metadata = pageMetadata({ title: "Your orders", description: "Your orders.", path: "/account/orders", noIndex: true });

async function Content() {
  const c = await requireCustomerPage("/account/orders");
  const orders = await ordersForCustomer(c.id);
  return (
    <AccountShell title="Orders" active="/account/orders" firstName={c.firstName}>
      {orders.length ? (
        <table className="w-full text-left text-[14px]">
          <thead><tr className="border-b border-line text-[10.5px] tracking-[0.18em] text-taupe uppercase"><th className="py-3 font-normal">Order</th><th className="py-3 font-normal">Date</th><th className="py-3 font-normal">Status</th><th className="py-3 text-right font-normal">Total</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line">
                <td className="py-4"><Link href={`/account/orders/${o.number}`} className="label hover:text-bronze">{o.number}</Link></td>
                <td className="py-4 text-taupe">{o.placedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="py-4 capitalize">{o.status}</td>
                <td className="py-4 text-right">{formatMoney(o.total, o.currency as CurrencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-[14px] text-taupe">No orders yet. <Link href="/new-arrivals" className="underline">Discover new arrivals</Link>.</p>}
    </AccountShell>
  );
}

export default function Page() { return <Suspense fallback={<AccountFallback />}><Content /></Suspense>; }
