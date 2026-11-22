import { asc } from "drizzle-orm";
import { Check, Field, SelectField, TextareaField } from "@/components/admin/client";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";

type P = Partial<typeof s.products.$inferSelect> & { extraCategoryIds?: string[]; collectionIds?: string[] };

const toLocal = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 16) : "");

/** Product details fields shared by "new product" and "edit product". */
export async function ProductFields({ p, showStatus = true }: { p: P; showStatus?: boolean }) {
  const [categories, collections, guides] = await Promise.all([
    db.select().from(s.categories).orderBy(asc(s.categories.sortOrder)),
    db.select().from(s.collections).orderBy(asc(s.collections.sortOrder)),
    db.select({ id: s.sizeGuides.id, name: s.sizeGuides.name }).from(s.sizeGuides),
  ]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name" name="name" defaultValue={p.name} required />
      <Field label="Subtitle" name="subtitle" defaultValue={p.subtitle} placeholder="Oversized cotton poplin shirt" />
      <Field label="URL slug" name="slug" defaultValue={p.slug} hint="Leave empty to generate from the name." />
      <Field label="Product SKU" name="sku" defaultValue={p.sku} required hint="Variant SKUs are generated from this." />
      <TextareaField label="Short description" name="shortDescription" defaultValue={p.shortDescription} className="md:col-span-2" rows={2} />
      <TextareaField label="Description" name="description" defaultValue={p.description} className="md:col-span-2" rows={5} required />
      <SelectField label="Main category" name="categoryId" defaultValue={p.categoryId ?? ""}>
        <option value="">—</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.parentId ? "— " : ""}{c.name}</option>)}
      </SelectField>
      <SelectField label="Size guide" name="sizeGuideId" defaultValue={p.sizeGuideId ?? ""}>
        <option value="">None</option>
        {guides.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </SelectField>
      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-[11.5px] text-charcoal/65">Also show in categories</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">{categories.map((c) => <Check key={c.id} name="extraCategoryIds" value={c.id} label={c.name} defaultChecked={p.extraCategoryIds?.includes(c.id)} />)}</div>
      </fieldset>
      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-[11.5px] text-charcoal/65">Collections</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">{collections.map((c) => <Check key={c.id} name="collectionIds" value={c.id} label={`${c.name}${c.status === "draft" ? " (draft)" : ""}`} defaultChecked={p.collectionIds?.includes(c.id)} />)}</div>
      </fieldset>
      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-[11.5px] text-charcoal/65">Occasions</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">{["workwear", "everyday", "evening", "festive"].map((o) => <Check key={o} name="occasions" value={o} label={o[0].toUpperCase() + o.slice(1)} defaultChecked={(p.occasions ?? []).includes(o)} />)}</div>
      </fieldset>
      <Field label="Fabric & composition" name="fabric" defaultValue={p.fabric} className="md:col-span-2" />
      <TextareaField label="Details (one per line)" name="details" defaultValue={(p.details ?? []).join("\n")} rows={4} />
      <TextareaField label="Care instructions (one per line)" name="care" defaultValue={(p.care ?? []).join("\n")} rows={4} />
      <Field label="Fit note" name="fit" defaultValue={p.fit ?? ""} />
      <Field label="Tags (comma separated)" name="tags" defaultValue={(p.tags ?? []).join(", ")} hint="Use “made-to-order” for atelier pieces." />
      {showStatus && (
        <>
          <SelectField label="Status" name="status" defaultValue={p.status ?? "draft"} hint="Active products need a price, an active variant and an image.">
            <option value="draft">Draft (hidden)</option><option value="active">Active (published)</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option>
          </SelectField>
          <Field label="Publish at (Pakistan time)" name="publishAt" type="datetime-local" defaultValue={toLocal(p.publishAt)} hint="Used when status is Scheduled." />
          <div className="flex flex-wrap gap-6 md:col-span-2">
            <Check name="isNew" label="New arrival" defaultChecked={p.isNew} />
            <Check name="isFeatured" label="Featured" defaultChecked={p.isFeatured} />
            <Check name="isBestseller" label="Pin as bestseller" defaultChecked={p.isBestseller} />
          </div>
          <Field label="Sort order" name="sortOrder" type="number" defaultValue={String(p.sortOrder ?? 0)} />
        </>
      )}
      <Field label="SEO title" name="seoTitle" defaultValue={p.seoTitle ?? ""} maxLength={160} />
      <TextareaField label="SEO description" name="seoDescription" defaultValue={p.seoDescription ?? ""} maxLength={320} rows={2} className="md:col-span-2" />
    </div>
  );
}
