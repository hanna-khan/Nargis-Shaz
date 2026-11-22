import { and, desc, eq, gte, like, lt, sql, type SQL } from "drizzle-orm";
import { FilterBar, FInput, FSelect, fmtDateTime, NoAccess, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffPage } from "@/server/admin/guard";

export const metadata = { title: "Audit log" };
const PAGE = 50;

export default async function AuditPage(props: PageProps<"/admin/audit-log">) {
  const { allowed } = await staffPage("audit.view");
  if (!allowed) return <NoAccess permission="audit.view" />;
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const where: SQL[] = [];
  if (str("actor")) where.push(eq(s.auditLogs.actorId, str("actor")));
  if (str("action")) where.push(like(s.auditLogs.action, `${str("action").replace(/[\\%_]/g, (c) => `\\${c}`)}%`));
  if (str("entity")) where.push(eq(s.auditLogs.entityType, str("entity")));
  if (str("type")) where.push(eq(s.auditLogs.actorType, str("type") as never));
  if (str("from")) where.push(gte(s.auditLogs.createdAt, new Date(`${str("from")}T00:00:00+05:00`)));
  if (str("to")) where.push(lt(s.auditLogs.createdAt, new Date(new Date(`${str("to")}T00:00:00+05:00`).getTime() + 86_400_000)));
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ n }], staff, entities] = await Promise.all([
    db.select().from(s.auditLogs).where(cond).orderBy(desc(s.auditLogs.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.auditLogs).where(cond),
    db.select({ id: s.staffUsers.id, name: s.staffUsers.name }).from(s.staffUsers),
    db.selectDistinct({ e: s.auditLogs.entityType }).from(s.auditLogs),
  ]);
  return (
    <>
      <PageHeader title="Audit log" description="Sign-ins, catalogue, price, stock, order, refund, coupon, permission and settings changes — who, what, when and from where." />
      <FilterBar path="/admin/audit-log">
        <FSelect label="Staff member" name="actor" defaultValue={str("actor")}><option value="">Anyone</option>{staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</FSelect>
        <FSelect label="Actor type" name="type" defaultValue={str("type")}><option value="">Any</option>{["staff", "customer", "system", "anonymous"].map((x) => <option key={x}>{x}</option>)}</FSelect>
        <FInput label="Action starts with" name="action" defaultValue={str("action")} placeholder="order. / staff.login" />
        <FSelect label="Entity" name="entity" defaultValue={str("entity")}><option value="">Any</option>{entities.map((e) => <option key={e.e}>{e.e}</option>)}</FSelect>
        <FInput label="From" name="from" type="date" defaultValue={str("from")} />
        <FInput label="To" name="to" type="date" defaultValue={str("to")} />
      </FilterBar>
      <Table head={["When", "Actor", "Action", "Summary", "Changes", "IP"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
            <td className="max-w-[180px] truncate">{r.actorLabel}<span className="block text-[11px] text-charcoal/50">{r.actorType}</span></td>
            <td className="whitespace-nowrap text-[12px]">{r.action}</td>
            <td>{r.summary}</td>
            <td className="max-w-[280px] text-[11.5px] text-charcoal/65">{r.changes ? Object.entries(r.changes).map(([k, v]) => <div key={k} className="truncate">{k}: {JSON.stringify(v.from)} → {JSON.stringify(v.to)}</div>) : "—"}</td>
            <td className="text-[11.5px] text-charcoal/50">{r.ip ?? "—"}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.ceil(Number(n) / PAGE)} params={sp} path="/admin/audit-log" />
    </>
  );
}
