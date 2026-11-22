import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ActionButton, AdminForm, SelectField, TextareaField } from "@/components/admin/client";
import { Card, DL, fmtDate, fmtDateTime, Money, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { formatMoney } from "@/lib/commerce/currency";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import type { CurrencyCode } from "@/types";
import { customerNoteAction, customerStatusAction } from "../../../_actions/ops";

export const metadata = { title: "Customer" };

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { staff, allowed } = await staffPage("customers.view");
  if (!allowed) return <NoAccess permission="customers.view" />;
  const { id } = await props.params;
  const [u] = await db.select().from(s.users).where(eq(s.users.id, id));
  if (!u) notFound();
  const [orders, addresses, notes, staffRows, messages] = await Promise.all([
    db.select().from(s.orders).where(eq(s.orders.userId, id)).orderBy(desc(s.orders.placedAt)),
    db.select().from(s.customerAddresses).where(eq(s.customerAddresses.userId, id)),
    db.select().from(s.customerNotes).where(eq(s.customerNotes.userId, id)).orderBy(desc(s.customerNotes.createdAt)),
    db.select({ id: s.staffUsers.id, name: s.staffUsers.name }).from(s.staffUsers),
    db.select().from(s.contactMessages).where(eq(s.contactMessages.email, u.email)).orderBy(desc(s.contactMessages.createdAt)),
  ]);
  const pii = staffCan(staff, "customers.view_pii");
  const ltv = new Map<string, number>();
  for (const o of orders) if (o.status !== "cancelled") ltv.set(o.currency, (ltv.get(o.currency) ?? 0) + o.amountPaid - o.amountRefunded);
  return (
    <>
      <PageHeader title={`${u.firstName} ${u.lastName}`} back={{ href: "/admin/customers", label: "Customers" }} description={<><Status value={u.status} /> Customer since {fmtDate(u.createdAt)}</>}
        actions={staffCan(staff, "customers.suspend") && u.status !== "deactivated" ? <ActionButton action={customerStatusAction} fields={{ userId: u.id, status: u.status === "active" ? "suspended" : "active" }} label={u.status === "active" ? "Suspend account" : "Reactivate"} variant={u.status === "active" ? "danger" : "solid"} confirm={u.status === "active" ? "Suspend this account? The customer is signed out and can't sign in." : undefined} /> : undefined} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Card title={`Orders (${orders.length})`} padded={false}>
            <Table head={["Order", "Placed", "Status", "Payment", { label: "Total", className: "text-right" }]} className="border-0">
              {orders.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.number}</Link></td><td>{fmtDateTime(o.placedAt)}</td><td><Status value={o.status} /></td><td><Status value={o.paymentStatus} /></td><td className="text-right"><Money amount={o.total} currency={o.currency} /></td></tr>)}
            </Table>
            {!orders.length && <p className="p-5 text-[13px] text-charcoal/55">No orders yet.</p>}
          </Card>
          <Card title="Support history">
            {messages.length ? <ul className="space-y-3 text-[13px]">{messages.map((m) => <li key={m.id} className="rounded-[3px] bg-beige/40 p-3"><span className="block text-[11px] text-charcoal/50">{fmtDateTime(m.createdAt)} · <Status value={m.status} /></span><strong className="font-medium">{m.subject}</strong><p className="mt-1 whitespace-pre-line">{m.message}</p></li>)}</ul> : <p className="text-[13px] text-charcoal/55">No messages from this customer.</p>}
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card title="Profile">
            <DL items={[
              ["Email", pii ? u.email : "Hidden"], ["Phone", pii ? u.phone ?? "—" : "Hidden"], ["Email verified", u.emailVerifiedAt ? fmtDate(u.emailVerifiedAt) : "No"],
              ["Marketing", u.marketingConsent ? "Opted in" : "No"], ["Last sign-in", fmtDateTime(u.lastLoginAt)],
              ["Lifetime value", ltv.size ? [...ltv].map(([c, v]) => formatMoney(v, c as CurrencyCode)).join(" · ") : "—"],
            ]} />
          </Card>
          {pii && <Card title="Addresses">{addresses.length ? <ul className="space-y-3 text-[13px]">{addresses.map((a) => <li key={a.id}><strong className="font-medium">{a.label}</strong>{a.isDefault ? " (default)" : ""}<br />{a.firstName} {a.lastName}, {a.line1}, {a.city} {a.postalCode}, {a.countryCode} · {a.phone}</li>)}</ul> : <p className="text-[13px] text-charcoal/55">No saved addresses.</p>}</Card>}
          <Card title="Internal notes">
            {staffCan(staff, "customers.update") && (
              <AdminForm action={customerNoteAction} submit="Add note" resetOnSuccess>
                <input type="hidden" name="userId" value={u.id} />
                <TextareaField label="Note (staff only)" name="body" rows={3} />
                <SelectField label="Type" name="kind"><option value="note">Note</option><option value="support">Support interaction</option></SelectField>
              </AdminForm>
            )}
            <ul className="mt-4 space-y-2 text-[13px]">{notes.map((n) => <li key={n.id} className="rounded-[3px] bg-beige/40 p-3"><span className="block text-[11px] text-charcoal/50">{fmtDateTime(n.createdAt)} · {n.kind} · {staffRows.find((x) => x.id === n.staffUserId)?.name}</span>{n.body}</li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
