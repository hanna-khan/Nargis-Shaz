import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { AdminForm, Check, Disclosure, Field, SelectField } from "@/components/admin/client";
import { RangeFilter } from "@/components/admin/range-filter";
import { Card, fmtDateTime, Money, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { parseRange, report } from "@/server/admin/reports";
import { provider } from "@/server/payments/providers";
import { CURRENCIES } from "@/types";
import { savePaymentMethodAction } from "../../_actions/ops";

export const metadata = { title: "Payments" };

export default async function PaymentsPage(props: PageProps<"/admin/payments">) {
  const { staff, allowed } = await staffPage("payments.view");
  if (!allowed) return <NoAccess permission="payments.view" />;
  const sp = await props.searchParams;
  const range = parseRange(sp);
  const [methods, markets, recent, webhooks, recon] = await Promise.all([
    db.select().from(s.paymentMethods).orderBy(asc(s.paymentMethods.sortOrder)),
    db.select({ id: s.markets.id, name: s.markets.name }).from(s.markets),
    db.select({ p: s.payments, number: s.orders.number }).from(s.payments).innerJoin(s.orders, eq(s.orders.id, s.payments.orderId)).orderBy(desc(s.payments.createdAt)).limit(40),
    db.select().from(s.paymentWebhookEvents).orderBy(desc(s.paymentWebhookEvents.receivedAt)).limit(40),
    report("payments", range),
  ]);
  const can = staffCan(staff, "payments.manage");
  const failed = recent.filter((r) => r.p.status === "failed");
  return (
    <>
      <PageHeader title="Payments" description="Gateway credentials live only in server environment variables — they are never shown or stored here. An online payment is marked paid only after a signed webhook and a server-to-server check with the provider." />
      <h2 className="mb-3 text-[11px] tracking-[0.18em] uppercase">Payment methods</h2>
      <div className="mb-8 grid gap-4 xl:grid-cols-2">
        {methods.map((m) => {
          const p = provider(m.provider);
          const missing = p?.missingConfig() ?? ["unknown provider"];
          const ready = !!p?.isConfigured();
          return (
            <Card key={m.id} title={`${m.label} · ${m.provider}`} actions={<span className="flex gap-2"><Status value={m.enabled ? "active" : "inactive"} label={m.enabled ? "Enabled" : "Disabled"} /><Status value={ready ? "live" : "failed"} label={ready ? `Configured (${p!.mode()})` : "Not configured"} /></span>}>
              <p className="text-[12.5px] text-charcoal/65">{m.description}</p>
              {!ready && <p className="mt-2 text-[12px] text-danger">Missing server settings: {missing.join(", ")}. The method stays hidden at checkout until these are set.</p>}
              {m.provider === "safepay" && <p className="mt-2 text-[12px] text-warning">Integrated from Safepay&apos;s public documentation; run the sandbox checklist (docs/DEPLOYMENT_GUIDE.md) before enabling.</p>}
              {m.provider === "stripe" && <p className="mt-2 text-[12px] text-warning">Stripe doesn&apos;t onboard Pakistan-registered businesses; enable only with an account for a supported country (e.g. a UK company).</p>}
              {m.provider === "test" && <p className="mt-2 text-[12px] text-charcoal/55">Development & automated tests only — refuses to run in production.</p>}
              {can && <div className="mt-3"><Disclosure label="Configure" variant="ghost">
                <AdminForm action={savePaymentMethodAction} submit="Save">
                  <input type="hidden" name="id" value={m.id} />
                  <Field label="Label at checkout" name="label" defaultValue={m.label} />
                  <Field label="Description" name="description" defaultValue={m.description} />
                  <fieldset><legend className="mb-1 text-[11.5px] text-charcoal/65">Markets</legend><div className="flex flex-wrap gap-4">{markets.map((x) => <Check key={x.id} name="marketIds" value={x.id} label={x.name} defaultChecked={m.marketIds.includes(x.id)} />)}</div></fieldset>
                  <SelectField label="Mode (record only — credentials decide the real mode)" name="mode" defaultValue={m.mode}><option value="test">Sandbox / test</option><option value="live">Live</option></SelectField>
                  {m.kind === "cod" && <fieldset><legend className="mb-1 text-[11.5px] text-charcoal/65">Maximum order value for COD</legend><div className="grid grid-cols-4 gap-2">{CURRENCIES.map((c) => <Field key={c} label={c} name={`limit_${c}`} defaultValue={m.limits[c] ? String(m.limits[c] / 100) : ""} inputMode="decimal" />)}</div></fieldset>}
                  <Field label="Order at checkout" name="sortOrder" type="number" defaultValue={String(m.sortOrder)} />
                  <Check name="enabled" label="Enabled" defaultChecked={m.enabled} />
                </AdminForm>
              </Disclosure></div>}
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 text-[11px] tracking-[0.18em] uppercase">Reconciliation</h2>
      <RangeFilter path="/admin/payments" range={range} />
      <Table head={recon.columns.map((c) => c.label)} className="mb-8">
        {recon.rows.map((r, i) => <tr key={i}>{recon.columns.map((c) => <td key={c.key}>{c.money ? <Money amount={Number(r[c.key] ?? 0)} currency={String(r.currency)} /> : String(r[c.key] ?? "")}</td>)}</tr>)}
      </Table>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`Recent payments${failed.length ? ` · ${failed.length} failed` : ""}`} padded={false}>
          <Table head={["When", "Order", "Provider", "Status", { label: "Amount", className: "text-right" }]} className="border-0">
            {recent.map(({ p, number }) => <tr key={p.id}><td className="whitespace-nowrap">{fmtDateTime(p.createdAt)}</td><td><Link href={`/admin/orders/${p.orderId}`} className="underline">{number}</Link></td><td>{p.provider}</td><td><Status value={p.status} />{p.failureReason && <span className="block text-[11px] text-danger">{p.failureReason}</span>}</td><td className="text-right"><Money amount={p.amount} currency={p.currency} /></td></tr>)}
          </Table>
        </Card>
        <Card title="Webhook events" padded={false}>
          <Table head={["Received", "Provider", "Event", "Signature", "Status", "Deliveries"]} className="border-0">
            {webhooks.map((w) => <tr key={w.id}><td className="whitespace-nowrap">{fmtDateTime(w.receivedAt)}</td><td>{w.provider}</td><td className="max-w-[160px] truncate">{w.eventType}</td><td>{w.signatureValid ? "Valid" : <span className="text-danger">Invalid</span>}</td><td><Status value={w.status} />{w.error && <span className="block text-[11px] text-charcoal/55">{w.error}</span>}</td><td>{w.attempts}</td></tr>)}
          </Table>
          {!webhooks.length && <p className="p-5 text-[13px] text-charcoal/55">No webhooks received yet.</p>}
        </Card>
      </div>
    </>
  );
}
