"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { formatMoney } from "@/lib/commerce/currency";
import { CURRENCIES, type Category, type Collection, type OccasionId, type Product } from "@/types";
import { useAdmin } from "../admin-context";
import { AButton, AInput, ALink, ASelect, ATextarea, Card, DataTable, Gate, Modal, NoAccess, PageHeader, Status, Tabs, Toggle, type Column } from "../ui";

const stockOf = (p: Product) => p.variants.reduce((a, v) => a + v.stock, 0);

/* ───────────── Products ───────────── */

export function ProductsView() {
  const { products, categories, can } = useAdmin();
  const [tab, setTab] = useState<"all" | "active" | "draft" | "archived">("all");
  if (!can("products.view")) return <NoAccess perm="products.view" />;
  const rows = tab === "all" ? products : products.filter((p) => p.status === tab);
  const cols: Column<Product>[] = [
    { key: "img", header: "", className: "w-14", cell: (p) => <EditorialImage image={p.colours[0].images[0]} className="h-14 w-11 rounded-[2px]" sizes="44px" /> },
    { key: "name", header: "Product", sort: (p) => p.name, cell: (p) => <div><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link><p className="text-[12px] text-charcoal/55">{p.subtitle}</p></div> },
    { key: "status", header: "Status", sort: (p) => p.status, cell: (p) => <Status value={p.status} /> },
    { key: "cat", header: "Category", sort: (p) => p.categoryId, cell: (p) => categories.find((c) => c.id === p.categoryId)?.name },
    { key: "stock", header: "Stock", sort: stockOf, cell: (p) => { const s = stockOf(p); return <span className={s < 20 ? "text-warning" : ""}>{s} in {p.variants.length} variants</span>; } },
    { key: "price", header: "Price", sort: (p) => p.prices.PKR, className: "text-right", cell: (p) => <div className="text-right"><p>{formatMoney(p.prices.PKR, "PKR")}</p><p className="text-[11.5px] text-charcoal/50">{formatMoney(p.prices.GBP, "GBP")} · {formatMoney(p.prices.USD, "USD")}</p></div> },
  ];
  return (
    <>
      <PageHeader title="Products" description={`${products.length} products across ${categories.length} categories`} actions={<Gate perm="products.create"><ALink href="/admin/products/new">Add product</ALink></Gate>} />
      <Tabs value={tab} onChange={setTab} tabs={(["all", "active", "draft", "archived"] as const).map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1), count: t === "all" ? products.length : products.filter((p) => p.status === t).length }))} />
      <DataTable rows={rows} columns={cols} getId={(p) => p.id} search={(p) => `${p.name} ${p.subtitle} ${p.variants.map((v) => v.sku).join(" ")}`} onRowHref={(p) => `/admin/products/${p.id}`} />
    </>
  );
}

const OCC: OccasionId[] = ["workwear", "everyday", "evening", "festive"];

