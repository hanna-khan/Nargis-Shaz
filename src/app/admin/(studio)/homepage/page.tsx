import { asc, desc, isNull } from "drizzle-orm";
import { ActionButton, AdminForm, Check, Disclosure, Field, SelectField, TextareaField } from "@/components/admin/client";
import { ALink, Card, fmtDateTime, NoAccess, PageHeader, Status } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { hasUnpublishedChanges, listPublications, loadDraftSections, SECTION_TYPES, type SectionData } from "@/server/cms/homepage";
import { addSectionAction, itemOpAction, publishHomepageAction, saveItemAction, saveSectionAction, sectionOpAction } from "../../_actions/content";

export const metadata = { title: "Homepage" };

type Opt = { id: string; label: string };

function MediaSelect({ name, label, value, media }: { name: string; label: string; value: string | null; media: Opt[] }) {
  return <SelectField label={label} name={name} defaultValue={value ?? ""}><option value="">None</option>{media.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</SelectField>;
}

function SectionEditor({ sec, media, products, collections, canEdit }: { sec: SectionData; media: Opt[]; products: Opt[]; collections: Opt[]; canEdit: boolean }) {
  const t = sec.type;
  const hasImage = ["hero", "campaign", "story", "promo"].includes(t);
  const hasButtons = !["statement", "quote", "newsletter", "details", "category_cards", "collections"].includes(t);
  return (
    <div className="grid gap-5">
      <AdminForm action={saveSectionAction} submit="Save draft" footer={canEdit} className="md:grid-cols-2">
        <input type="hidden" name="id" value={sec.id} />
        <Field label="Admin name" name="name" defaultValue={sec.name} />
        <Check name="enabled" label="Show this section" defaultChecked={sec.enabled} />
        <Field label={t === "quote" ? "Attribution" : "Eyebrow"} name="eyebrow" defaultValue={sec.eyebrow} />
        {!["statement", "quote"].includes(t) && <Field label="Heading (*word* = italic)" name="heading" defaultValue={sec.heading} />}
        {!["category_cards", "details", "collections", "products"].includes(t) && <TextareaField label={t === "statement" || t === "quote" ? "Text (*word* = italic)" : "Body"} name="body" defaultValue={sec.body} className="md:col-span-2" rows={3} />}
        {hasButtons && (
          <>
            <Field label="Primary button label" name="primaryLabel" defaultValue={sec.primary?.label ?? ""} />
            <Field label="Primary button link" name="primaryHref" defaultValue={sec.primary?.href ?? ""} placeholder="/collections/…" />
            {t === "hero" && <><Field label="Secondary link label" name="secondaryLabel" defaultValue={sec.secondary?.label ?? ""} /><Field label="Secondary link" name="secondaryHref" defaultValue={sec.secondary?.href ?? ""} /></>}
          </>
        )}
        {hasImage && <MediaSelect name="imageId" label={t === "hero" ? "Desktop image (landscape)" : "Image"} value={sec.imageId} media={media} />}
        {t === "hero" && <MediaSelect name="mobileImageId" label="Mobile image (portrait)" value={sec.mobileImageId} media={media} />}
        {t === "products" && (
          <>
            <SelectField label="Products" name="source" defaultValue={sec.settings.source ?? "new"}>
              <option value="new">New arrivals</option><option value="bestsellers">Bestsellers (pinned, then by sales)</option><option value="featured">Featured products</option><option value="collection">A collection</option><option value="manual">Hand-picked</option>
            </SelectField>
            <SelectField label="Layout" name="layout" defaultValue={sec.settings.layout ?? "grid"}><option value="grid">Grid</option><option value="rail">Scrolling rail</option></SelectField>
            <Field label="Number of products" name="limit" type="number" min={1} max={24} defaultValue={String(sec.settings.limit ?? 8)} />
            <SelectField label="Collection (when source is a collection)" name="collectionId" defaultValue={String(sec.settings.collectionId ?? "")}><option value="">—</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</SelectField>
            <fieldset className="md:col-span-2"><legend className="mb-2 text-[11.5px] text-charcoal/65">Hand-picked products (in order of the list)</legend>
              <div className="grid max-h-48 gap-1 overflow-y-auto rounded-[3px] border border-line p-3 sm:grid-cols-2">{products.map((p) => <Check key={p.id} name="productIds" value={p.id} label={p.label} defaultChecked={(sec.settings.productIds ?? []).includes(p.id)} />)}</div>
            </fieldset>
          </>
        )}
      </AdminForm>

      {SECTION_TYPES[t].items && (
        <div className="rounded-[3px] border border-line p-4">
          <p className="mb-3 text-[11px] tracking-[0.16em] text-charcoal/60 uppercase">{t === "collections" ? "Collections shown" : t === "category_cards" ? "Cards" : "Images & tiles"}</p>
          <ul className="grid gap-3">
            {sec.items.map((it, i) => (
              <li key={it.id} className="rounded-[3px] bg-beige/40 p-3">
                <AdminForm action={saveItemAction} submit="Save item" footer={canEdit} className="sm:grid-cols-2">
                  <input type="hidden" name="sectionId" value={sec.id} /><input type="hidden" name="id" value={it.id} />
                  {t === "collections" ? (
                    <SelectField label="Collection" name="collectionId" defaultValue={it.collectionId ?? ""}>{collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</SelectField>
                  ) : (
                    <>
                      <MediaSelect name="imageId" label="Image" value={it.imageId} media={media} />
                      {t !== "campaign" && t !== "editorial" && <Field label="Title" name="title" defaultValue={it.title} />}
                      {t === "category_cards" && <Field label="Link" name="href" defaultValue={it.href ?? ""} />}
                      {t === "details" && <TextareaField label="Text" name="body" defaultValue={it.body} rows={2} />}
                    </>
                  )}
                </AdminForm>
                {canEdit && <div className="mt-2 flex gap-1">
                  {i > 0 && <ActionButton action={itemOpAction} fields={{ id: it.id, sectionId: sec.id, op: "up" }} label="↑" variant="ghost" />}
                  {i < sec.items.length - 1 && <ActionButton action={itemOpAction} fields={{ id: it.id, sectionId: sec.id, op: "down" }} label="↓" variant="ghost" />}
                  <ActionButton action={itemOpAction} fields={{ id: it.id, sectionId: sec.id, op: "delete" }} label="Remove" variant="ghost" confirm="Remove this item from the draft?" />
                </div>}
              </li>
            ))}
          </ul>
          {canEdit && <div className="mt-3"><Disclosure label="Add item">
            <AdminForm action={saveItemAction} submit="Add item" resetOnSuccess className="sm:grid-cols-2">
              <input type="hidden" name="sectionId" value={sec.id} />
              {t === "collections" ? <SelectField label="Collection" name="collectionId">{collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</SelectField> : (
                <>
                  <MediaSelect name="imageId" label="Image" value={null} media={media} />
                  {t !== "campaign" && t !== "editorial" && <Field label="Title" name="title" />}
                  {t === "category_cards" && <Field label="Link" name="href" placeholder="/shop/dresses" />}
                  {t === "details" && <TextareaField label="Text" name="body" rows={2} />}
                </>
              )}
            </AdminForm>
          </Disclosure></div>}
        </div>
      )}
    </div>
  );
}

export default async function HomepageCmsPage() {
  const { staff, allowed } = await staffPage("content.view");
  if (!allowed) return <NoAccess permission="content.view" />;
  const [sections, dirty, pubs, mediaRows, productRows, collectionRows, staffRows] = await Promise.all([
    loadDraftSections(), hasUnpublishedChanges(), listPublications(5),
    db.select({ id: s.mediaAssets.id, alt: s.mediaAssets.alt, filename: s.mediaAssets.filename, folder: s.mediaAssets.folder }).from(s.mediaAssets).where(isNull(s.mediaAssets.deletedAt)).orderBy(desc(s.mediaAssets.createdAt)).limit(400),
    db.select({ id: s.products.id, name: s.products.name }).from(s.products).where(isNull(s.products.deletedAt)).orderBy(asc(s.products.name)),
    db.select({ id: s.collections.id, name: s.collections.name }).from(s.collections).orderBy(asc(s.collections.sortOrder)),
    db.select({ id: s.staffUsers.id, name: s.staffUsers.name }).from(s.staffUsers),
  ]);
  const media = mediaRows.map((m) => ({ id: m.id, label: `${m.folder} · ${(m.alt || m.filename).slice(0, 70)}` }));
  const products = productRows.map((p) => ({ id: p.id, label: p.name }));
  const collections = collectionRows.map((c) => ({ id: c.id, label: c.name }));
  const canEdit = staffCan(staff, "content.edit");

  return (
    <>
      <PageHeader title="Homepage" description="Edit the draft below, preview it with the real storefront, then publish. The live homepage only changes when you publish."
        actions={<>
          <ALink href="/admin/preview/homepage" variant="outline">Preview draft ↗</ALink>
          {staffCan(staff, "content.publish") && <ActionButton action={publishHomepageAction} fields={{}} label={dirty ? "Publish changes" : "Publish"} variant="solid" confirm="Publish the draft to the live homepage?" />}
        </>} />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-[13px]">
        {dirty ? <Status value="draft" label="Unpublished changes" /> : <Status value="published" label="Draft matches the live homepage" />}
        {pubs[0] && <span className="text-charcoal/60">Last published {fmtDateTime(pubs[0].publishedAt)}{pubs[0].publishedBy ? ` by ${staffRows.find((x) => x.id === pubs[0].publishedBy)?.name ?? "staff"}` : ""}</span>}
        <span className="text-charcoal/60">Announcement bar and footer are in <a href="/admin/settings#storefront" className="underline">Settings</a>.</span>
      </div>
      <div className="grid gap-4">
        {sections.map((sec, i) => (
          <Card key={sec.id}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[12px] text-charcoal/45">{i + 1}</span>
              <p className="font-serif text-[19px]">{sec.name}</p>
              <span className="text-[12px] text-charcoal/55">{SECTION_TYPES[sec.type]?.label}</span>
              <Status value={sec.enabled ? "active" : "inactive"} label={sec.enabled ? "Shown" : "Hidden"} />
              {canEdit && (
                <div className="ml-auto flex gap-1">
                  {i > 0 && <ActionButton action={sectionOpAction} fields={{ id: sec.id, op: "up" }} label="↑ Up" variant="ghost" />}
                  {i < sections.length - 1 && <ActionButton action={sectionOpAction} fields={{ id: sec.id, op: "down" }} label="↓ Down" variant="ghost" />}
                  <ActionButton action={sectionOpAction} fields={{ id: sec.id, op: "toggle" }} label={sec.enabled ? "Hide" : "Show"} variant="ghost" />
                  <ActionButton action={sectionOpAction} fields={{ id: sec.id, op: "delete" }} label="Delete" variant="ghost" confirm={`Delete “${sec.name}” from the draft?`} />
                </div>
              )}
            </div>
            <p className="mt-1 text-[12px] text-charcoal/50">{SECTION_TYPES[sec.type]?.help}</p>
            <div className="mt-3"><Disclosure label="Edit section"><SectionEditor sec={sec} media={media} products={products} collections={collections} canEdit={canEdit} /></Disclosure></div>
          </Card>
        ))}
      </div>
      {canEdit && (
        <Card title="Add a section" className="mt-6">
          <AdminForm action={addSectionAction} submit="Add section" resetOnSuccess className="sm:grid-cols-2">
            <SelectField label="Type" name="type">{Object.entries(SECTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</SelectField>
            <Field label="Admin name (optional)" name="name" />
          </AdminForm>
        </Card>
      )}
    </>
  );
}
