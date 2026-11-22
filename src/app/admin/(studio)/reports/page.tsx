import Link from "next/link";
import { RangeFilter } from "@/components/admin/range-filter";
import { ALink, Empty, Money, NoAccess, PageHeader, Table } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { staffCan, staffPage } from "@/server/admin/guard";
import { parseRange, report, REPORTS, type ReportKind } from "@/server/admin/reports";

export const metadata = { title: "Reports" };

export default async function ReportsPage(props: PageProps<"/admin/reports">) {
  const { staff, allowed } = await staffPage("reports.view");
  if (!allowed) return <NoAccess permission="reports.view" />;
  const sp = await props.searchParams;
  const kind = (typeof sp.report === "string" && sp.report in REPORTS ? sp.report : "sales") as ReportKind;
  const finance = ["payments", "refunds", "currency", "inventory"].includes(kind);
  const range = parseRange(sp);
  const canFinance = staffCan(staff, "reports.finance");
  const rep = finance && !canFinance ? null : await report(kind, range);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
  return (
    <>
      <PageHeader title="Reports" description="Live figures from orders, payments, refunds and stock. Money columns are per currency; CSV exports use major units."
        actions={rep && staffCan(staff, "reports.export") ? <ALink href={`/admin/api/export/${kind}?${qs}`} variant="outline">Export CSV</ALink> : undefined} />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Report type">
        {(Object.keys(REPORTS) as ReportKind[]).map((k) => <Link key={k} href={`/admin/reports?${new URLSearchParams({ ...Object.fromEntries(qs), report: k })}`} aria-current={k === kind ? "page" : undefined} className={cn("rounded-full border border-line px-3 py-1 text-[12.5px]", k === kind ? "border-charcoal bg-charcoal text-ivory" : "bg-white hover:border-charcoal")}>{REPORTS[k]}</Link>)}
      </nav>
      {kind !== "inventory" && <RangeFilter path="/admin/reports" range={range} extra={{ report: kind }} />}
      {!rep ? <Empty title="Financial report">This report needs the reports.finance permission.</Empty> : rep.rows.length ? (
        <Table head={rep.columns.map((c) => ({ label: c.label, className: c.money ? "text-right" : undefined }))}>
          {rep.rows.map((r, i) => <tr key={i}>{rep.columns.map((c) => <td key={c.key} className={c.money ? "text-right whitespace-nowrap" : undefined}>{c.money ? <Money amount={Number(r[c.key] ?? 0)} currency={String(r.currency ?? "PKR")} /> : r[c.key] instanceof Date ? (r[c.key] as Date).toISOString().slice(0, 10) : String(r[c.key] ?? "—")}</td>)}</tr>)}
        </Table>
      ) : <Empty title="No data for this period" />}
    </>
  );
}
