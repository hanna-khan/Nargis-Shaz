import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PrintButton } from "@/components/admin/client";
import { fmtDate } from "@/components/admin/ui";
import { formatMoney } from "@/lib/commerce/currency";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { getSettings } from "@/server/settings";
import type { CurrencyCode } from "@/types";

/** Printable invoice / packing slip (print or "Save as PDF" from the browser). */
export async function OrderDocument({ id, kind }: { id: string; kind: "invoice" | "packing" }) {
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!o) notFound();
  const [items, addrs, settings] = await Promise.all([db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id)), db.select().from(s.orderAddresses).where(eq(s.orderAddresses.orderId, id)), getSettings()]);
  const a = addrs.find((x) => x.type === "shipping");
  const m = (n: number) => formatMoney(n, o.currency as CurrencyCode, { decimals: o.currency !== "PKR" });
  return (
    <div className="mx-auto max-w-[800px] bg-white p-10 text-[13px] print:p-0">
      <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
      <header className="flex items-start justify-between border-b border-line pb-6">
        <div><p className="font-serif text-[22px] tracking-[0.2em]">NARGIS &amp; SHAZ</p><p className="mt-1 whitespace-pre-line text-charcoal/60">{settings.legalName}{"\n"}{settings.address}{"\n"}{settings.supportEmail}</p></div>
        <div className="text-right"><p className="text-[20px]">{kind === "invoice" ? "Invoice" : "Packing slip"}</p><p className="mt-1">{o.number}</p><p className="text-charcoal/60">{fmtDate(o.placedAt)}</p></div>
      </header>
      <section className="grid grid-cols-2 gap-6 py-6">
        <div><p className="mb-1 text-[11px] tracking-[0.16em] text-charcoal/50 uppercase">Deliver to</p>{a && <p>{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.city}{a.region ? `, ${a.region}` : ""} {a.postalCode}<br />{a.countryCode}<br />{a.phone}</p>}</div>
        <div><p className="mb-1 text-[11px] tracking-[0.16em] text-charcoal/50 uppercase">Order</p><p>{o.email}<br />Delivery: {o.shippingLabel}<br />Payment: {o.paymentMethod} ({o.paymentStatus.replace(/_/g, " ")})</p></div>
      </section>
      <table className="w-full border-t border-line text-left">
        <thead><tr className="border-b border-line text-[11px] tracking-[0.14em] text-charcoal/55 uppercase"><th className="py-2 font-normal">Item</th><th className="py-2 font-normal">SKU</th><th className="py-2 font-normal">Qty</th>{kind === "invoice" && <><th className="py-2 text-right font-normal">Unit</th><th className="py-2 text-right font-normal">Total</th></>}{kind === "packing" && <th className="py-2 font-normal">Packed</th>}</tr></thead>
        <tbody>{items.map((i) => <tr key={i.id} className="border-b border-line/70"><td className="py-2.5">{i.productName}<span className="block text-[11.5px] text-charcoal/55">{i.colour} · {i.size}</span></td><td>{i.sku}</td><td>{i.quantity}</td>{kind === "invoice" && <><td className="text-right">{m(i.unitPrice)}</td><td className="text-right">{m(i.lineTotal)}</td></>}{kind === "packing" && <td>☐</td>}</tr>)}</tbody>
      </table>
      {kind === "invoice" && (
        <dl className="ml-auto mt-6 w-[300px] space-y-1.5">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{m(o.subtotal)}</dd></div>
          {o.discountTotal > 0 && <div className="flex justify-between"><dt>Discount {o.couponCode}</dt><dd>− {m(o.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{m(o.shippingTotal)}</dd></div>
          {o.taxTotal > 0 && <div className="flex justify-between"><dt>{o.taxLabel}</dt><dd>{m(o.taxTotal)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-[15px]"><dt>Total</dt><dd>{m(o.total)}</dd></div>
          {o.taxIncluded > 0 && <p className="text-[11.5px] text-charcoal/55">Includes {m(o.taxIncluded)} {o.taxLabel}</p>}
          {o.amountRefunded > 0 && <div className="flex justify-between"><dt>Refunded</dt><dd>− {m(o.amountRefunded)}</dd></div>}
        </dl>
      )}
      {o.customerNote && kind === "packing" && <p className="mt-6 rounded border border-line p-3">Customer note: {o.customerNote}</p>}
      <p className="mt-10 text-[11.5px] text-charcoal/50">Thank you for shopping with Nargis &amp; Shaz.</p>
    </div>
  );
}
