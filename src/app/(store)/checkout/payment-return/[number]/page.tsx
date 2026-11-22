import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { orderForViewer } from "@/server/orders/checkout";
import { markFailed, reconcileOnReturn } from "@/server/payments/service";
import { provider } from "@/server/payments/providers";
import { PaymentPoller } from "./poller";

export const metadata: Metadata = pageMetadata({ title: "Confirming payment", description: "Payment status.", path: "/checkout", noIndex: true });

/**
 * Return from the hosted payment page. The URL is NOT trusted: we ask the provider for the
 * payment's real status (and the signed webhook does the same independently).
 */
async function Content({ params, searchParams }: PageProps<"/checkout/payment-return/[number]">) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : null;
  const order = await orderForViewer(decodeURIComponent(number), token);
  if (!order) redirect("/track-order");
  let status = await reconcileOnReturn(order.id);
  if (sp.cancelled && status === "pending") {
    const [payment] = await db.select().from(s.payments).where(eq(s.payments.orderId, order.id));
    const p = provider(payment.provider);
    const v = payment.providerReference && p?.verifyPayment ? await p.verifyPayment(payment.providerReference).catch(() => null) : null;
    if (v && v.status !== "paid") { await markFailed(payment.id, "Customer cancelled on the payment page"); status = "failed"; }
  }
  if (status === "paid") redirect(`/checkout/confirmation/${order.number}?t=${token ?? ""}`);
  if (status === "failed" || status === "cancelled") {
    return (
      <section className="gutter mx-auto max-w-[640px] py-32 text-center">
        <p className="eyebrow text-bronze">Order {order.number}</p>
        <h1 className="display mt-4 text-[clamp(36px,4vw,56px)]">Payment not completed</h1>
        <p className="mt-4 text-taupe">No money was taken and the order hasn&apos;t been confirmed. The pieces are still in your bag.</p>
        <div className="mt-10 flex justify-center gap-4"><ButtonLink href="/checkout">Try again</ButtonLink><ButtonLink href="/cart" variant="outline">View bag</ButtonLink></div>
      </section>
    );
  }
  return (
    <section className="gutter mx-auto max-w-[640px] py-32 text-center">
      <p className="eyebrow text-bronze">Order {order.number}</p>
      <h1 className="display mt-4 text-[clamp(36px,4vw,56px)]">Confirming your payment</h1>
      <p className="mt-4 text-taupe">We&apos;re waiting for our payment partner to confirm. This usually takes a few seconds — please don&apos;t pay again.</p>
      <PaymentPoller />
    </section>
  );
}

export default function Page(props: PageProps<"/checkout/payment-return/[number]">) {
  return <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}><Content {...props} /></Suspense>;
}
