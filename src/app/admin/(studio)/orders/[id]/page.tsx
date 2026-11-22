import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { ActionButton, AdminForm, Check, Disclosure, Field, SelectField, TextareaField } from "@/components/admin/client";
import { ALink, Card, DL, fmtDateTime, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { formatMoney } from "@/lib/commerce/currency";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { ORDER_TRANSITIONS } from "@/server/commerce/pricing";
import { provider } from "@/server/payments/providers";
import {
  cancelAction, codAction, confirmPaymentAction, createReturnAction, noteAction, refundAction, resendAction, shipmentAction, shipmentEventAction, transitionAction, updateReturnAction,
} from "../../../_actions/orders";
import type { CurrencyCode } from "@/types";

export const metadata = { title: "Order" };

export default async function OrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { staff, allowed } = await staffPage("orders.view");
  if (!allowed) return <NoAccess permission="orders.view" />;
  const { id } = await props.params;
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!o) notFound();
  const [items, addresses, history, notes, payments, shipments, rets, refunds, method, staffRows] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id)),
    db.select().from(s.orderAddresses).where(eq(s.orderAddresses.orderId, id)),
    db.select().from(s.orderStatusHistory).where(eq(s.orderStatusHistory.orderId, id)).orderBy(desc(s.orderStatusHistory.createdAt)),
    db.select().from(s.orderNotes).where(eq(s.orderNotes.orderId, id)).orderBy(desc(s.orderNotes.createdAt)),
    db.select().from(s.payments).where(eq(s.payments.orderId, id)),
    db.select().from(s.shipments).where(eq(s.shipments.orderId, id)).orderBy(asc(s.shipments.createdAt)),
    db.select().from(s.returns).where(eq(s.returns.orderId, id)).orderBy(desc(s.returns.createdAt)),
    db.select().from(s.refunds).where(eq(s.refunds.orderId, id)).orderBy(desc(s.refunds.createdAt)),
    db.select().from(s.paymentMethods).where(eq(s.paymentMethods.id, o.paymentMethod)),
    db.select({ id: s.staffUsers.id, name: s.staffUsers.name }).from(s.staffUsers),
  ]);
  const [txns, events, returnItems] = await Promise.all([
    payments.length ? db.select().from(s.paymentTransactions).where(inArray(s.paymentTransactions.paymentId, payments.map((p) => p.id))).orderBy(desc(s.paymentTransactions.createdAt)) : [],
    shipments.length ? db.select().from(s.shipmentEvents).where(inArray(s.shipmentEvents.shipmentId, shipments.map((x) => x.id))).orderBy(desc(s.shipmentEvents.occurredAt)) : [],
    rets.length ? db.select().from(s.returnItems).where(inArray(s.returnItems.returnId, rets.map((r) => r.id))) : [],
  ]);
  const who = (sid: string | null) => staffRows.find((x) => x.id === sid)?.name ?? "";
  const ship = addresses.find((a) => a.type === "shipping");
  const pii = staffCan(staff, "customers.view_pii");
  const money = (n: number) => formatMoney(n, o.currency as CurrencyCode);
  const next = ORDER_TRANSITIONS[o.status].filter((x) => x !== "cancelled" && x !== "shipped" && x !== "returned");
  const refundable = o.amountPaid - o.amountRefunded;
  const payment = payments[0];
  const canApiRefund = !!payment && !!provider(payment.provider)?.refund && payment.provider !== "cod";

  return (
    <>
      <PageHeader title={`Order ${o.number}`} back={{ href: "/admin/orders", label: "Orders" }}
        description={<>Placed {fmtDateTime(o.placedAt)} · <Status value={o.status} /> <Status value={o.paymentStatus} /></>}
        actions={<><ALink href={`/admin/orders/${o.id}/invoice`} variant="outline">Invoice</ALink><ALink href={`/admin/orders/${o.id}/packing-slip`} variant="outline">Packing slip</ALink></>} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Card title="Items" padded={false}>
            <Table head={["Item", "SKU", "Qty", { label: "Unit", className: "text-right" }, { label: "Total", className: "text-right" }]} className="border-0">
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.productId ? <Link href={`/admin/products/${i.productId}`} className="hover:underline">{i.productName}</Link> : i.productName}<span className="block text-[11.5px] text-charcoal/50">{i.colour} · {i.size}{i.quantityReturned ? ` · ${i.quantityReturned} returned` : ""}</span></td>
                  <td className="text-charcoal/60">{i.sku}</td>
                  <td>{i.quantity}</td>
                  <td className="text-right">{money(i.unitPrice)}</td>
                  <td className="text-right">{money(i.lineTotal)}</td>
                </tr>
              ))}
            </Table>
            <div className="border-t border-line p-5">
              <DL items={[
                ["Subtotal", money(o.subtotal)],
                ...(o.discountTotal ? [[`Discount ${o.couponCode ?? ""}`, `− ${money(o.discountTotal)}`] as [string, string]] : []),
                [`Delivery`, `${o.shippingTotal ? money(o.shippingTotal) : "Free"} · ${o.shippingLabel}`],
                ...(o.taxTotal ? [[o.taxLabel ?? "Tax", money(o.taxTotal)] as [string, string]] : []),
                ...(o.taxIncluded ? [[`${o.taxLabel ?? "Tax"} included`, money(o.taxIncluded)] as [string, string]] : []),
                ["Total", <strong key="t" className="font-medium">{money(o.total)}</strong>],
                ["Paid", money(o.amountPaid)],
                ...(o.amountRefunded ? [["Refunded", money(o.amountRefunded)] as [string, string]] : []),
              ]} />
            </div>
          </Card>

          <Card title="Fulfilment">
            <div className="flex flex-wrap gap-2">
              {staffCan(staff, "orders.update") && next.map((to) => (
                <ActionButton key={to} action={transitionAction} fields={{ orderId: o.id, to, notify: "on" }} label={`Mark ${to}`} variant="solid" confirm={`Move ${o.number} to ${to}? The customer is notified where applicable.`} />
              ))}
              {staffCan(staff, "orders.cancel") && ORDER_TRANSITIONS[o.status].includes("cancelled") && (
                <Disclosure label="Cancel order" variant="danger">
                  <AdminForm action={cancelAction} submit="Cancel order" danger confirm="Cancel this order? Stock is returned and the customer is emailed.">
                    <input type="hidden" name="orderId" value={o.id} />
                    <TextareaField label="Reason (internal and in the customer email)" name="reason" required />
                    <Check name="notify" defaultChecked label="Email the customer" />
                    {o.amountPaid > 0 && <p className="text-[12px] text-warning">This order is paid — issue a refund after cancelling.</p>}
                  </AdminForm>
                </Disclosure>
              )}
            </div>
            {staffCan(staff, "orders.ship") && ["confirmed", "processing", "shipped"].includes(o.status) && (
              <div className="mt-4">
                <Disclosure label="Add shipment & tracking" defaultOpen={o.status === "processing" && !shipments.length}>
                  <AdminForm action={shipmentAction} submit="Add shipment" resetOnSuccess className="sm:grid-cols-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <Field label="Carrier" name="carrier" placeholder="TCS, Leopards, DHL…" required />
                    <Field label="Tracking number" name="trackingNumber" required />
                    <Field label="Tracking link (https://…)" name="trackingUrl" type="url" className="sm:col-span-2" />
                    <Check name="notify" defaultChecked label="Email the customer their tracking details" />
                  </AdminForm>
                </Disclosure>
              </div>
            )}
            {shipments.map((sh) => (
              <div key={sh.id} className="mt-5 rounded-[3px] border border-line p-4">
                <p className="flex flex-wrap items-center gap-3"><strong className="font-medium">{sh.carrier}</strong> {sh.trackingNumber} <Status value={sh.status} />{sh.trackingUrl && <a href={sh.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] underline">Track ↗</a>}</p>
                <ul className="mt-3 space-y-1 text-[12.5px] text-charcoal/70">{events.filter((e) => e.shipmentId === sh.id).map((e) => <li key={e.id}>{fmtDateTime(e.occurredAt)} — {e.description}{e.location ? ` (${e.location})` : ""}</li>)}</ul>
                {staffCan(staff, "orders.ship") && sh.status !== "delivered" && (
                  <div className="mt-3"><Disclosure label="Update tracking">
                    <AdminForm action={shipmentEventAction} submit="Update" resetOnSuccess className="sm:grid-cols-3">
                      <input type="hidden" name="shipmentId" value={sh.id} />
                      <SelectField label="Status" name="status">{[["in_transit", "In transit"], ["out_for_delivery", "Out for delivery"], ["delivered", "Delivered"], ["failed", "Delivery failed"], ["returned", "Returned to sender"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</SelectField>
                      <Field label="Description" name="description" />
                      <Field label="Location" name="location" />
                    </AdminForm>
                  </Disclosure></div>
                )}
              </div>
            ))}
          </Card>

          <Card title="Payment">
            <DL items={[["Method", method[0]?.label ?? o.paymentMethod], ["Provider", payment ? `${payment.provider}${payment.providerReference ? ` · ${payment.providerReference}` : ""}` : "—"], ["Payment status", <Status key="p" value={o.paymentStatus} />], ...(payment?.failureReason ? [["Failure", payment.failureReason] as [string, string]] : [])]} />
            {txns.length > 0 && (
              <Table head={["When", "Type", "Status", "Reference", { label: "Amount", className: "text-right" }]} className="mt-4">
                {txns.map((t) => <tr key={t.id}><td className="whitespace-nowrap">{fmtDateTime(t.createdAt)}</td><td>{t.type.replace(/_/g, " ")}</td><td><Status value={t.status} /></td><td className="max-w-[200px] truncate text-charcoal/60">{t.providerTransactionId}{t.staffUserId ? ` · ${who(t.staffUserId)}` : ""}</td><td className="text-right">{money(t.amount)}</td></tr>)}
              </Table>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {o.paymentStatus === "awaiting_cod" && staffCan(staff, "orders.collect_cod") && o.status !== "cancelled" && (
                <Disclosure label="Record cash collected">
                  <AdminForm action={codAction} submit="Record collection" confirm="Record cash collected for this order?">
                    <input type="hidden" name="orderId" value={o.id} />
                    <Field label={`Amount collected (${o.currency})`} name="amount" defaultValue={(o.total / 100).toFixed(2)} inputMode="decimal" />
                    <Field label="Courier / remittance reference" name="reference" />
                  </AdminForm>
                </Disclosure>
              )}
              {["pending", "failed"].includes(o.paymentStatus) && staffCan(staff, "payments.manage") && (
                <Disclosure label="Confirm payment manually">
                  <AdminForm action={confirmPaymentAction} submit="Confirm payment" confirm="Only confirm after checking the payment in the provider's dashboard. Continue?">
                    <input type="hidden" name="orderId" value={o.id} />
                    <p className="text-[12px] text-charcoal/60">Use only when the provider dashboard shows this payment as captured but the webhook wasn&apos;t processed.</p>
                    <Field label="Provider transaction reference" name="reference" required />
                    <Field label="Note" name="note" />
                  </AdminForm>
                </Disclosure>
              )}
              {refundable > 0 && staffCan(staff, "refunds.create") && (
                <Disclosure label="Issue refund">
                  <AdminForm action={refundAction} submit="Refund" danger confirm="Issue this refund? This can't be undone.">
                    <input type="hidden" name="orderId" value={o.id} />
                    <Field label={`Amount (${o.currency}, max ${money(refundable)})`} name="amount" defaultValue={(refundable / 100).toFixed(2)} inputMode="decimal" />
                    <SelectField label="Method" name="method" defaultValue={canApiRefund ? "provider" : "manual"}>
                      {canApiRefund && <option value="provider">Refund through {payment!.provider}</option>}
                      <option value="manual">Manual (bank transfer / cash) — record only</option>
                    </SelectField>
                    {rets.length > 0 && <SelectField label="For return" name="returnId"><option value="">—</option>{rets.filter((r) => r.status === "received").map((r) => <option key={r.id} value={r.id}>{r.number}</option>)}</SelectField>}
                    <TextareaField label="Reason" name="reason" required />
                  </AdminForm>
                </Disclosure>
              )}
            </div>
            {refunds.length > 0 && (
              <Table head={["When", "Method", "Status", "Reason", { label: "Amount", className: "text-right" }]} className="mt-4">
                {refunds.map((r) => <tr key={r.id}><td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td><td>{r.method}</td><td><Status value={r.status} /></td><td>{r.reason}<span className="block text-[11px] text-charcoal/50">{who(r.staffUserId)}</span></td><td className="text-right">{money(r.amount)}</td></tr>)}
              </Table>
            )}
          </Card>

          <Card title="Returns">
            {rets.map((r) => (
              <div key={r.id} className="mb-4 rounded-[3px] border border-line p-4">
                <p className="flex flex-wrap items-center gap-3"><strong className="font-medium">{r.number}</strong><Status value={r.status} /><span className="text-[12px] text-charcoal/55">{fmtDateTime(r.createdAt)}</span></p>
                <p className="mt-1 text-[13px]">{r.reason}</p>
                <ul className="mt-2 text-[12.5px] text-charcoal/70">{returnItems.filter((x) => x.returnId === r.id).map((x) => { const it = items.find((i) => i.id === x.orderItemId); return <li key={x.id}>{x.quantity} × {it?.productName} ({it?.size}) — {x.condition}{x.restocked ? ", restocked" : ""}</li>; })}</ul>
                {staffCan(staff, "returns.manage") && (
                  <div className="mt-3 flex gap-2">
                    {r.status === "requested" && <ActionButton action={updateReturnAction} fields={{ returnId: r.id, status: "approved" }} label="Approve" />}
                    {r.status === "approved" && <ActionButton action={updateReturnAction} fields={{ returnId: r.id, status: "received" }} label="Mark received (restock)" confirm="Mark items received? Resellable items go back into stock." />}
                    {["requested", "approved"].includes(r.status) && <ActionButton action={updateReturnAction} fields={{ returnId: r.id, status: "rejected" }} label="Reject" variant="danger" confirm="Reject this return?" />}
                  </div>
                )}
              </div>
            ))}
            {staffCan(staff, "returns.manage") && ["shipped", "delivered", "returned"].includes(o.status) ? (
              <Disclosure label="Create return">
                <AdminForm action={createReturnAction} submit="Create return">
                  <input type="hidden" name="orderId" value={o.id} />
                  {items.map((i) => (
                    <div key={i.id} className="grid grid-cols-[1fr_90px_140px] items-end gap-3">
                      <input type="hidden" name="itemId" value={i.id} />
                      <p className="text-[13px]">{i.productName} · {i.size}<span className="block text-[11px] text-charcoal/50">{i.quantity - i.quantityReturned} returnable</span></p>
                      <Field label="Qty" name={`qty_${i.id}`} type="number" min={0} max={i.quantity - i.quantityReturned} defaultValue="0" />
                      <SelectField label="Condition" name={`cond_${i.id}`}><option value="resellable">Resellable</option><option value="damaged">Damaged</option></SelectField>
                    </div>
                  ))}
                  <TextareaField label="Reason" name="reason" required />
                </AdminForm>
              </Disclosure>
            ) : !rets.length && <p className="text-[13px] text-charcoal/55">Returns can be created once the order has shipped.</p>}
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card title="Customer">
            <DL items={[
              ["Name", `${ship?.firstName ?? ""} ${ship?.lastName ?? ""}`],
              ["Email", pii ? o.email : "Hidden (needs customers.view_pii)"],
              ["Phone", pii ? o.phone : "Hidden"],
              ["Account", o.userId ? <Link key="u" href={`/admin/customers/${o.userId}`} className="underline">View customer</Link> : "Guest checkout"],
              ["Marketing", o.marketingConsent ? "Opted in" : "No"],
            ]} />
            {ship && pii && <p className="mt-4 text-[13px] leading-relaxed">{ship.line1}{ship.line2 ? `, ${ship.line2}` : ""}<br />{ship.city}{ship.region ? `, ${ship.region}` : ""} {ship.postalCode}<br />{ship.countryCode}</p>}
            {o.customerNote && <p className="mt-4 rounded-[3px] bg-[#f3e6cf] p-3 text-[13px]"><strong className="font-medium">Customer note:</strong> {o.customerNote}</p>}
          </Card>

          {staffCan(staff, "orders.notes") && (
            <Card title="Notes & messages">
              <AdminForm action={noteAction} submit="Add note" resetOnSuccess>
                <input type="hidden" name="orderId" value={o.id} />
                <TextareaField label="Note" name="body" required />
                <SelectField label="Visibility" name="visibility"><option value="internal">Internal only</option><option value="customer">Send to customer (email + order page)</option></SelectField>
              </AdminForm>
              <ul className="mt-5 space-y-3">
                {notes.map((n) => <li key={n.id} className="rounded-[3px] bg-beige/50 p-3 text-[13px]"><span className="block text-[11px] text-charcoal/50">{fmtDateTime(n.createdAt)} · {n.visibility === "customer" ? `To customer${n.notifiedAt ? " (emailed)" : ""}` : "Internal"}{n.staffUserId ? ` · ${who(n.staffUserId)}` : ""}</span>{n.body}</li>)}
              </ul>
              <div className="mt-5 border-t border-line pt-4">
                <AdminForm action={resendAction} submit="Send email">
                  <input type="hidden" name="orderId" value={o.id} />
                  <SelectField label="Resend a notification" name="template">
                    {[["order_confirmation", "Order confirmation"], ["payment_confirmation", "Payment confirmation"], ["order_processing", "Processing"], ["order_shipped", "Shipped"], ["order_delivered", "Delivered"], ["order_cancelled", "Cancelled"], ["refund_confirmation", "Refund"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </SelectField>
                </AdminForm>
              </div>
            </Card>
          )}

          <Card title="History">
            <ol className="space-y-2.5 text-[12.5px]">
              {history.map((h) => <li key={h.id}><span className="text-charcoal/50">{fmtDateTime(h.createdAt)}</span><br />{h.field === "payment" ? "Payment" : "Status"}: {h.fromValue ? `${h.fromValue} → ` : ""}<strong className="font-medium">{h.toValue}</strong> · {h.actorType}{h.staffUserId ? ` (${who(h.staffUserId)})` : ""}{h.note ? ` — ${h.note}` : ""}</li>)}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
