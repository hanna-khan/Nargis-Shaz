"use client";

import { useState } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { RESOURCES, ROLES } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/commerce/currency";
import { PAYMENT_METHODS } from "@/lib/payments/registry";
import { formatDate } from "@/lib/utils";
import { CURRENCIES, type HomepageContent, type RoleId, type ShippingMethod, type StoreSettings } from "@/types";
import { useAdmin } from "../admin-context";
import { AButton, AInput, ASelect, ATextarea, Card, DataTable, Gate, Modal, NoAccess, PageHeader, Status, Tabs, Toggle } from "../ui";

/* ───────────── Homepage content ───────────── */

export function ContentView() {
  const { homepage, saveHomepage, collections, can } = useAdmin();
  const [h, setH] = useState<HomepageContent>(homepage);
  if (!can("content.view")) return <NoAccess perm="content.view" />;
  const editable = can("content.update");
  const dirty = JSON.stringify(h) !== JSON.stringify(homepage);
  return (
    <>
      <PageHeader title="Homepage content" description="Edit the campaign copy shown on the storefront homepage. Use *asterisks* for italic emphasis."
        actions={<><AButton variant="outline" disabled={!dirty} onClick={() => setH(homepage)}>Discard</AButton><AButton disabled={!editable || !dirty} onClick={() => saveHomepage(h)}>Publish changes</AButton></>} />
      <fieldset disabled={!editable} className="grid gap-6 xl:grid-cols-2">
        <Card title="Announcement bar"><AInput value={h.announcement} onChange={(e) => setH({ ...h, announcement: e.target.value })} aria-label="Announcement" /></Card>
        <Card title="Featured occasions">
          <div className="flex flex-wrap gap-2">{collections.filter((c) => c.occasionId).map((c) => {
            const on = h.featuredCollectionIds.includes(c.id);
            return <button key={c.id} type="button" aria-pressed={on} onClick={() => setH({ ...h, featuredCollectionIds: on ? h.featuredCollectionIds.filter((x) => x !== c.id) : [...h.featuredCollectionIds, c.id].slice(0, 3) })} className={`rounded-full border px-3 py-1 text-[12px] ${on ? "border-charcoal bg-charcoal text-ivory" : "border-line bg-white"}`}>{c.name}</button>;
          })}</div>
          <p className="mt-2 text-[12px] text-charcoal/55">Up to three, shown as arches on the homepage.</p>
        </Card>
        <Card title="Hero">
          <div className="space-y-3">
            <AInput label="Eyebrow" value={h.hero.eyebrow} onChange={(e) => setH({ ...h, hero: { ...h.hero, eyebrow: e.target.value } })} />
            <AInput label="Headline" value={h.hero.headline} onChange={(e) => setH({ ...h, hero: { ...h.hero, headline: e.target.value } })} />
            <ATextarea label="Body" value={h.hero.body} onChange={(e) => setH({ ...h, hero: { ...h.hero, body: e.target.value } })} />
            <div className="grid grid-cols-2 gap-3">
              <AInput label="Primary button" value={h.hero.primaryCta.label} onChange={(e) => setH({ ...h, hero: { ...h.hero, primaryCta: { ...h.hero.primaryCta, label: e.target.value } } })} />
              <AInput label="Primary link" value={h.hero.primaryCta.href} onChange={(e) => setH({ ...h, hero: { ...h.hero, primaryCta: { ...h.hero.primaryCta, href: e.target.value } } })} />
            </div>
          </div>
        </Card>
        <Card title="Preview">
          <div className="relative overflow-hidden rounded-[3px] bg-mocha p-8 text-ivory" style={{ background: "radial-gradient(120% 90% at 70% 20%, #E7DCCB, #C7B49D 50%, #9A8069)" }}>
            <p className="text-[10px] tracking-[0.26em] uppercase">{h.hero.eyebrow}</p>
            <p className="mt-3 font-serif text-[40px] leading-none font-light">{h.hero.headline.split(/(\*[^*]+\*)/).map((s, i) => (s.startsWith("*") ? <em key={i}>{s.slice(1, -1)}</em> : s))}</p>
            <p className="mt-3 max-w-[340px] text-[13px] opacity-90">{h.hero.body}</p>
            <span className="mt-5 inline-block border border-ivory px-5 py-2.5 text-[10px] tracking-[0.22em] uppercase">{h.hero.primaryCta.label}</span>
          </div>
        </Card>
        <Card title="Brand statement">
          <ATextarea value={h.statement.text} onChange={(e) => setH({ ...h, statement: { ...h.statement, text: e.target.value } })} aria-label="Statement" />
        </Card>
        <Card title="Story band & quote">
          <div className="space-y-3">
            <AInput label="Story headline" value={h.story.headline} onChange={(e) => setH({ ...h, story: { ...h.story, headline: e.target.value } })} />
            <ATextarea label="Story body" value={h.story.body} onChange={(e) => setH({ ...h, story: { ...h.story, body: e.target.value } })} />
            <ATextarea label="Customer quote" value={h.quote.text} onChange={(e) => setH({ ...h, quote: { ...h.quote, text: e.target.value } })} className="min-h-16" />
            <AInput label="Attribution" value={h.quote.attribution} onChange={(e) => setH({ ...h, quote: { ...h.quote, attribution: e.target.value } })} />
          </div>
        </Card>
      </fieldset>
    </>
  );
}

