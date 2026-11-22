import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/commerce/currency";
import { cn } from "@/lib/utils";
import type { OrderView } from "@/server/orders/view";

const STATUS: Record<string, string> = { pending: "Order received", confirmed: "Confirmed", processing: "Being prepared", shipped: "On its way", delivered: "Delivered", cancelled: "Cancelled", returned: "Returned" };
const PAYMENT: Record<string, string> = { awaiting_cod: "Cash on delivery", pending: "Awaiting payment confirmation", paid: "Paid", failed: "Payment not completed", refunded: "Refunded", partially_refunded: "Partially refunded", voided: "Not charged", unpaid: "Unpaid" };
const STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Customer-facing order summary with a progress tracker, shipments and messages from the atelier. */
export function OrderDetail({ order: o }: { order: OrderView }) {
  const f = (n: number) => formatMoney(n, o.currency);
  const idx = STEPS.indexOf(o.status);
  return (
    <div className="grid gap-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-bronze">Order {o.number}</p>
          <p className="mt-2 font-serif text-[30px]">{STATUS[o.status] ?? o.status}</p>
          <p className="mt-1 text-[13px] text-taupe">Placed {fmtDate(o.placedAt)} · {PAYMENT[o.paymentStatus] ?? o.paymentStatus} · {o.paymentMethod}</p>
        </div>
      </div>

      {idx >= 0 && (
        <ol className="grid grid-cols-5 gap-2" aria-label="Order progress">
          {STEPS.map((st, i) => (
            <li key={st} className="text-center">
              <span className={cn("block h-[3px]", i <= idx ? "bg-chocolate" : "bg-line")} />
              <span className={cn("mt-2 block text-[10px] tracking-[0.14em] uppercase", i <= idx ? "text-chocolate" : "text-taupe/70")} aria-current={i === idx ? "step" : undefined}>{STATUS[st]}</span>
            </li>
          ))}
        </ol>
      )}

      {o.shipments.map((s) => (
        <section key={s.trackingNumber} className="border border-line p-6" aria-label="Shipment">
          <p className="label">{s.carrier} · {s.trackingNumber}</p>
          {s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="ulink mt-2 inline-block">Track with {s.carrier}</a>}
          <ul className="mt-4 space-y-2 text-[13.5px]">
            {s.events.map((e, i) => <li key={i} className="flex gap-4"><span className="w-32 shrink-0 text-taupe">{fmtTime(e.at)}</span><span>{e.description}{e.location ? ` — ${e.location}` : ""}</span></li>)}
          </ul>
        </section>
      ))}

      {o.messages.length > 0 && (
        <section aria-label="Messages">
          <h2 className="eyebrow mb-4">Messages from our team</h2>
          <ul className="space-y-3">{o.messages.map((m, i) => <li key={i} className="bg-paper p-5 text-[14px]"><span className="block text-[12px] text-taupe">{fmtTime(m.at)}</span>{m.body}</li>)}</ul>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <ul className="border-t border-line">
          {o.items.map((i) => (
            <li key={i.id} className="grid grid-cols-[72px_1fr_auto] items-center gap-5 border-b border-line py-5">
              <div className="relative aspect-[3/4] bg-stone/50">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="72px" className="object-cover" />}</div>
              <div><Link href={`/products/${i.slug}`} className="font-serif text-[18px]">{i.name}</Link><p className="text-[12.5px] text-taupe">{i.colour} · {i.size} · Qty {i.quantity}</p></div>
              <p className="text-[14px]">{f(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <aside className="space-y-8">
          <dl className="space-y-2.5 text-[14px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{f(o.totals.subtotal)}</dd></div>
            {o.totals.discount > 0 && <div className="flex justify-between"><dt>Discount{o.couponCode ? ` (${o.couponCode})` : ""}</dt><dd>− {f(o.totals.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{o.totals.shipping ? f(o.totals.shipping) : "Complimentary"}</dd></div>
            {o.totals.tax > 0 && <div className="flex justify-between"><dt>{o.totals.taxLabel ?? "Tax"}</dt><dd>{f(o.totals.tax)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-[16px]"><dt>Total</dt><dd>{f(o.totals.total)}</dd></div>
            {o.totals.taxIncluded > 0 && <p className="text-[12px] text-taupe">Includes {f(o.totals.taxIncluded)} {o.totals.taxLabel}</p>}
            {o.totals.refunded > 0 && <div className="flex justify-between text-success"><dt>Refunded</dt><dd>{f(o.totals.refunded)}</dd></div>}
          </dl>
          {o.address && (
            <div className="text-[14px]">
              <p className="eyebrow mb-2">Delivery</p>
              <p>{o.address.firstName} {o.address.lastName}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}<br />{o.address.city}{o.address.region ? `, ${o.address.region}` : ""} {o.address.postalCode ?? ""}<br />{o.address.countryCode}</p>
              <p className="mt-2 text-taupe">{o.shippingLabel}</p>
            </div>
          )}
          <p className="text-[13px] text-taupe">Questions about this order? <Link href="/customer-care#contact" className="underline">Contact client care</Link> and quote {o.number}.</p>
        </aside>
      </div>
    </div>
  );
}
