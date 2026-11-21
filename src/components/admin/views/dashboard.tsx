"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/commerce/currency";
import { formatDate } from "@/lib/utils";
import { useAdmin } from "../admin-context";
import { SalesChart } from "../sales-chart";
import { Card, Gate, PageHeader, StatCard, Status } from "../ui";

export function DashboardView() {
  const { me, orders, products, sales, settings, audit, customers, can } = useAdmin();
  const last7 = sales.slice(-7), prev7 = sales.slice(-14, -7);
  const sum = (a: typeof sales, k: "revenue" | "orders") => a.reduce((x, d) => x + d[k], 0);
  const rev = sum(last7, "revenue"), revPrev = sum(prev7, "revenue");
  const ord = sum(last7, "orders"), ordPrev = sum(prev7, "orders");
  const lowStock = products.flatMap((p) => p.variants.filter((v) => v.stock > 0 && v.stock <= settings.lowStockThreshold).map((v) => ({ p, v })));
  const toFulfil = orders.filter((o) => ["unfulfilled", "processing"].includes(o.fulfilmentStatus));
  const byMarket = ["pk", "gb", "eu", "us", "intl"].map((m) => ({ m, n: orders.filter((o) => o.marketId === m).length }));

  return (
    <>
      <PageHeader title={`Good day, ${me.name.split(" ")[0]}`} description={`Here's how the store is doing · ${formatDate("2026-11-21T09:00:00.000Z", { weekday: "long", day: "numeric", month: "long" })}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can("finance.view") ? <StatCard label="Revenue · 7 days" value={formatMoney(rev, "PKR")} delta={((rev - revPrev) / revPrev) * 100} hint="vs previous week" /> : <StatCard label="Revenue" value="—" hint="Requires financial access" />}
        <StatCard label="Orders · 7 days" value={String(ord)} delta={((ord - ordPrev) / ordPrev) * 100} hint="all markets" />
        {can("finance.view") ? <StatCard label="Average order" value={formatMoney(Math.round(rev / ord), "PKR")} hint="PKR equivalent" /> : <StatCard label="To fulfil" value={String(toFulfil.length)} hint="orders waiting" />}
        <StatCard label="Customers" value={String(customers.length)} hint={`${customers.filter((c) => c.countryCode !== "PK").length} international`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Gate perm="finance.view" fallback={<Card title="Sales overview"><p className="py-16 text-center text-[13px] text-charcoal/55">Sales figures are visible to roles with financial access.</p></Card>}>
          <Card title="Revenue · last 30 days" actions={<span className="text-[11.5px] text-charcoal/50">PKR equivalent, all markets</span>}><SalesChart data={sales} /></Card>
        </Gate>
        <Card title="Orders by market">
          <ul className="space-y-3">
            {byMarket.map(({ m, n }) => (
              <li key={m} className="grid grid-cols-[110px_1fr_28px] items-center gap-3 text-[13px]">
                <span>{{ pk: "Pakistan", gb: "United Kingdom", eu: "Europe", us: "United States", intl: "Rest of world" }[m]}</span>
                <span className="h-2 rounded-full bg-beige"><span className="block h-2 rounded-full bg-mocha" style={{ width: `${(n / orders.length) * 100}%` }} /></span>
                <span className="text-right">{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[12px] text-charcoal/55">{orders.filter((o) => o.paymentKind === "cod").length} of {orders.length} recent orders are cash on delivery.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="To fulfil" actions={<Link href="/admin/orders" className="text-[12px] underline">All orders</Link>} padded={false}>
          <ul>{toFulfil.slice(0, 5).map((o) => (
            <li key={o.id} className="border-b border-line/70 last:border-0">
              <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ivory/60">
                <span><span className="font-medium">{o.number}</span><span className="ml-2 text-charcoal/55">{o.shippingAddress.firstName} · {o.countryCode}</span></span>
                <Status value={o.fulfilmentStatus} />
              </Link>
            </li>
          ))}</ul>
        </Card>
        <Card title="Low stock" actions={<Link href="/admin/inventory" className="text-[12px] underline">Inventory</Link>} padded={false}>
          <ul>{lowStock.slice(0, 6).map(({ p, v }) => (
            <li key={v.id} className="flex items-center justify-between border-b border-line/70 px-5 py-2.5 text-[13px] last:border-0">
              <span>{p.name}<span className="ml-2 text-charcoal/50">{p.colours.find((c) => c.id === v.colourId)?.name} · {v.size}</span></span>
              <Status value="low" label={`${v.stock} left`} />
            </li>
          ))}</ul>
        </Card>
        <Card title="Recent activity" actions={<Gate perm="team.view"><Link href="/admin/audit-log" className="text-[12px] underline">Audit log</Link></Gate>} padded={false}>
          <ul>{audit.slice(0, 6).map((a) => (
            <li key={a.id} className="border-b border-line/70 px-5 py-2.5 text-[13px] last:border-0">
              <p>{a.summary}</p><p className="text-[11.5px] text-charcoal/50">{a.actorName} · {formatDate(a.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </li>
          ))}</ul>
        </Card>
      </div>
    </>
  );
}
