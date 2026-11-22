import Link from "next/link";
import { and, desc, eq, gte, like, lt, or, sql, type SQL } from "drizzle-orm";
import { ActionButton, SelectAll } from "@/components/admin/client";
import { ALink, Empty, FilterBar, FInput, FSelect, fmtDateTime, Money, NoAccess, PageHeader, Pagination, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { bulkOrdersAction } from "../../_actions/orders";

export const metadata = { title: "Orders" };
const PAGE = 30;

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  const { staff, allowed } = await staffPage("orders.view");
  if (!allowed) return <NoAccess permission="orders.view" />;
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const where: SQL[] = [];
  const q = str("q").slice(0, 80);
  if (q) {
    const L = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(like(s.orders.number, L), like(s.orders.email, L), like(s.orders.phone, L), sql`EXISTS (SELECT 1 FROM order_addresses a WHERE a.order_id = ${s.orders.id} AND CONCAT(a.first_name, ' ', a.last_name) LIKE ${L})`)!);
  }
  if (str("status")) where.push(eq(s.orders.status, str("status") as never));
  if (str("payment")) where.push(eq(s.orders.paymentStatus, str("payment") as never));
  if (str("method")) where.push(eq(s.orders.paymentMethod, str("method")));
  if (str("from")) where.push(gte(s.orders.placedAt, new Date(`${str("from")}T00:00:00+05:00`)));
  if (str("to")) where.push(lt(s.orders.placedAt, new Date(new Date(`${str("to")}T00:00:00+05:00`).getTime() + 86_400_000)));
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ n }], methods] = await Promise.all([
    db.select({ o: s.orders, first: s.orderAddresses.firstName, last: s.orderAddresses.lastName }).from(s.orders)
      .leftJoin(s.orderAddresses, and(eq(s.orderAddresses.orderId, s.orders.id), eq(s.orderAddresses.type, "shipping")))
      .where(cond).orderBy(desc(s.orders.placedAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.orders).where(cond),
    db.select({ id: s.paymentMethods.id, label: s.paymentMethods.label }).from(s.paymentMethods),
  ]);
  const pii = staffCan(staff, "customers.view_pii");
  const exportQs = new URLSearchParams({ range: "custom", from: str("from") || "2020-01-01", to: str("to") || new Date().toISOString().slice(0, 10) });

  return (
    <>
      <PageHeader title="Orders" description={`${Number(n)} order${Number(n) === 1 ? "" : "s"} match.`}
        actions={staffCan(staff, "orders.export") ? <ALink href={`/admin/api/export/orders?${exportQs}`} variant="outline">Export CSV</ALink> : undefined} />
      <FilterBar path="/admin/orders">
        <FInput label="Search" name="q" defaultValue={q} placeholder="Number, email, phone, name" className="min-w-[220px]" />
        <FSelect label="Status" name="status" defaultValue={str("status")}><option value="">Any</option>{["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"].map((x) => <option key={x} value={x}>{x}</option>)}</FSelect>
        <FSelect label="Payment" name="payment" defaultValue={str("payment")}><option value="">Any</option>{["awaiting_cod", "pending", "paid", "failed", "partially_refunded", "refunded", "voided"].map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}</FSelect>
        <FSelect label="Method" name="method" defaultValue={str("method")}><option value="">Any</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.label} ({m.id})</option>)}</FSelect>
        <FInput label="From" name="from" type="date" defaultValue={str("from")} />
        <FInput label="To" name="to" type="date" defaultValue={str("to")} />
      </FilterBar>

      {staffCan(staff, "orders.update") && rows.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-charcoal/55">With selected:</span>
          <BulkButtons />
        </div>
      )}
      <form id="bulk-orders" />
      <Table head={[{ label: "" }, "Order", "Placed", "Customer", "Status", "Payment", "Method", { label: "Total", className: "text-right" }]}
        empty={!rows.length ? <div className="p-6"><Empty title="No orders match">Try removing a filter.</Empty></div> : undefined}>
        {rows.map(({ o, first, last }) => (
          <tr key={o.id}>
            <td><input form="bulk-orders" type="checkbox" name="ids" value={o.id} aria-label={`Select ${o.number}`} className="h-4 w-4 accent-charcoal" /></td>
            <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link></td>
            <td className="whitespace-nowrap text-charcoal/70">{fmtDateTime(o.placedAt)}</td>
            <td>{first} {last}<span className="block text-[11.5px] text-charcoal/50">{pii ? o.email : "hidden"}</span></td>
            <td><Status value={o.status} /></td>
            <td><Status value={o.paymentStatus} /></td>
            <td className="text-charcoal/70">{methods.find((m) => m.id === o.paymentMethod)?.label ?? o.paymentMethod}</td>
            <td className="text-right whitespace-nowrap"><Money amount={o.total} currency={o.currency} /></td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.ceil(Number(n) / PAGE)} params={sp} path="/admin/orders" />
    </>
  );
}

function BulkButtons() {
  return (
    <>
      <SelectAllLabel />
      <BulkForm to="confirmed" label="Mark confirmed" />
      <BulkForm to="processing" label="Mark processing" />
    </>
  );
}

function SelectAllLabel() {
  return <label className="flex items-center gap-2"><SelectAll form="bulk-orders" /> Select page</label>;
}

/** Collects the checked rows (form="bulk-orders") into the action. */
function BulkForm({ to, label }: { to: string; label: string }) {
  return <ActionButton action={bulkOrdersAction} fields={{ to }} label={label} confirm={`${label} for the selected orders? Customers are emailed where applicable.`} bulkForm="bulk-orders" />;
}
