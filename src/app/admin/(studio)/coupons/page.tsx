import { asc, desc, isNull, sql } from "drizzle-orm";
import { ActionButton, AdminForm, Check, Disclosure, Field, SelectField } from "@/components/admin/client";
import { Card, fmtDate, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { formatMoney } from "@/lib/commerce/currency";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { CURRENCIES, type CurrencyCode } from "@/types";
import { saveCouponAction, toggleCouponAction } from "../../_actions/ops";

export const metadata = { title: "Coupons" };
type C = typeof s.coupons.$inferSelect;
const major = (n?: number) => (n ? String(n / 100) : "");
const toLocal = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 16) : "");

function CouponForm({ c, markets, products, categories }: { c?: C; markets: { id: string; name: string }[]; products: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  return (
    <AdminForm action={saveCouponAction} submit={c ? "Save coupon" : "Create coupon"} resetOnSuccess={!c} className="md:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Code" name="code" defaultValue={c?.code} required className="uppercase" />
      <Field label="Description (shown to customers)" name="description" defaultValue={c?.description} />
      <SelectField label="Type" name="type" defaultValue={c?.type ?? "percentage"}><option value="percentage">Percentage off</option><option value="fixed">Fixed amount off</option><option value="free_shipping">Free delivery</option></SelectField>
      <Field label="Percentage" name="percent" type="number" step="0.5" defaultValue={c ? String(c.percentBps / 100) : ""} hint="For percentage codes." />
      <fieldset className="md:col-span-2"><legend className="mb-1 text-[11.5px] text-charcoal/65">Fixed amount per currency (major units)</legend><div className="grid grid-cols-4 gap-2">{CURRENCIES.map((x) => <Field key={x} label={x} name={`fixed_${x}`} defaultValue={major(c?.fixedAmounts[x])} inputMode="decimal" />)}</div></fieldset>
      <fieldset className="md:col-span-2"><legend className="mb-1 text-[11.5px] text-charcoal/65">Minimum order subtotal</legend><div className="grid grid-cols-4 gap-2">{CURRENCIES.map((x) => <Field key={x} label={x} name={`min_${x}`} defaultValue={major(c?.minimumSubtotals[x])} inputMode="decimal" />)}</div></fieldset>
      <fieldset className="md:col-span-2"><legend className="mb-1 text-[11.5px] text-charcoal/65">Maximum discount (percentage codes)</legend><div className="grid grid-cols-4 gap-2">{CURRENCIES.map((x) => <Field key={x} label={x} name={`max_${x}`} defaultValue={major(c?.maximumDiscounts[x])} inputMode="decimal" />)}</div></fieldset>
      <Field label="Starts" name="startsAt" type="datetime-local" defaultValue={toLocal(c?.startsAt)} />
      <Field label="Expires" name="endsAt" type="datetime-local" defaultValue={toLocal(c?.endsAt)} />
      <Field label="Total usage limit" name="usageLimit" type="number" defaultValue={c?.usageLimit?.toString() ?? ""} hint="Empty = unlimited." />
      <Field label="Uses per customer" name="perCustomerLimit" type="number" defaultValue={c?.perCustomerLimit?.toString() ?? ""} hint="Counted by account and email." />
      <fieldset className="md:col-span-2"><legend className="mb-1 text-[11.5px] text-charcoal/65">Markets (none = all)</legend><div className="flex flex-wrap gap-4">{markets.map((m) => <Check key={m.id} name="marketIds" value={m.id} label={m.name} defaultChecked={c?.marketIds.includes(m.id)} />)}</div></fieldset>
      <SelectField label="Applies to" name="appliesTo" defaultValue={c?.appliesTo ?? "all"}><option value="all">Whole order</option><option value="categories">Selected categories</option><option value="products">Selected products</option></SelectField>
      <div className="flex flex-col gap-2 pt-5"><Check name="firstOrderOnly" label="First order only" defaultChecked={c?.firstOrderOnly} /><Check name="active" label="Active" defaultChecked={c?.active ?? true} /></div>
      <fieldset><legend className="mb-1 text-[11.5px] text-charcoal/65">Categories</legend><div className="max-h-40 overflow-y-auto rounded-[3px] border border-line p-2">{categories.map((x) => <Check key={x.id} name="categoryIds" value={x.id} label={x.name} defaultChecked={c?.categoryIds.includes(x.id)} />)}</div></fieldset>
      <fieldset><legend className="mb-1 text-[11.5px] text-charcoal/65">Products</legend><div className="max-h-40 overflow-y-auto rounded-[3px] border border-line p-2">{products.map((x) => <Check key={x.id} name="productIds" value={x.id} label={x.name} defaultChecked={c?.productIds.includes(x.id)} />)}</div></fieldset>
    </AdminForm>
  );
}

export default async function CouponsPage() {
  const { staff, allowed } = await staffPage("coupons.view");
  if (!allowed) return <NoAccess permission="coupons.view" />;
  const [coupons, stats, markets, products, categories] = await Promise.all([
    db.select().from(s.coupons).orderBy(desc(s.coupons.createdAt)),
    db.select({ id: s.couponRedemptions.couponId, uses: sql<number>`COUNT(*)`, currency: s.couponRedemptions.currency, total: sql<number>`SUM(${s.couponRedemptions.amount})` }).from(s.couponRedemptions).where(isNull(s.couponRedemptions.voidedAt)).groupBy(s.couponRedemptions.couponId, s.couponRedemptions.currency),
    db.select({ id: s.markets.id, name: s.markets.name }).from(s.markets).orderBy(asc(s.markets.sortOrder)),
    db.select({ id: s.products.id, name: s.products.name }).from(s.products).where(isNull(s.products.deletedAt)).orderBy(asc(s.products.name)),
    db.select({ id: s.categories.id, name: s.categories.name }).from(s.categories),
  ]);
  const can = staffCan(staff, "coupons.manage");
  const now = new Date();
  return (
    <>
      <PageHeader title="Coupons" description="Codes are validated on the server at the bag and again, under a row lock, when the order is placed." />
      {can && <Card title="New coupon" className="mb-6"><Disclosure label="Create a coupon"><p className="mb-3 text-[12px] text-charcoal/55">Tip: for welcome offers use a percentage code with “First order only” and 1 use per customer.</p><CouponForm markets={markets} products={products} categories={categories} /></Disclosure></Card>}
      <Table head={["Code", "Discount", "Rules", "Validity", "Used", "Status", ""]}>
        {coupons.map((c) => {
          const st = stats.filter((x) => x.id === c.id);
          const expired = c.endsAt && c.endsAt < now;
          return (
            <tr key={c.id}>
              <td className="font-medium">{c.code}<span className="block text-[11.5px] font-normal text-charcoal/55">{c.description}</span></td>
              <td>{c.type === "percentage" ? `${c.percentBps / 100}%` : c.type === "fixed" ? Object.entries(c.fixedAmounts).map(([k, v]) => formatMoney(v, k as CurrencyCode)).join(" / ") : "Free delivery"}</td>
              <td className="text-[12px] text-charcoal/65">{[c.firstOrderOnly && "First order", c.perCustomerLimit && `${c.perCustomerLimit}× per customer`, c.marketIds.length ? c.marketIds.join(", ") : "All markets", c.appliesTo !== "all" && `Only ${c.appliesTo}`, Object.keys(c.minimumSubtotals).length && `Min ${Object.entries(c.minimumSubtotals).map(([k, v]) => formatMoney(v, k as CurrencyCode)).join("/")}`].filter(Boolean).join(" · ")}</td>
              <td className="text-[12px]">{fmtDate(c.startsAt)} – {c.endsAt ? fmtDate(c.endsAt) : "no end"}</td>
              <td>{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}<span className="block text-[11px] text-charcoal/50">{st.map((x) => `−${formatMoney(Number(x.total), x.currency as CurrencyCode)}`).join(" · ")}</span></td>
              <td><Status value={!c.active ? "inactive" : expired ? "closed" : "active"} label={!c.active ? "Inactive" : expired ? "Expired" : "Active"} /></td>
              <td className="min-w-[220px]">
                {can && <div className="flex flex-wrap gap-1">
                  <ActionButton action={toggleCouponAction} fields={{ id: c.id, op: "toggle" }} label={c.active ? "Deactivate" : "Activate"} variant="ghost" />
                  <ActionButton action={toggleCouponAction} fields={{ id: c.id, op: "delete" }} label="Delete" variant="ghost" confirm={`Delete ${c.code}?`} />
                  <Disclosure label="Edit" variant="ghost"><CouponForm c={c} markets={markets} products={products} categories={categories} /></Disclosure>
                </div>}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
