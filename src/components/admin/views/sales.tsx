"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/commerce/currency";
import { PAYMENT_METHODS } from "@/lib/payments/registry";
import { formatDate } from "@/lib/utils";
import type { CurrencyCode, Discount, FulfilmentStatus, Order } from "@/types";
import { useAdmin } from "../admin-context";
import { AButton, AInput, ASelect, ATextarea, Card, DataTable, Gate, Modal, NoAccess, PageHeader, Status, Tabs, Toggle } from "../ui";

const MARKET_NAME: Record<string, string> = { pk: "Pakistan", gb: "United Kingdom", eu: "Europe", us: "United States", intl: "Rest of world" };

/* ───────────── Orders ───────────── */

export function OrdersView() {
  const { orders, can } = useAdmin();
  const [tab, setTab] = useState<"all" | "open" | "cod" | "issues">("all");
  const [market, setMarket] = useState("all");
  if (!can("orders.view")) return <NoAccess perm="orders.view" />;
  const showMoney = can("finance.view");
  const rows = orders.filter((o) => (market === "all" || o.marketId === market) && (tab === "all" || (tab === "open" ? ["unfulfilled", "processing"].includes(o.fulfilmentStatus) : tab === "cod" ? o.paymentKind === "cod" : ["failed", "refunded", "pending"].includes(o.paymentStatus))));
  return (
    <>
      <PageHeader title="Orders" description="Domestic and international orders. Payment status is set only by verified provider callbacks or staff." actions={<Gate perm="orders.export"><AButton variant="outline">Export CSV</AButton></Gate>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: orders.length }, { id: "open", label: "To fulfil", count: orders.filter((o) => ["unfulfilled", "processing"].includes(o.fulfilmentStatus)).length }, { id: "cod", label: "Cash on delivery", count: orders.filter((o) => o.paymentKind === "cod").length }, { id: "issues", label: "Needs attention", count: orders.filter((o) => ["failed", "refunded", "pending"].includes(o.paymentStatus)).length }]} />
      <DataTable rows={rows} getId={(o) => o.id} onRowHref={(o) => `/admin/orders/${o.id}`} search={(o) => `${o.number} ${o.email} ${o.shippingAddress.firstName} ${o.shippingAddress.lastName}`}
        toolbar={<ASelect value={market} onChange={(e) => setMarket(e.target.value)} className="!w-auto !py-1.5" aria-label="Market"><option value="all">All markets</option>{Object.entries(MARKET_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</ASelect>}
        columns={[
          { key: "n", header: "Order", sort: (o) => o.number, cell: (o) => <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link> },
          { key: "d", header: "Date", sort: (o) => o.createdAt, cell: (o) => formatDate(o.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
          { key: "c", header: "Customer", cell: (o) => <div><p>{o.shippingAddress.firstName} {o.shippingAddress.lastName}</p><p className="text-[12px] text-charcoal/50">{o.countryCode} · {MARKET_NAME[o.marketId]}</p></div> },
          { key: "p", header: "Payment", cell: (o) => <div className="space-y-1"><Status value={o.paymentStatus} /><p className="text-[11.5px] text-charcoal/50">{PAYMENT_METHODS[o.paymentMethodId]?.label}</p></div> },
          { key: "f", header: "Fulfilment", sort: (o) => o.fulfilmentStatus, cell: (o) => <Status value={o.fulfilmentStatus} /> },
          { key: "t", header: "Total", className: "text-right", sort: (o) => o.totals.total, cell: (o) => <span className="block text-right">{showMoney ? formatMoney(o.totals.total, o.currency) : "—"}</span> },
        ]} />
    </>
  );
}

const NEXT: Partial<Record<FulfilmentStatus, FulfilmentStatus>> = { unfulfilled: "processing", processing: "shipped", shipped: "delivered" };

export function OrderDetail({ id }: { id: string }) {
  const { orders, products, updateOrder, can, customers } = useAdmin();
  const [refund, setRefund] = useState(false);
  const [note, setNote] = useState("");
  const o = orders.find((x) => x.id === id);
  if (!can("orders.view")) return <NoAccess perm="orders.view" />;
  if (!o) return <p>Order not found. <Link href="/admin/orders" className="underline">Back</Link></p>;
  const money = (n: number) => (can("finance.view") ? formatMoney(n, o.currency) : "—");
  const next = NEXT[o.fulfilmentStatus];
  const customer = customers.find((c) => c.id === o.customerId);
  return (
    <>
      <PageHeader title={`Order ${o.number}`} description={`Placed ${formatDate(o.createdAt, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} · ${MARKET_NAME[o.marketId]} · ${o.currency}`} back={{ href: "/admin/orders", label: "Orders" }}
        actions={<>
          {o.paymentKind === "cod" && o.paymentStatus === "awaiting_cod" && o.fulfilmentStatus === "delivered" && <Gate perm="orders.update"><AButton variant="outline" onClick={() => updateOrder(o.id, { paymentStatus: "paid", note: "Cash collected by courier and reconciled" })}>Mark cash collected</AButton></Gate>}
          {next && <Gate perm="orders.update"><AButton onClick={() => updateOrder(o.id, { fulfilmentStatus: next })}>Mark as {next}</AButton></Gate>}
          {o.paymentStatus === "paid" && <Gate perm="finance.refund"><AButton variant="danger" onClick={() => setRefund(true)}>Refund</AButton></Gate>}
        </>} />
      <div className="mb-6 flex flex-wrap gap-2"><Status value={o.paymentStatus} /><Status value={o.fulfilmentStatus} /></div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title="Items" padded={false}>
            <ul>{o.lines.map((l) => {
              const p = products.find((x) => x.id === l.productId);
              return (
                <li key={l.variantId} className="flex items-center justify-between gap-4 border-b border-line/70 px-5 py-3.5 last:border-0">
                  <div><p className="font-medium">{p ? <Link href={`/admin/products/${p.id}`} className="hover:underline">{l.name}</Link> : l.name}</p><p className="text-[12px] text-charcoal/55">{l.colour} · {l.size} · × {l.quantity}</p></div>
                  <p>{money(l.unitPrice * l.quantity)}</p>
                </li>
              );
            })}</ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-[13px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Shipping</dt><dd>{o.totals.shipping ? money(o.totals.shipping) : "Free"}</dd></div>
              {o.totals.discount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>− {money(o.totals.discount)}</dd></div>}
              <div className="flex justify-between pt-1.5 text-[15px] font-medium"><dt>Total</dt><dd>{money(o.totals.total)}</dd></div>
              {o.totals.taxIncluded > 0 && <p className="text-[12px] text-charcoal/50">Includes {money(o.totals.taxIncluded)} tax</p>}
            </dl>
          </Card>
          <Card title="Timeline">
            <Gate perm="orders.update">
              <form className="mb-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { updateOrder(o.id, { note }); setNote(""); } }}>
                <AInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" aria-label="Internal note" />
                <AButton type="submit" variant="outline">Add</AButton>
              </form>
            </Gate>
            <ol className="space-y-4 border-l border-line pl-5">
              {o.timeline.map((t, i) => <li key={i} className="relative text-[13px]"><span className="absolute top-1.5 -left-[24.5px] h-2 w-2 rounded-full bg-mocha" /><p>{t.message}</p><p className="text-[11.5px] text-charcoal/50">{t.actor} · {formatDate(t.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></li>)}
            </ol>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-medium">{o.shippingAddress.firstName} {o.shippingAddress.lastName}</p>
            <p className="text-[13px] text-charcoal/65">{o.email}</p>
            <p className="text-[13px] text-charcoal/65">{o.shippingAddress.phone}</p>
            {customer && <p className="mt-2 text-[12px] text-charcoal/50">{customer.orderCount} orders · customer since {formatDate(customer.createdAt, { month: "short", year: "numeric" })}</p>}
          </Card>
          <Card title="Shipping address">
            <address className="text-[13px] leading-relaxed not-italic">{o.shippingAddress.line1}<br />{o.shippingAddress.city}{o.shippingAddress.postalCode ? `, ${o.shippingAddress.postalCode}` : ""}<br />{o.countryCode}</address>
            <p className="mt-3 text-[12px] text-charcoal/55">Method: {o.shippingMethodId.replace("-", " · ")}</p>
          </Card>
          <Card title="Payment">
            <p className="text-[13px]">{PAYMENT_METHODS[o.paymentMethodId]?.label}</p>
            <p className="mt-2 text-[12px] text-charcoal/55">{o.paymentKind === "cod" ? "Collected by courier. Reconcile once the courier remits cash." : "Status is updated from the payment provider's signed webhook. Never mark online orders paid manually without checking the provider dashboard."}</p>
          </Card>
        </div>
      </div>
      <Modal open={refund} onClose={() => setRefund(false)} title={`Refund ${o.number}`} footer={<><AButton variant="outline" onClick={() => setRefund(false)}>Cancel</AButton><AButton variant="danger" onClick={() => { updateOrder(o.id, { paymentStatus: "refunded", fulfilmentStatus: "returned" }); setRefund(false); }}>Refund {money(o.totals.total)}</AButton></>}>
        <p className="text-[13.5px]">A full refund of {money(o.totals.total)} will be issued to the original payment method. In Phase 2 this calls the payment provider from the server and is recorded in the audit log.</p>
      </Modal>
    </>
  );
}

/* ───────────── Customers ───────────── */

export function CustomersView() {
  const { customers, can } = useAdmin();
  if (!can("customers.view")) return <NoAccess perm="customers.view" />;
  return (
    <>
      <PageHeader title="Customers" description={`${customers.length} customers in ${new Set(customers.map((c) => c.countryCode)).size} countries`} actions={<Gate perm="customers.export"><AButton variant="outline">Export</AButton></Gate>} />
      <DataTable rows={customers} getId={(c) => c.id} search={(c) => `${c.firstName} ${c.lastName} ${c.email} ${c.city}`} columns={[
        { key: "n", header: "Customer", sort: (c) => c.lastName, cell: (c) => <div><p className="font-medium">{c.firstName} {c.lastName}</p><p className="text-[12px] text-charcoal/55">{c.email}</p></div> },
        { key: "l", header: "Location", sort: (c) => c.countryCode, cell: (c) => `${c.city}, ${c.countryCode}` },
        { key: "o", header: "Orders", sort: (c) => c.orderCount, cell: (c) => c.orderCount },
        { key: "s", header: "Total spent", sort: (c) => c.totalSpent.amount, cell: (c) => (can("finance.view") ? formatMoney(c.totalSpent.amount, c.totalSpent.currency) : "—") },
        { key: "m", header: "Marketing", cell: (c) => <Status value={c.marketingConsent ? "active" : "inactive"} label={c.marketingConsent ? "Subscribed" : "Not subscribed"} /> },
        { key: "t", header: "Tags", cell: (c) => <div className="flex flex-wrap gap-1">{c.tags.map((t) => <span key={t} className="rounded-full bg-beige px-2 py-0.5 text-[11px]">{t}</span>)}</div> },
      ]} />
    </>
  );
}

/* ───────────── Discounts ───────────── */

export function DiscountsView() {
  const { discounts, markets, saveDiscount, can } = useAdmin();
  const [edit, setEdit] = useState<Discount | null>(null);
  if (!can("discounts.view")) return <NoAccess perm="discounts.view" />;
  const describe = (d: Discount) => d.type === "percentage" ? `${d.value}% off` : d.type === "free_shipping" ? "Free shipping" : Object.entries(d.value as Record<string, number>).map(([c, v]) => formatMoney(v, c as CurrencyCode)).join(" / ") + " off";
  return (
    <>
      <PageHeader title="Discounts" description="Codes are validated on the server at checkout." actions={<Gate perm="discounts.create"><AButton onClick={() => setEdit({ id: `dis_new_${discounts.length}`, code: "", description: "", type: "percentage", value: 10, marketIds: "all", usageCount: 0, usageLimit: null, startsAt: "2026-11-21T00:00:00.000Z", endsAt: null, active: true })}>Create discount</AButton></Gate>} />
      <DataTable rows={discounts} getId={(d) => d.id} search={(d) => d.code} columns={[
        { key: "c", header: "Code", sort: (d) => d.code, cell: (d) => <div><p className="font-mono font-medium">{d.code}</p><p className="text-[12px] text-charcoal/55">{d.description}</p></div> },
        { key: "v", header: "Value", cell: describe },
        { key: "m", header: "Markets", cell: (d) => (d.marketIds === "all" ? "All markets" : d.marketIds.map((m) => MARKET_NAME[m]).join(", ")) },
        { key: "u", header: "Used", sort: (d) => d.usageCount, cell: (d) => `${d.usageCount}${d.usageLimit ? ` / ${d.usageLimit}` : ""}` },
        { key: "d", header: "Ends", cell: (d) => (d.endsAt ? formatDate(d.endsAt) : "No end date") },
        { key: "a", header: "Active", cell: (d) => <Toggle checked={d.active} disabled={!can("discounts.update")} onChange={(v) => saveDiscount({ ...d, active: v })} label={`${d.code} active`} /> },
        { key: "e", header: "", cell: (d) => <Gate perm="discounts.update"><AButton variant="ghost" onClick={() => setEdit(d)}>Edit</AButton></Gate> },
      ]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.code ? `Edit ${edit.code}` : "New discount"} footer={<><AButton variant="outline" onClick={() => setEdit(null)}>Cancel</AButton><AButton disabled={!edit?.code} onClick={() => { if (edit) saveDiscount({ ...edit, code: edit.code.toUpperCase() }); setEdit(null); }}>Save</AButton></>}>
        {edit && <>
          <AInput label="Code" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} className="font-mono uppercase" />
          <ATextarea label="Internal description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="min-h-16" />
          <div className="grid grid-cols-2 gap-3">
            <ASelect label="Type" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Discount["type"], value: e.target.value === "fixed" ? { PKR: 0, USD: 0, GBP: 0, EUR: 0 } : 10 })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option><option value="free_shipping">Free shipping</option></ASelect>
            {edit.type === "percentage" && <AInput label="Percent off" type="number" min={1} max={100} value={edit.value as number} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })} />}
          </div>
          {edit.type === "fixed" && <div className="grid grid-cols-4 gap-2">{(["PKR", "USD", "GBP", "EUR"] as const).map((c) => <AInput key={c} label={c} type="number" value={((edit.value as Record<string, number>)[c] ?? 0) / 100} onChange={(e) => setEdit({ ...edit, value: { ...(edit.value as Record<string, number>), [c]: Number(e.target.value) * 100 } })} />)}</div>}
          <ASelect label="Markets" value={edit.marketIds === "all" ? "all" : edit.marketIds[0]} onChange={(e) => setEdit({ ...edit, marketIds: e.target.value === "all" ? "all" : [e.target.value] })}><option value="all">All markets</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</ASelect>
        </>}
      </Modal>
    </>
  );
}

export type { Order };
