import Link from "next/link";
import { RangeFilter } from "@/components/admin/range-filter";
import { SalesChart } from "@/components/admin/sales-chart";
import { Card, Empty, fmtDateTime, Money, NoAccess, PageHeader, StatCard, Status, Table } from "@/components/admin/ui";
import { formatMoney } from "@/lib/commerce/currency";
import { staffCan, staffPage } from "@/server/admin/guard";
import { dashboard, parseRange } from "@/server/admin/reports";
import type { CurrencyCode } from "@/types";

export const metadata = { title: "Dashboard" };

const multi = (list: { currency: string; total: number }[]) => (list.length ? list.map((x) => formatMoney(x.total, x.currency as CurrencyCode)).join(" · ") : "—");

export default async function DashboardPage(props: PageProps<"/admin">) {
  const { staff, allowed } = await staffPage("dashboard.view");
  if (!allowed) return <NoAccess permission="dashboard.view" />;
  const range = parseRange(await props.searchParams);
  const d = await dashboard(range);
  const finance = staffCan(staff, "reports.finance") || staffCan(staff, "reports.view");
  const sc = (k: string) => d.statusCounts[k] ?? 0;

  return (
    <>
      <PageHeader title={`Good day, ${staff.name.split(" ")[0]}`} description={`Figures for ${range.label.toLowerCase()} (Pakistan time), from live order and payment records.`} />
      <RangeFilter path="/admin" range={range} />

      {finance && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Order value" value={multi(d.orderValue)} hint={`${d.orderCount} orders · excludes cancelled`} />
          <StatCard label="Collected" value={multi(d.collected)} hint="Verified online payments + COD collected" />
          <StatCard label="Refunded" value={multi(d.refunded)} hint="Refunds issued in this period" />
          <StatCard label="Average order value" value={d.orderValue.length ? d.orderValue.map((x) => formatMoney(x.aov, x.currency as CurrencyCode)).join(" · ") : "—"} />
        </div>
      )}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {finance && <StatCard label="Order value today" value={multi(d.orderValueToday)} />}
        {finance && <StatCard label="Order value this month" value={multi(d.orderValueMonth)} />}
        <StatCard label="Customers" value={String(d.customers)} hint={`${d.newCustomers} new in period`} href="/admin/customers" />
        <StatCard label="Out of stock" value={String(d.outOfStock)} hint={`${d.lowStock.length} variants low`} href="/admin/inventory?stock=out" />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[["pending", "Pending"], ["confirmed", "Confirmed"], ["processing", "Processing"], ["shipped", "Shipped"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]].map(([k, l]) => (
          <StatCard key={k} label={l} value={String(sc(k))} hint={["pending", "confirmed", "processing", "shipped"].includes(k) ? `${d.open[k] ?? 0} open now` : "in period"} href={`/admin/orders?status=${k}`} />
        ))}
      </div>

      {finance && (
        <Card title="Daily order value (PKR equivalent)" className="mb-8">
          <SalesChart data={d.series} label={`Daily order value, ${range.label}`} />
          <p className="mt-2 text-[11.5px] text-charcoal/50">Other currencies are converted with the rates in Settings → Currencies for this chart only; per-currency totals are above.</p>
        </Card>
      )}

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <Card title="Recent orders" actions={<Link href="/admin/orders" className="text-[12px] underline">All orders</Link>} padded={false}>
          {d.recent.length ? (
            <Table head={["Order", "Customer", "Status", "Payment", { label: "Total", className: "text-right" }]} className="border-0">
              {d.recent.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="underline-offset-4 hover:underline">{o.number}</Link><span className="block text-[11px] text-charcoal/50">{fmtDateTime(o.placed_at)}</span></td>
                  <td className="max-w-[180px] truncate">{staffCan(staff, "customers.view_pii") ? o.email : "•••"}</td>
                  <td><Status value={o.status} /></td>
                  <td><Status value={o.payment_status} /></td>
                  <td className="text-right"><Money amount={Number(o.total)} currency={o.currency} /></td>
                </tr>
              ))}
            </Table>
          ) : <div className="p-5"><Empty title="No orders yet">Orders appear here as soon as customers check out.</Empty></div>}
        </Card>
        <Card title="Bestselling products" padded={false}>
          {d.bestsellers.length ? (
            <Table head={["Product", "Units", { label: "Revenue", className: "text-right" }]} className="border-0">
              {d.bestsellers.map((b) => <tr key={b.id ?? b.name}><td>{b.id ? <Link href={`/admin/products/${b.id}`} className="hover:underline">{b.name}</Link> : b.name}</td><td>{b.units}</td><td className="text-right">{finance ? <Money amount={b.revenue} currency={b.currency} /> : "—"}</td></tr>)}
            </Table>
          ) : <p className="p-5 text-[13px] text-charcoal/55">No sales in this period.</p>}
        </Card>
        <Card title="Low stock" actions={<Link href="/admin/inventory?stock=low" className="text-[12px] underline">Inventory</Link>} padded={false}>
          {d.lowStock.length ? (
            <Table head={["Variant", "Available", "Threshold"]} className="border-0">
              {d.lowStock.map((v) => <tr key={v.variantId}><td>{v.name}<span className="block text-[11px] text-charcoal/50">{v.sku}</span></td><td><Status value="low" label={String(v.available)} /></td><td>{v.threshold}</td></tr>)}
            </Table>
          ) : <p className="p-5 text-[13px] text-charcoal/55">Nothing below its threshold.</p>}
        </Card>
        {finance && (
          <Card title="Payment methods" padded={false}>
            {d.methods.length ? (
              <Table head={["Method", "Orders", { label: "Value", className: "text-right" }]} className="border-0">
                {d.methods.map((m) => <tr key={m.method + m.currency}><td>{m.label}</td><td>{m.n}</td><td className="text-right"><Money amount={m.total} currency={m.currency} /></td></tr>)}
              </Table>
            ) : <p className="p-5 text-[13px] text-charcoal/55">No orders in this period.</p>}
          </Card>
        )}
      </div>

      {staffCan(staff, "audit.view") && (
        <Card title="Recent staff activity" actions={<Link href="/admin/audit-log" className="text-[12px] underline">Audit log</Link>}>
          {d.activity.length ? <ul className="space-y-2.5 text-[13px]">{d.activity.map((a) => <li key={a.id} className="flex flex-wrap gap-x-3"><span className="w-40 shrink-0 text-charcoal/50">{fmtDateTime(a.created_at)}</span><span className="text-charcoal/70">{a.actor_label.split(" <")[0]}</span><span>{a.summary}</span></li>)}</ul> : <p className="text-[13px] text-charcoal/55">No activity yet.</p>}
        </Card>
      )}
    </>
  );
}