/* ───────────── Media ───────────── */

export function MediaView() {
  const { media, can } = useAdmin();
  const [folder, setFolder] = useState<"all" | "products" | "campaigns">("all");
  const [sel, setSel] = useState<string | null>(null);
  if (!can("content.view")) return <NoAccess perm="content.view" />;
  const list = media.filter((m) => folder === "all" || m.folder === folder);
  const active = media.find((m) => m.id === sel);
  return (
    <>
      <PageHeader title="Media library" description={`${media.length} assets · Supabase Storage in Phase 2`} actions={<Gate perm="content.create"><AButton variant="outline" title="Uploads connect in Phase 2">Upload</AButton></Gate>} />
      <Tabs value={folder} onChange={setFolder} tabs={[{ id: "all", label: "All", count: media.length }, { id: "products", label: "Products", count: media.filter((m) => m.folder === "products").length }, { id: "campaigns", label: "Campaigns", count: media.filter((m) => m.folder === "campaigns").length }]} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {list.map((m) => (
          <li key={m.id}>
            <button onClick={() => setSel(m.id)} className="block w-full text-left">
              <EditorialImage image={m} className="aspect-[4/5] rounded-[2px]" sizes="140px" />
              <p className="mt-1 truncate text-[11.5px]">{m.filename}</p>
              <p className="text-[10.5px] text-charcoal/50">{m.sizeKb} KB</p>
            </button>
          </li>
        ))}
      </ul>
      <Modal open={!!active} onClose={() => setSel(null)} title={active?.filename ?? ""}>
        {active && <><EditorialImage image={active} className="mx-auto aspect-[4/5] w-56 rounded-[2px]" sizes="224px" /><AInput label="Alt text (for accessibility & SEO)" defaultValue={active.alt} /><p className="text-[12px] text-charcoal/55">{active.folder} · {active.sizeKb} KB · uploaded {formatDate(active.uploadedAt)}</p></>}
      </Modal>
    </>
  );
}

/* ───────────── Team & roles ───────────── */

