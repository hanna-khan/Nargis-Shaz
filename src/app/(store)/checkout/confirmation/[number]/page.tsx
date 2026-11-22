import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderDetail } from "@/components/store/account/order-detail";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/commerce/currency";
import { pageMetadata } from "@/lib/seo";
import { getCustomer } from "@/server/auth/session";
import { orderForViewer } from "@/server/orders/checkout";
import { orderView } from "@/server/orders/view";

export const metadata: Metadata = pageMetadata({ title: "Thank you", description: "Order confirmation.", path: "/checkout", noIndex: true });

async function Content({ params, searchParams }: PageProps<"/checkout/confirmation/[number]">) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const order = await orderForViewer(decodeURIComponent(number), typeof sp.t === "string" ? sp.t : null);
  if (!order) return <section className="gutter py-32 text-center"><h1 className="display text-[40px]">Order not found</h1><p className="mt-4 text-taupe">This link has expired. Track your order with its number and your email.</p><ButtonLink href="/track-order" className="mt-8">Track an order</ButtonLink></section>;
  const [view, customer] = await Promise.all([orderView(order.id), getCustomer()]);
  const cod = order.paymentStatus === "awaiting_cod";
  return (
    <section className="gutter mx-auto max-w-[1100px] py-[clamp(56px,8vw,112px)]">
      <div className="mb-14 text-center">
        <p className="eyebrow text-bronze">{order.paymentStatus === "paid" || cod ? "Order received" : "Payment pending"}</p>
        <h1 className="display mt-4 text-[clamp(40px,5vw,64px)]">Thank you</h1>
        <p className="mx-auto mt-4 max-w-[560px] text-taupe">
          Order <strong className="font-normal text-chocolate">{order.number}</strong> for {formatMoney(order.total, view!.currency)}.{" "}
          {cod ? "Please have the exact amount ready for the courier. Our team may call to confirm before dispatch." : order.paymentStatus === "paid" ? "Your payment has been received." : "We'll confirm your order as soon as the payment is verified."}
        </p>
        <p className="mt-3 text-[13px] text-taupe">A confirmation will be sent to {order.email}.</p>
        {!customer && <p className="mt-6 text-[14px]"><Link href="/account/register?next=/account/orders" className="underline underline-offset-4">Create an account</Link> with this email to follow your orders — this order is added once you confirm your email.</p>}
      </div>
      <OrderDetail order={view!} />
    </section>
  );
}

export default function Page(props: PageProps<"/checkout/confirmation/[number]">) {
  return <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}><Content {...props} /></Suspense>;
}
