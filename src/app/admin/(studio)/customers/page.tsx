import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { ActionButton } from "@/components/admin/client";
import { ALink, Card, FilterBar, FInput, FSelect, fmtDate, NoAccess, PageHeader, Pagination, Status, Table } from "@/components/admin/ui";
import { formatMoney } from "@/lib/commerce/currency";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import type { CurrencyCode } from "@/types";
import { completeDeletionAction } from "../../_actions/ops";

export const metadata = { title: "Customers" };
const PAGE = 30;
const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1•••$2");

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const { staff, allowed } = await staffPage("customers.view");
  if (!allowed) return <NoAccess permission="customers.view" />;
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const where: SQL[] = [];
  if (str("q")) { const L = `%${str("q").replace(/[\\%_]/g, (c) => `\\${c}`)}%`; where.push(or(like(s.users.email, L), like(s.users.firstName, L), like(s.users.lastName, L), like(s.users.phone, L))!); }
  if (str("status")) where.push(eq(s.users.status, str("status") as never));
  const cond = where.length ? and(...where) : undefined;
  const ltv = sql<number>`(SELECT COALESCE(SUM(o.amount_paid - o.amount_refunded), 0) FROM orders o WHERE o.user_id = ${s.users.id} AND o.status <> 'cancelled')`;
  const [rows, [{ n }], deletions] = await Promise.all([
    db.select({ u: s.users, orders: sql<number>`(SELECT COUNT(*) FROM orders o WHERE o.user_id = ${s.users.id})`, ltv, currency: sql<string>`(SELECT MIN(o.currency) FROM orders o WHERE o.user_id = ${s.users.id})` }).from(s.users).where(cond).orderBy(desc(s.users.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.users).where(cond),
    db.select({ r: s.accountDeletionRequests, email: s.users.email }).from(s.accountDeletionRequests).innerJoin(s.users, eq(s.users.id, s.accountDeletionRequests.userId)).where(eq(s.accountDeletionRequests.status, "pending")),
  ]);
  const pii = staffCan(staff, "customers.view_pii");
  return (
    <>
      <PageHeader title="Customers" description={`${Number(n)} registered customers. Guest checkouts appear on their orders.`} actions={staffCan(staff, "customers.export") ? <ALink href="/admin/api/export/customers?range=custom&from=2020-01-01&to=2099-12-31" variant="outline">Export CSV</ALink> : undefined} />
      {deletions.length > 0 && staffCan(staff, "customers.suspend") && (
        <Card title="Account deletion requests" className="mb-6">
          <ul className="space-y-2 text-[13px]">{deletions.map(({ r, email }) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3"><span>{pii ? email : mask(email)} · {fmtDate(r.createdAt)}</span>{r.reason && <span className="text-charcoal/55">“{r.reason}”</span>}
              <ActionButton action={completeDeletionAction} fields={{ requestId: r.id, op: "complete" }} label="Anonymise account" variant="danger" confirm="Anonymise this account? Addresses, wishlist and profile are deleted; orders are kept without the link. This can't be undone." />
              <ActionButton action={completeDeletionAction} fields={{ requestId: r.id, op: "reject" }} label="Reject" variant="ghost" />
            </li>))}</ul>
        </Card>
      )}
      <FilterBar path="/admin/customers">
        <FInput label="Search" name="q" defaultValue={str("q")} placeholder="Name, email or phone" className="min-w-[220px]" />
        <FSelect label="Status" name="status" defaultValue={str("status")}><option value="">Any</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option></FSelect>
      </FilterBar>
      <Table head={["Customer", "Registered", "Orders", "Lifetime value", "Status", "Verified"]}>
        {rows.map(({ u, orders, ltv: value, currency }) => (
          <tr key={u.id}>
            <td><Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">{u.firstName} {u.lastName}</Link><span className="block text-[11.5px] text-charcoal/50">{pii ? u.email : mask(u.email)}</span></td>
            <td>{fmtDate(u.createdAt)}</td>
            <td>{Number(orders)}</td>
            <td>{currency ? formatMoney(Number(value), currency as CurrencyCode) : "—"}</td>
            <td><Status value={u.status} /></td>
            <td>{u.emailVerifiedAt ? "Yes" : "No"}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.ceil(Number(n) / PAGE)} params={sp} path="/admin/customers" />
    </>
  );
}