export function TeamView() {
  const { staff, me, can, inviteStaff, changeRole } = useAdmin();
  const [invite, setInvite] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", roleId: "staff" as RoleId });
  if (!can("team.view")) return <NoAccess perm="team.view" />;
  const assignable = ROLES[me.roleId].canAssign;
  return (
    <>
      <PageHeader title="Team & roles" description="Staff accounts and what each role can do." actions={<Gate perm="team.manage"><AButton onClick={() => setInvite(true)}>Invite staff</AButton></Gate>} />
      <DataTable rows={staff} getId={(s) => s.id} columns={[
        { key: "n", header: "Member", cell: (s) => <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full text-[11px] text-white" style={{ background: s.avatarTone }}>{s.name.split(" ").map((x) => x[0]).join("")}</span><div><p className="font-medium">{s.name}{s.id === me.id && <span className="ml-2 text-[11px] text-charcoal/50">(you)</span>}</p><p className="text-[12px] text-charcoal/55">{s.email}</p></div></div> },
        { key: "r", header: "Role", cell: (s) => can("team.manage") && s.roleId !== "owner" && s.id !== me.id ? (
          <ASelect value={s.roleId} onChange={(e) => changeRole(s.id, e.target.value as RoleId)} className="!w-auto !py-1" aria-label={`Role for ${s.name}`}>
            {Object.values(ROLES).filter((r) => r.id !== "owner").map((r) => <option key={r.id} value={r.id} disabled={!assignable.includes(r.id) && r.id !== s.roleId}>{r.name}</option>)}
          </ASelect>) : ROLES[s.roleId].name },
        { key: "s", header: "Status", cell: (s) => <Status value={s.status} /> },
        { key: "l", header: "Last active", cell: (s) => (s.lastActiveAt ? formatDate(s.lastActiveAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—") },
      ]} />

      <h2 className="mt-10 mb-4 font-serif text-[26px]">Permission matrix</h2>
      <div className="overflow-x-auto rounded-[3px] border border-line bg-white/70">
        <table className="w-full text-[12.5px]">
          <thead><tr className="border-b border-line text-left"><th className="px-4 py-3 font-normal text-charcoal/55">Area</th>{Object.values(ROLES).map((r) => <th key={r.id} className="px-3 py-3 font-medium">{r.name}</th>)}</tr></thead>
          <tbody>
            {RESOURCES.map((res) => (
              <tr key={res.id} className="border-b border-line/60 align-top last:border-0">
                <td className="px-4 py-3 font-medium">{res.label}</td>
                {Object.values(ROLES).map((r) => {
                  const acts = res.actions.filter((a) => r.permissions.includes(`${res.id}.${a}`));
                  return <td key={r.id} className="px-3 py-3">{acts.length === res.actions.length ? <span className="text-success">● Full</span> : acts.length ? <span className="text-charcoal/75">◐ {acts.join(", ")}</span> : <span className="text-charcoal/35">— None</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-[760px] text-[12px] text-charcoal/55">Phase 2 enforces this matrix server-side: every Server Action calls <code>requirePermission()</code>, and Supabase Row Level Security applies the same rules in the database. Hiding a control here is never the only protection.</p>

      <Modal open={invite} onClose={() => setInvite(false)} title="Invite staff" footer={<><AButton variant="outline" onClick={() => setInvite(false)}>Cancel</AButton><AButton disabled={!form.name || !/\S+@\S+/.test(form.email)} onClick={() => { inviteStaff(form); setInvite(false); setForm({ name: "", email: "", roleId: "staff" }); }}>Send invite</AButton></>}>
        <AInput label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <AInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <ASelect label="Role" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value as RoleId })}>{assignable.map((r) => <option key={r} value={r}>{ROLES[r].name}</option>)}</ASelect>
        <p className="text-[12px] text-charcoal/55">{ROLES[form.roleId]?.description}</p>
      </Modal>
    </>
  );
}

/* ───────────── Audit log ───────────── */

export function AuditLogView() {
  const { audit, can } = useAdmin();
  if (!can("team.view")) return <NoAccess perm="team.view" />;
  return (
    <>
      <PageHeader title="Audit log" description="An append-only record of administrative actions. Entries cannot be edited or deleted." />
      <DataTable rows={audit} getId={(a) => a.id} pageSize={20} search={(a) => `${a.summary} ${a.actorName} ${a.action}`} columns={[
        { key: "t", header: "When", sort: (a) => a.at, cell: (a) => <span className="whitespace-nowrap">{formatDate(a.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> },
        { key: "a", header: "Who", sort: (a) => a.actorName, cell: (a) => a.actorName },
        { key: "s", header: "What", cell: (a) => <div><p>{a.summary}</p><p className="font-mono text-[11px] text-charcoal/45">{a.action}{a.resourceId ? ` · ${a.resourceId}` : ""}</p></div> },
        { key: "r", header: "Area", sort: (a) => a.resource, cell: (a) => <span className="rounded-full bg-beige px-2 py-0.5 text-[11px] capitalize">{a.resource}</span> },
        { key: "c", header: "Changes", cell: (a) => a.changes ? <ul className="space-y-0.5 text-[11.5px]">{Object.entries(a.changes).slice(0, 3).map(([k, v]) => <li key={k}><span className="text-charcoal/50">{k}:</span> <s className="text-charcoal/45">{short(v.from)}</s> → {short(v.to)}</li>)}</ul> : <span className="text-charcoal/35">—</span> },
      ]} />
    </>
  );
}
const short = (v: unknown) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s.length > 40 ? s.slice(0, 40) + "…" : s; };

/* ───────────── Settings ───────────── */

export function SettingsView() {
  const { settings, shipping, markets, taxRules, saveSettings, can } = useAdmin();
  const [tab, setTab] = useState<"general" | "markets" | "payments" | "tax">("general");
  const [s, setS] = useState<StoreSettings>(settings);
  const [ship, setShip] = useState<ShippingMethod[]>(shipping);
  if (!can("settings.view")) return <NoAccess perm="settings.view" />;
  const editable = can("settings.update");
  const dirty = JSON.stringify(s) !== JSON.stringify(settings) || JSON.stringify(ship) !== JSON.stringify(shipping);
  return (
    <>
      <PageHeader title="Settings" description="Store details, markets, shipping, payments and tax." actions={<AButton disabled={!editable || !dirty} onClick={() => saveSettings(s, ship)}>Save settings</AButton>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "general", label: "General" }, { id: "markets", label: "Markets & shipping" }, { id: "payments", label: "Payments" }, { id: "tax", label: "Tax & duties" }]} />
      <fieldset disabled={!editable}>
        {tab === "general" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Store details"><div className="grid gap-3">
              <AInput label="Store name" value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} />
              <AInput label="Legal name" value={s.legalName} onChange={(e) => setS({ ...s, legalName: e.target.value })} />
              <div className="grid grid-cols-2 gap-3"><AInput label="Support email" value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} /><AInput label="Support phone" value={s.supportPhone} onChange={(e) => setS({ ...s, supportPhone: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3"><AInput label="Order number prefix" value={s.orderNumberPrefix} onChange={(e) => setS({ ...s, orderNumberPrefix: e.target.value })} /><AInput label="Low-stock threshold" type="number" value={s.lowStockThreshold} onChange={(e) => setS({ ...s, lowStockThreshold: Number(e.target.value) })} /></div>
            </div></Card>
            <Card title="Currencies">
              <ASelect label="Default market" value={s.defaultMarketId} onChange={(e) => setS({ ...s, defaultMarketId: e.target.value })}>{markets.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.currency})</option>)}</ASelect>
              <p className="mt-5 mb-2 text-[11.5px] text-charcoal/65">Fallback exchange rates (per Rs 1) — used only when a product has no explicit price</p>
              <div className="grid grid-cols-3 gap-3">{CURRENCIES.filter((c) => c !== "PKR").map((c) => <AInput key={c} label={c} type="number" step="0.0001" value={s.exchangeRates[c]} onChange={(e) => setS({ ...s, exchangeRates: { ...s.exchangeRates, [c]: Number(e.target.value) } })} />)}</div>
            </Card>
          </div>
        )}
        {tab === "markets" && (
          <div className="space-y-6">
            {markets.map((m) => (
              <Card key={m.id} title={`${m.name} · ${m.currency}`} actions={<span className="text-[11.5px] text-charcoal/50">{m.countries.join(", ")}</span>} padded={false}>
                <table className="w-full text-[13px]"><thead><tr className="border-b border-line text-left text-[10.5px] tracking-[0.14em] text-charcoal/55 uppercase"><th className="px-5 py-2 font-normal">Method</th><th className="font-normal">Delivery</th><th className="font-normal">Rate ({m.currency})</th><th className="font-normal">Free over</th><th className="pr-5 font-normal">Active</th></tr></thead>
                  <tbody>{ship.filter((x) => x.marketId === m.id).map((x) => (
                    <tr key={x.id} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-2.5"><p className="font-medium">{x.label}</p><p className="text-[11.5px] text-charcoal/50">{x.zone} · {x.description}</p></td>
                      <td>{x.estimatedDays[0]}–{x.estimatedDays[1]} days</td>
                      <td><input aria-label={`${x.label} rate`} type="number" className="w-24 rounded-[3px] border border-line bg-white px-2 py-1" value={x.rate / 100} onChange={(e) => setShip(ship.map((y) => (y.id === x.id ? { ...y, rate: Math.round(Number(e.target.value) * 100) } : y)))} /></td>
                      <td><input aria-label={`${x.label} free threshold`} type="number" placeholder="Never" className="w-24 rounded-[3px] border border-line bg-white px-2 py-1" value={x.freeOver === null ? "" : x.freeOver / 100} onChange={(e) => setShip(ship.map((y) => (y.id === x.id ? { ...y, freeOver: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) } : y)))} /></td>
                      <td className="pr-5"><Toggle checked={x.active} onChange={(v) => setShip(ship.map((y) => (y.id === x.id ? { ...y, active: v } : y)))} label={`${x.label} active`} /></td>
                    </tr>
                  ))}</tbody></table>
                <p className="border-t border-line px-5 py-2.5 text-[12px] text-charcoal/55">Payment methods: {m.paymentMethodIds.map((p) => PAYMENT_METHODS[p]?.label).join(", ")} · Example: free delivery threshold {ship.find((x) => x.marketId === m.id && x.freeOver)?.freeOver ? formatMoney(ship.find((x) => x.marketId === m.id && x.freeOver)!.freeOver!, m.currency) : "none"}</p>
              </Card>
            ))}
          </div>
        )}
        {tab === "payments" && (
          <Card title="Payment providers" padded={false}>
            <ul>{s.payments.map((p) => (
              <li key={p.id} className="grid items-center gap-4 border-b border-line/60 px-5 py-4 last:border-0 md:grid-cols-[1.2fr_1.6fr_auto_auto]">
                <div><p className="font-medium">{p.displayName}</p><p className="text-[12px] text-charcoal/55">{PAYMENT_METHODS[p.id]?.kind === "cod" ? "Offline · courier collects cash" : "Online · provider adapter configured on the server"}</p></div>
                <div className="flex flex-wrap gap-1.5">{markets.map((m) => {
                  const on = p.marketIds.includes(m.id); const supported = PAYMENT_METHODS[p.id]?.currencies.includes(m.currency);
                  return <button key={m.id} type="button" disabled={!supported} aria-pressed={on} onClick={() => setS({ ...s, payments: s.payments.map((x) => (x.id === p.id ? { ...x, marketIds: on ? x.marketIds.filter((y) => y !== m.id) : [...x.marketIds, m.id] } : x)) })} className={`rounded-full border px-2.5 py-0.5 text-[11.5px] disabled:opacity-30 ${on ? "border-charcoal bg-charcoal text-ivory" : "border-line bg-white"}`}>{m.name}</button>;
                })}</div>
                <Status value={p.mode} label={p.mode === "live" ? "Live" : "Test mode"} />
                <Toggle checked={p.enabled} onChange={(v) => setS({ ...s, payments: s.payments.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)) })} label={`${p.displayName} enabled`} />
              </li>
            ))}</ul>
            <p className="border-t border-line px-5 py-3 text-[12px] text-charcoal/55">API keys and webhook secrets are never stored here — they live in server environment variables. Orders are marked paid only by verified provider webhooks.</p>
          </Card>
        )}
        {tab === "tax" && (
          <DataTable rows={taxRules} getId={(t) => t.id} columns={[
            { key: "c", header: "Country", cell: (t) => (t.countryCode === "*" ? "All other countries" : t.countryCode) },
            { key: "l", header: "Tax", cell: (t) => t.label },
            { key: "r", header: "Rate", cell: (t) => `${Math.round(t.rate * 100)}%` },
            { key: "i", header: "Pricing", cell: (t) => (t.inclusive ? <Status value="active" label="Included in price" /> : t.dutiesCollectedOnDelivery ? <Status value="pending" label="Duties on delivery" /> : <Status value="shipped" label="Added at checkout" />) },
          ]} />
        )}
      </fieldset>
    </>
  );
}
