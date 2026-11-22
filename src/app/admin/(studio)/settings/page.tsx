import { asc, desc, isNull } from "drizzle-orm";
import { AdminForm, Check, Disclosure, Field, SelectField, TextareaField } from "@/components/admin/client";
import { Card, NoAccess, PageHeader, Status } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { emailDriver } from "@/server/email";
import { mediaDriver, r2Missing } from "@/server/media/storage";
import { getSettings } from "@/server/settings";
import { turnstileEnabled } from "@/server/lib/turnstile";
import { saveCurrencyAction, saveMarketAction, saveSettingsAction, saveTaxAction } from "../../_actions/ops";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { staff, allowed } = await staffPage("settings.view");
  if (!allowed) return <NoAccess permission="settings.view" />;
  const [st, currencies, markets, countries, taxes, media] = await Promise.all([
    getSettings(),
    db.select().from(s.currencies).orderBy(asc(s.currencies.sortOrder)),
    db.select().from(s.markets).orderBy(asc(s.markets.sortOrder)),
    db.select().from(s.countries).orderBy(asc(s.countries.name)),
    db.select().from(s.taxSettings).orderBy(asc(s.taxSettings.countryCode)),
    db.select({ id: s.mediaAssets.id, alt: s.mediaAssets.alt, filename: s.mediaAssets.filename }).from(s.mediaAssets).where(isNull(s.mediaAssets.deletedAt)).orderBy(desc(s.mediaAssets.createdAt)).limit(300),
  ]);
  const can = staffCan(staff, "settings.manage");
  const mediaOpts = media.map((m) => <option key={m.id} value={m.id}>{(m.alt || m.filename).slice(0, 70)}</option>);
  const services: [string, boolean, string][] = [
    ["Database", true, "MySQL connected"],
    ["Transactional email", emailDriver() === "resend", emailDriver() === "resend" ? "Resend" : "Not configured — emails are logged as skipped, never sent"],
    ["Media storage", mediaDriver() === "local" || !r2Missing().length, mediaDriver() === "r2" ? (r2Missing().length ? `R2 missing ${r2Missing().join(", ")}` : "Cloudflare R2") : "Local uploads folder (development only)"],
    ["Bot protection (Turnstile)", turnstileEnabled(), turnstileEnabled() ? "Enabled on contact & newsletter forms" : "Not configured"],
    ["Scheduled maintenance (cron)", !!process.env.CRON_SECRET, process.env.CRON_SECRET ? "CRON_SECRET set — schedule /api/cron/maintenance" : "CRON_SECRET missing"],
    ["Error monitoring", !!process.env.SENTRY_DSN, process.env.SENTRY_DSN ? "SENTRY_DSN set" : "Not configured (errors go to server logs)"],
  ];

  return (
    <>
      <PageHeader title="Settings" description="Secrets (database, payment, email, storage keys) are server environment variables and are never editable or visible here." />
      <Card title="Service status" className="mb-6">
        <ul className="grid gap-2 text-[13px] md:grid-cols-2">{services.map(([name, ok, note]) => <li key={name} className="flex items-center gap-3"><Status value={ok ? "active" : "failed"} label={ok ? "OK" : "Action needed"} /><span><strong className="font-medium">{name}</strong> — {note}</span></li>)}</ul>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Store & contact">
          <AdminForm action={saveSettingsAction} submit="Save" footer={can}>
            <input type="hidden" name="group" value="store" />
            <Field label="Store name" name="storeName" defaultValue={st.storeName} />
            <Field label="Legal name (invoices)" name="legalName" defaultValue={st.legalName} />
            <Field label="Support email" name="supportEmail" type="email" defaultValue={st.supportEmail} />
            <Field label="Support phone" name="supportPhone" defaultValue={st.supportPhone} />
            <Field label="WhatsApp" name="whatsapp" defaultValue={st.whatsapp} />
            <TextareaField label="Atelier address" name="address" defaultValue={st.address} rows={2} />
            <SelectField label="Logo image (optional)" name="logoMediaId" defaultValue={st.logoMediaId ?? ""}><option value="">Use the built-in wordmark</option>{mediaOpts}</SelectField>
            <p className="text-[11.5px] text-charcoal/55">Social links appear in the footer only when set. Confirm the official handles first.</p>
            {(["instagram", "facebook", "pinterest", "tiktok"] as const).map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)} name={k} defaultValue={st.social[k]} placeholder="https://" />)}
          </AdminForm>
        </Card>
        <Card title="Storefront" id="storefront">
          <AdminForm action={saveSettingsAction} submit="Save" footer={can}>
            <input type="hidden" name="group" value="storefront" />
            <Check name="announcementEnabled" label="Show announcement bar" defaultChecked={st.announcement.enabled} />
            <Field label="Announcement" name="announcementMessage" defaultValue={st.announcement.message} />
            <Field label="Announcement link" name="announcementHref" defaultValue={st.announcement.href} />
            <TextareaField label="Footer — about" name="footerAbout" defaultValue={st.footer.about} rows={2} />
            <Field label="Footer — copyright name" name="footerCopyright" defaultValue={st.footer.copyright} />
            <Field label="Payment note in footer" name="paymentNote" defaultValue={st.paymentNote} />
            <div className="rounded-[3px] border border-line p-3">
              <Check name="maintenanceEnabled" label="Maintenance mode (storefront shows a holding page; Studio keeps working)" defaultChecked={st.maintenance.enabled} />
              <Field label="Maintenance message" name="maintenanceMessage" defaultValue={st.maintenance.message} className="mt-2" />
            </div>
          </AdminForm>
        </Card>
        <Card title="SEO defaults">
          <AdminForm action={saveSettingsAction} submit="Save" footer={can}>
            <input type="hidden" name="group" value="seo" />
            <Field label="Homepage title" name="seoTitle" defaultValue={st.seo.title} />
            <TextareaField label="Default description" name="seoDescription" defaultValue={st.seo.description} rows={3} />
            <SelectField label="Default share image" name="ogImageId" defaultValue={st.seo.ogImageId ?? ""}><option value="">Homepage hero</option>{mediaOpts}</SelectField>
          </AdminForm>
        </Card>
        <Card title="Orders & checkout">
          <AdminForm action={saveSettingsAction} submit="Save" footer={can}>
            <input type="hidden" name="group" value="commerce" />
            <SelectField label="Default market" name="defaultMarketId" defaultValue={st.defaultMarketId}>{markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</SelectField>
            <Field label="Order number prefix" name="orderNumberPrefix" defaultValue={st.orderNumberPrefix} />
            <Field label="Default low-stock threshold" name="lowStockThreshold" type="number" defaultValue={String(st.lowStockThreshold)} />
            <Field label="Stock reservation for online payments (minutes)" name="reservationMinutes" type="number" defaultValue={String(st.checkout.reservationMinutes)} />
            <Field label="Maximum quantity per item" name="maxQuantityPerLine" type="number" defaultValue={String(st.checkout.maxQuantityPerLine)} />
            <Check name="guestCheckout" label="Allow guest checkout" defaultChecked={st.checkout.guestCheckout} />
          </AdminForm>
        </Card>
        <Card title="Currencies">
          <p className="mb-3 text-[12px] text-charcoal/55">Products have an explicit price in each currency. Rates are only used as a fallback for missing prices and for the PKR-equivalent chart.</p>
          {currencies.map((c) => (
            <AdminForm key={c.code} action={saveCurrencyAction} submit={`Save ${c.code}`} footer={can} className="mb-3 grid-cols-[1fr_auto] items-end">
              <input type="hidden" name="code" value={c.code} />
              <Field label={`${c.code} per 1 PKR`} name="rate" defaultValue={String(c.rateFromPkrMicros / 1_000_000)} disabled={c.code === "PKR"} />
              {c.code !== "PKR" && <Check name="active" label="Active" defaultChecked={c.active} />}
            </AdminForm>
          ))}
        </Card>
        <Card title="Tax">
          {taxes.map((t) => (
            <Disclosure key={t.id} label={`${t.countryCode === "*" ? "Default" : t.countryCode} · ${t.label} ${t.rateBps / 100}% ${t.inclusive ? "included" : "added"}${t.dutiesOnDelivery ? " · duties on delivery" : ""}`} variant="ghost">
              <TaxForm t={t} can={can} />
            </Disclosure>
          ))}
          {can && <div className="mt-3"><Disclosure label="Add tax rule"><TaxForm can={can} /></Disclosure></div>}
          <p className="mt-3 text-[11.5px] text-warning">Confirm GST/VAT registration and rates with your accountant for each market.</p>
        </Card>
        <Card title="Markets & countries" className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            {markets.map((m) => (
              <AdminForm key={m.id} action={saveMarketAction} submit="Save" footer={can} className="rounded-[3px] border border-line p-3">
                <input type="hidden" name="id" value={m.id} />
                <Field label={`Market name (${m.currency})`} name="name" defaultValue={m.name} />
                <Check name="active" label="Market active" defaultChecked={m.active} />
                <div className="flex flex-wrap gap-x-4 gap-y-1">{countries.filter((c) => c.marketId === m.id).map((c) => <span key={c.code}><input type="hidden" name="countryCodes" value={c.code} /><Check name={`country_${c.code}`} label={c.name} defaultChecked={c.active} /></span>)}</div>
              </AdminForm>
            ))}
          </div>
        </Card>
      </div>
      <p className="mt-6 text-[12.5px] text-charcoal/60">Email templates are under <a href="/admin/messages#templates" className="underline">Messages & emails</a>; shipping under <a href="/admin/shipping" className="underline">Shipping</a>; policies under <a href="/admin/content" className="underline">Pages & navigation</a>.</p>
    </>
  );
}

function TaxForm({ t, can }: { t?: typeof s.taxSettings.$inferSelect; can: boolean }) {
  return (
    <AdminForm action={saveTaxAction} submit="Save" footer={can} className="grid-cols-2">
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="Country (ISO, or * default)" name="countryCode" defaultValue={t?.countryCode} />
      <Field label="Label" name="label" defaultValue={t?.label ?? "VAT"} />
      <Field label="Rate %" name="rate" defaultValue={t ? String(t.rateBps / 100) : ""} inputMode="decimal" />
      <div className="flex flex-col gap-1 pt-4"><Check name="inclusive" label="Included in prices" defaultChecked={t?.inclusive ?? true} /><Check name="dutiesOnDelivery" label="Duties collected on delivery" defaultChecked={t?.dutiesOnDelivery} /><Check name="active" label="Active" defaultChecked={t?.active ?? true} /></div>
    </AdminForm>
  );
}
