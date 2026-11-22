import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account/account-shell";
import { OrderDetail } from "@/components/store/account/order-detail";
import { pageMetadata } from "@/lib/seo";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { orderView } from "@/server/orders/view";
import { AccountFallback, requireCustomerPage } from "../../_shared";

export const metadata: Metadata = pageMetadata({ title: "Order details", description: "Order details and tracking.", path: "/account/orders", noIndex: true });

async function Content({ params }: { params: PageProps<"/account/orders/[number]">["params"] }) {
  const { number } = await params;
  const c = await requireCustomerPage(`/account/orders/${number}`);
  const [o] = await db.select({ id: s.orders.id }).from(s.orders).where(and(eq(s.orders.number, decodeURIComponent(number)), eq(s.orders.userId, c.id)));
  if (!o) notFound();
  const view = await orderView(o.id);
  return (
    <AccountShell title="Order details" active="/account/orders" firstName={c.firstName}>
      <Link href="/account/orders" className="ulink mb-8 inline-block">← All orders</Link>
      <OrderDetail order={view!} />
    </AccountShell>
  );
}

export default function Page(props: PageProps<"/account/orders/[number]">) { return <Suspense fallback={<AccountFallback />}><Content params={props.params} /></Suspense>; }
