import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Empty, fmtDateTime, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffPage } from "@/server/admin/guard";

export const metadata = { title: "Returns" };

export default async function ReturnsPage() {
  const { allowed } = await staffPage("returns.view");
  if (!allowed) return <NoAccess permission="returns.view" />;
  const rows = await db.select({ r: s.returns, number: s.orders.number, orderId: s.orders.id }).from(s.returns).innerJoin(s.orders, eq(s.orders.id, s.returns.orderId)).orderBy(desc(s.returns.createdAt)).limit(200);
  return (
    <>
      <PageHeader title="Returns" description="Create returns from an order page. Receiving a return restocks resellable items; refunds are issued from the order." />
      <Table head={["Return", "Order", "Created", "Reason", "Status"]} empty={!rows.length ? <div className="p-6"><Empty title="No returns yet" /></div> : undefined}>
        {rows.map(({ r, number, orderId }) => <tr key={r.id}><td className="font-medium">{r.number}</td><td><Link href={`/admin/orders/${orderId}`} className="underline">{number}</Link></td><td>{fmtDateTime(r.createdAt)}</td><td className="max-w-[360px]">{r.reason}</td><td><Status value={r.status} /></td></tr>)}
      </Table>
    </>
  );
}