export function ProductEditor({ id }: { id?: string }) {
  const { products, categories, collections, saveProduct, archiveProduct, can } = useAdmin();
  const router = useRouter();
  const existing = id ? products.find((p) => p.id === id) : undefined;
  const blank: Product = useMemo(() => ({
    id: `prd_new_${products.length + 1}`, slug: "", name: "", subtitle: "", description: "", categoryId: categories[0].id, collectionIds: [], occasionIds: [],
    prices: { PKR: 0, USD: 0, GBP: 0, EUR: 0 }, colours: [{ id: "c0", name: "Ivory", hex: "#F3EADB", images: [{ id: "c0-0", alt: "New product — photography to be uploaded" }] }],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"], variants: [], fabric: "", care: [], details: [], tags: [], isNew: true, status: "draft", createdAt: "2026-11-21T09:00:00.000Z",
  }), [products.length, categories]);
  const [p, setP] = useState<Product>(existing ?? blank);
  const [confirm, setConfirm] = useState(false);

  if (id && !existing) return <p>Product not found. <Link href="/admin/products" className="underline">Back to products</Link></p>;
  if (!can(id ? "products.view" : "products.create")) return <NoAccess perm={id ? "products.view" : "products.create"} />;
  const editable = can(id ? "products.update" : "products.create");
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const errors = [!p.name && "Name is required", !p.slug && "URL handle is required", CURRENCIES.some((c) => !p.prices[c]) && "Set a price in every currency"].filter(Boolean) as string[];

  const save = () => {
    if (errors.length) return;
    const variants = p.variants.length ? p.variants : p.colours.flatMap((c) => p.sizes.map((s) => ({ id: `${p.id}-${c.id}-${s}`, sku: `NS-NEW-${c.name.slice(0, 3).toUpperCase()}-${s}`, colourId: c.id, size: s, stock: 0 })));
    if (saveProduct({ ...p, variants }, !existing).ok && !existing) router.push("/admin/products");
  };

  return (
    <>
      <PageHeader title={existing ? p.name || "Untitled" : "Add product"} back={{ href: "/admin/products", label: "Products" }}
        actions={<>
          {existing && <Link href={`/products/${p.slug}`} target="_blank" className="self-center text-[12.5px] underline">View on store ↗</Link>}
          {existing && can("products.delete") && p.status !== "archived" && <AButton variant="danger" onClick={() => setConfirm(true)}>Archive</AButton>}
          <AButton onClick={save} disabled={!editable || errors.length > 0}>Save</AButton>
        </>} />
      {!editable && <p className="mb-4 rounded-[3px] bg-beige/70 px-4 py-2.5 text-[12.5px]">Read-only: your role can view but not edit products.</p>}
      <fieldset disabled={!editable} className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title="Details">
            <div className="grid gap-4">
              <AInput label="Name" value={p.name} onChange={(e) => setP((x) => ({ ...x, name: e.target.value, slug: existing ? x.slug : slugify(e.target.value) }))} />
              <AInput label="Subtitle" value={p.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Washed silk blouse" />
              <ATextarea label="Description" value={p.description} onChange={(e) => set("description", e.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <AInput label="Fabric" value={p.fabric} onChange={(e) => set("fabric", e.target.value)} />
                <AInput label="Fit note" value={p.fit ?? ""} onChange={(e) => set("fit", e.target.value)} />
              </div>
              <ATextarea label="Details (one per line)" value={p.details.join("\n")} onChange={(e) => set("details", e.target.value.split("\n"))} className="min-h-20" />
            </div>
          </Card>
          <Card title="Pricing by currency">
            <div className="grid gap-4 sm:grid-cols-4">
              {CURRENCIES.map((c) => <AInput key={c} label={c} type="number" min={0} value={p.prices[c] / 100 || ""} onChange={(e) => set("prices", { ...p.prices, [c]: Math.round(Number(e.target.value) * 100) })} />)}
            </div>
            <p className="mt-3 text-[12px] text-charcoal/55">Each market is priced explicitly. Exchange rates in Settings are used only as a fallback.</p>
          </Card>
          <Card title="Colours & media">
            <div className="flex flex-wrap gap-4">
              {p.colours.map((c) => (
                <div key={c.id} className="w-28">
                  <EditorialImage image={c.images[0]} className="aspect-[4/5] rounded-[2px]" sizes="112px" />
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px]"><span className="h-3 w-3 rounded-full border border-black/10" style={{ background: c.hex }} />{c.name}</p>
                  <p className="text-[11px] text-charcoal/50">{c.images.length} images</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-charcoal/55">Images are referenced from the media library. Current frames are licensed sample photography (see credits in Media); uploads to Supabase Storage arrive in Phase 2.</p>
          </Card>
          {existing && (
            <Card title="Variants" padded={false}>
              <table className="w-full text-[13px]"><thead><tr className="border-b border-line text-left text-[10.5px] tracking-[0.14em] text-charcoal/55 uppercase"><th className="px-5 py-2 font-normal">SKU</th><th className="font-normal">Colour</th><th className="font-normal">Size</th><th className="pr-5 text-right font-normal">Stock</th></tr></thead>
                <tbody>{p.variants.slice(0, 18).map((v) => <tr key={v.id} className="border-b border-line/60 last:border-0"><td className="px-5 py-2 font-mono text-[11.5px]">{v.sku}</td><td>{p.colours.find((c) => c.id === v.colourId)?.name}</td><td>{v.size}</td><td className="pr-5 text-right">{v.stock === 0 ? <Status value="out" label="Sold out" /> : v.stock}</td></tr>)}</tbody></table>
              {p.variants.length > 18 && <p className="px-5 py-3 text-[12px] text-charcoal/55">+{p.variants.length - 18} more — manage stock in <Link href="/admin/inventory" className="underline">Inventory</Link></p>}
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card title="Status">
            <ASelect value={p.status} onChange={(e) => set("status", e.target.value as Product["status"])}><option value="active">Active — visible on store</option><option value="draft">Draft — hidden</option><option value="archived">Archived</option></ASelect>
            <label className="mt-4 flex items-center justify-between text-[13px]">Mark as new arrival <Toggle checked={p.isNew} onChange={(v) => set("isNew", v)} label="New arrival" /></label>
          </Card>
          <Card title="Organisation">
            <div className="space-y-4">
              <ASelect label="Category" value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</ASelect>
              <div><p className="mb-1.5 text-[11.5px] text-charcoal/65">Occasions</p><div className="flex flex-wrap gap-2">{OCC.map((o) => <Chip key={o} on={p.occasionIds.includes(o)} onClick={() => set("occasionIds", p.occasionIds.includes(o) ? p.occasionIds.filter((x) => x !== o) : [...p.occasionIds, o])}>{o}</Chip>)}</div></div>
              <div><p className="mb-1.5 text-[11.5px] text-charcoal/65">Collections</p><div className="flex flex-wrap gap-2">{collections.filter((c) => !c.occasionId).map((c) => <Chip key={c.id} on={p.collectionIds.includes(c.id)} onClick={() => set("collectionIds", p.collectionIds.includes(c.id) ? p.collectionIds.filter((x) => x !== c.id) : [...p.collectionIds, c.id])}>{c.name}</Chip>)}</div></div>
            </div>
          </Card>
          <Card title="Search engine listing">
            <div className="space-y-3">
              <AInput label="URL handle" value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
              <AInput label="SEO title" value={p.seo?.title ?? ""} placeholder={`${p.name} — ${p.subtitle}`} onChange={(e) => set("seo", { ...p.seo, title: e.target.value })} />
              <ATextarea label="Meta description" value={p.seo?.description ?? ""} placeholder={p.description.slice(0, 150)} onChange={(e) => set("seo", { ...p.seo, description: e.target.value })} className="min-h-20" />
              <div className="rounded-[3px] bg-ivory p-3 text-[12.5px]"><p className="text-[#3b5266]">{p.seo?.title || `${p.name} — ${p.subtitle}`} | Nargis &amp; Shaz</p><p className="text-success">nargisandshaz.com/products/{p.slug}</p><p className="line-clamp-2 text-charcoal/60">{p.seo?.description || p.description}</p></div>
            </div>
          </Card>
          {errors.length > 0 && editable && <ul className="rounded-[3px] bg-[#f1dcd6] px-4 py-3 text-[12.5px] text-danger">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      </fieldset>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Archive product?" footer={<><AButton variant="outline" onClick={() => setConfirm(false)}>Cancel</AButton><AButton variant="danger" onClick={() => { archiveProduct(p.id); setConfirm(false); setP((x) => ({ ...x, status: "archived" })); }}>Archive</AButton></>}>
        <p className="text-[13.5px]">{p.name} will be hidden from the store. Orders and history are kept, and you can restore it at any time.</p>
      </Modal>
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-full border px-3 py-1 text-[12px] capitalize ${on ? "border-charcoal bg-charcoal text-ivory" : "border-line bg-white"}`}>{children}</button>;
}

/* ───────────── Categories ───────────── */

export function CategoriesView() {
  const { categories, products, saveCategory, can } = useAdmin();
  const [edit, setEdit] = useState<Category | null>(null);
  if (!can("products.view")) return <NoAccess perm="products.view" />;
  return (
    <>
      <PageHeader title="Categories" description="How products are grouped in navigation and filters." actions={<Gate perm="products.create"><AButton onClick={() => setEdit({ id: `cat-new-${categories.length}`, slug: "", name: "", description: "", sortOrder: categories.length + 1 })}>Add category</AButton></Gate>} />
      <DataTable rows={categories} getId={(c) => c.id} search={(c) => c.name} columns={[
        { key: "order", header: "#", className: "w-10", sort: (c) => c.sortOrder, cell: (c) => <span className="text-charcoal/50">{c.sortOrder}</span> },
        { key: "name", header: "Name", sort: (c) => c.name, cell: (c) => <div><p className="font-medium">{c.name}</p><p className="text-[12px] text-charcoal/55">/{c.slug}</p></div> },
        { key: "desc", header: "Description", cell: (c) => <span className="text-charcoal/70">{c.description}</span> },
        { key: "count", header: "Products", sort: (c) => products.filter((p) => p.categoryId === c.id).length, cell: (c) => products.filter((p) => p.categoryId === c.id).length },
        { key: "act", header: "", className: "text-right", cell: (c) => <Gate perm="products.update"><AButton variant="ghost" onClick={() => setEdit(c)}>Edit</AButton></Gate> },
      ]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name ? `Edit ${edit.name}` : "New category"} footer={<><AButton variant="outline" onClick={() => setEdit(null)}>Cancel</AButton><AButton disabled={!edit?.name} onClick={() => { if (edit) saveCategory({ ...edit, slug: edit.slug || edit.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }); setEdit(null); }}>Save</AButton></>}>
        {edit && <><AInput label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><AInput label="Handle" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /><ATextarea label="Description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /><AInput label="Sort order" type="number" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} /></>}
      </Modal>
    </>
  );
}

/* ───────────── Collections ───────────── */

export function CollectionsView() {
  const { collections, products, saveCollection, can } = useAdmin();
  const [edit, setEdit] = useState<Collection | null>(null);
  if (!can("content.view")) return <NoAccess perm="content.view" />;
  const count = (c: Collection) => products.filter((p) => (c.occasionId ? p.occasionIds.includes(c.occasionId) : p.collectionIds.includes(c.id))).length;
  return (
    <>
      <PageHeader title="Collections" description="Editorial collections and occasion landing pages." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {collections.map((c) => (
          <article key={c.id} className="overflow-hidden rounded-[3px] border border-line bg-white/70">
            <EditorialImage image={c.hero} className="aspect-[4/3]" sizes="300px" />
            <div className="p-4">
              <div className="mb-1 flex items-center justify-between"><p className="font-serif text-[20px]">{c.name}</p><Status value={c.status} /></div>
              <p className="text-[12px] text-charcoal/55">{c.occasionId ? `/${c.occasionId}` : `/collections/${c.slug}`} · {count(c)} products</p>
              <div className="mt-3 flex gap-2">
                <Gate perm="content.update"><AButton variant="outline" onClick={() => setEdit(c)}>Edit</AButton></Gate>
                <Link href={c.occasionId ? `/${c.occasionId}` : `/collections/${c.slug}`} target="_blank" className="self-center text-[12px] underline">View ↗</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${edit?.name ?? ""}`} footer={<><AButton variant="outline" onClick={() => setEdit(null)}>Cancel</AButton><AButton onClick={() => { if (edit) saveCollection(edit); setEdit(null); }}>Save</AButton></>}>
        {edit && <>
          <AInput label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <AInput label="Headline (wrap words in *asterisks* for italics)" value={edit.headline} onChange={(e) => setEdit({ ...edit, headline: e.target.value })} />
          <ATextarea label="Description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <AInput label="SEO title" value={edit.seo?.title ?? ""} onChange={(e) => setEdit({ ...edit, seo: { ...edit.seo, title: e.target.value } })} />
          <label className="flex items-center justify-between text-[13px]">Published <Toggle checked={edit.status === "published"} onChange={(v) => setEdit({ ...edit, status: v ? "published" : "draft" })} label="Published" /></label>
        </>}
      </Modal>
    </>
  );
}

/* ───────────── Inventory ───────────── */

export function InventoryView() {
  const { products, settings, adjustStock, can } = useAdmin();
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!can("inventory.view")) return <NoAccess perm="inventory.view" />;
  const rows = products.flatMap((p) => p.variants.map((v) => ({ p, v, colour: p.colours.find((c) => c.id === v.colourId)!.name })));
  const t = settings.lowStockThreshold;
  const view = rows.filter((r) => filter === "all" || (filter === "out" ? r.v.stock === 0 : r.v.stock > 0 && r.v.stock <= t));
  const editable = can("inventory.update");
  return (
    <>
      <PageHeader title="Inventory" description={`${rows.length} variants · low stock threshold ${t} units`} />
      <Tabs value={filter} onChange={setFilter} tabs={[{ id: "all", label: "All", count: rows.length }, { id: "low", label: "Low stock", count: rows.filter((r) => r.v.stock > 0 && r.v.stock <= t).length }, { id: "out", label: "Sold out", count: rows.filter((r) => r.v.stock === 0).length }]} />
      <DataTable rows={view} getId={(r) => r.v.id} pageSize={20} search={(r) => `${r.p.name} ${r.v.sku} ${r.colour}`} columns={[
        { key: "p", header: "Product", sort: (r) => r.p.name, cell: (r) => <div><p className="font-medium">{r.p.name}</p><p className="font-mono text-[11px] text-charcoal/50">{r.v.sku}</p></div> },
        { key: "c", header: "Colour", sort: (r) => r.colour, cell: (r) => r.colour },
        { key: "s", header: "Size", cell: (r) => r.v.size },
        { key: "st", header: "Status", sort: (r) => r.v.stock, cell: (r) => r.v.stock === 0 ? <Status value="out" label="Sold out" /> : r.v.stock <= t ? <Status value="low" label="Low" /> : <Status value="active" label="In stock" /> },
        { key: "q", header: "Available", className: "text-right", sort: (r) => r.v.stock, cell: (r) => editable ? (
          <form className="flex items-center justify-end gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(drafts[r.v.id]); if (!Number.isNaN(n) && drafts[r.v.id] !== undefined) { adjustStock(r.p.id, r.v.id, n); setDrafts((d) => { const x = { ...d }; delete x[r.v.id]; return x; }); } }}>
            <input aria-label={`Stock for ${r.v.sku}`} type="number" min={0} value={drafts[r.v.id] ?? r.v.stock} onChange={(e) => setDrafts((d) => ({ ...d, [r.v.id]: e.target.value }))} className="w-20 rounded-[3px] border border-line bg-white px-2 py-1 text-right" />
            {drafts[r.v.id] !== undefined && <AButton type="submit" className="!px-2.5 !py-1">Save</AButton>}
          </form>
        ) : <span>{r.v.stock}</span> },
      ]} />
    </>
  );
}
