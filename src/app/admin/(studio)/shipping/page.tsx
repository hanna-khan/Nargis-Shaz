import { asc } from "drizzle-orm";
import { AdminForm, Check, Disclosure, Field, SelectField } from "@/components/admin/client";
import { Card, NoAccess, PageHeader, Status } from "@/components/admin/ui";
import { formatMoney } from "@/lib/commerce/currency";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import type { CurrencyCode } from "@/types";
import { saveMethodAction, saveZoneAction } from "../../_actions/ops";

export const metadata = { title: "Shipping" };
type Z = typeof s.shippingZones.$inferSelect;
type M = typeof s.shippingMethods.$inferSelect;
const major = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n / 100));

function ZoneForm({ z, markets }: { z?: Z; markets: { id: string; name: string }[] }) {
  return (
    <AdminForm action={saveZoneAction} submit="Save zone" resetOnSuccess={!z} className="md:grid-cols-2">
      {z && <input type="hidden" name="id" value={z.id} />}
      <Field label="Zone name" name="name" defaultValue={z?.name} required />
      <SelectField label="Market (sets currency)" name="marketId" defaultValue={z?.marketId}>{markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</SelectField>
      <Field label="Countries (ISO codes)" name="countries" defaultValue={z?.countries.join(", ")} placeholder="PK" />
      <Field label="Cities (optional, comma separated)" name="cities" defaultValue={z?.cities.join(", ")} hint="Empty = whole country." />
      <Field label="Order" name="sortOrder" type="number" defaultValue={String(z?.sortOrder ?? 0)} />
      <Check name="active" label="Active" defaultChecked={z?.active ?? true} />
    </AdminForm>
  );
}

function MethodForm({ m, zones }: { m?: M; zones: Z[] }) {
  return (
    <AdminForm action={saveMethodAction} submit="Save method" resetOnSuccess={!m} className="md:grid-cols-3">
      {m && <input type="hidden" name="id" value={m.id} />}
      <SelectField label="Zone" name="zoneId" defaultValue={m?.zoneId}>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</SelectField>
      <Field label="Name" name="label" defaultValue={m?.label} required />
      <Field label="Carrier / provider" name="carrier" defaultValue={m?.carrier} />
      <Field label="Description" name="description" defaultValue={m?.description} className="md:col-span-3" />
      <Field label="Charge (zone currency, major units)" name="rate" defaultValue={major(m?.rate)} inputMode="decimal" required />
      <Field label="Free over (empty = never)" name="freeOver" defaultValue={major(m?.freeOver)} inputMode="decimal" />
      <Field label="Order" name="sortOrder" type="number" defaultValue={String(m?.sortOrder ?? 0)} />
      <Field label="Min working days" name="minDays" type="number" defaultValue={String(m?.minDays ?? 2)} />
      <Field label="Max working days" name="maxDays" type="number" defaultValue={String(m?.maxDays ?? 5)} />
      <Field label="Only these cities (optional)" name="cities" defaultValue={m?.cities.join(", ")} />
      <Field label="Tracking link template" name="trackingUrlTemplate" defaultValue={m?.trackingUrlTemplate ?? ""} placeholder="https://…?id={tracking}" className="md:col-span-2" />
      <div className="flex flex-col gap-2 pt-5"><Check name="codAvailable" label="Cash on delivery allowed" defaultChecked={m?.codAvailable} /><Check name="active" label="Active" defaultChecked={m?.active ?? true} /></div>
    </AdminForm>
  );
}

export default async function ShippingPage() {
  const { staff, allowed } = await staffPage("shipping.view");
  if (!allowed) return <NoAccess permission="shipping.view" />;
  const [zones, methods, markets] = await Promise.all([
    db.select().from(s.shippingZones).orderBy(asc(s.shippingZones.sortOrder)),
    db.select().from(s.shippingMethods).orderBy(asc(s.shippingMethods.sortOrder)),
    db.select({ id: s.markets.id, name: s.markets.name }).from(s.markets).orderBy(asc(s.markets.sortOrder)),
  ]);
  const can = staffCan(staff, "shipping.manage");
  return (
    <>
      <PageHeader title="Shipping" description="Zones decide which countries (and cities) a method serves; charges are in the zone's market currency. Free-delivery thresholds apply to the discounted subtotal." />
      {zones.map((z) => (
        <Card key={z.id} title={`${z.name} · ${z.countries.join(", ")}${z.cities.length ? ` · ${z.cities.join(", ")}` : ""}`} className="mb-4" actions={<Status value={z.active ? "active" : "inactive"} />}>
          <ul className="grid gap-3">
            {methods.filter((m) => m.zoneId === z.id).map((m) => (
              <li key={m.id} className="rounded-[3px] border border-line p-3">
                <div className="flex flex-wrap items-center gap-3 text-[13px]">
                  <strong className="font-medium">{m.label}</strong><span>{formatMoney(m.rate, m.currency as CurrencyCode)}{m.freeOver !== null ? ` · free over ${formatMoney(m.freeOver, m.currency as CurrencyCode)}` : ""}</span>
                  <span className="text-charcoal/55">{m.minDays}–{m.maxDays} days · {m.carrier}{m.codAvailable ? " · COD" : ""}{m.cities.length ? ` · ${m.cities.join(", ")}` : ""}</span>
                  <Status value={m.active ? "active" : "inactive"} />
                </div>
                {can && <div className="mt-2"><Disclosure label="Edit" variant="ghost"><MethodForm m={m} zones={zones} /></Disclosure></div>}
              </li>
            ))}
          </ul>
          {can && <div className="mt-3"><Disclosure label="Edit zone" variant="ghost"><ZoneForm z={z} markets={markets} /></Disclosure></div>}
        </Card>
      ))}
      {can && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="New delivery method"><MethodForm zones={zones} /></Card>
          <Card title="New zone"><ZoneForm markets={markets} /></Card>
        </div>
      )}
    </>
  );
}
