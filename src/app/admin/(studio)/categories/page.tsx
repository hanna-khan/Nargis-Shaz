import { asc, desc, isNull, sql } from "drizzle-orm";
import { ActionButton, AdminForm, Check, Disclosure, Field, SelectField, TextareaField } from "@/components/admin/client";
import { Card, NoAccess, PageHeader, Status } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { deleteCategoryAction, saveCategoryAction } from "../../_actions/catalog";

export const metadata = { title: "Categories" };

type Cat = typeof s.categories.$inferSelect;
type Media = { id: string; alt: string; filename: string };

function CategoryForm({ c, categories, media }: { c?: Cat; categories: Cat[]; media: Media[] }) {
  const pick = (name: string, value: string | null | undefined, label: string) => (
    <SelectField label={label} name={name} defaultValue={value ?? ""}><option value="">None</option>{media.map((m) => <option key={m.id} value={m.id}>{m.alt.slice(0, 70) || m.filename}</option>)}</SelectField>
  );
  return (
    <AdminForm action={saveCategoryAction} submit={c ? "Save category" : "Create category"} resetOnSuccess={!c} className="md:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Name" name="name" defaultValue={c?.name} required />
      <Field label="Slug" name="slug" defaultValue={c?.slug} hint="URL: /shop/<slug>" />
      <SelectField label="Parent category" name="parentId" defaultValue={c?.parentId ?? ""}><option value="">Top level</option>{categories.filter((x) => !x.parentId && x.id !== c?.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField>
      <Field label="Display order" name="sortOrder" type="number" defaultValue={String(c?.sortOrder ?? 0)} />
      <TextareaField label="Description" name="description" defaultValue={c?.description} className="md:col-span-2" rows={2} />
      {pick("imageId", c?.imageId, "Menu & card image")}
      {pick("bannerId", c?.bannerId, "Banner image")}
      <Field label="SEO title" name="seoTitle" defaultValue={c?.seoTitle ?? ""} />
      <Field label="SEO description" name="seoDescription" defaultValue={c?.seoDescription ?? ""} />
      <Check name="active" label="Active (shown in the shop)" defaultChecked={c?.active ?? true} />
    </AdminForm>
  );
}

export default async function CategoriesPage() {
  const { staff, allowed } = await staffPage("categories.view");
  if (!allowed) return <NoAccess permission="categories.view" />;
  const [categories, counts, media] = await Promise.all([
    db.select().from(s.categories).orderBy(asc(s.categories.sortOrder), asc(s.categories.name)),
    db.select({ id: s.products.categoryId, n: sql<number>`COUNT(*)` }).from(s.products).where(isNull(s.products.deletedAt)).groupBy(s.products.categoryId),
    db.select({ id: s.mediaAssets.id, alt: s.mediaAssets.alt, filename: s.mediaAssets.filename }).from(s.mediaAssets).where(isNull(s.mediaAssets.deletedAt)).orderBy(desc(s.mediaAssets.createdAt)).limit(300),
  ]);
  const can = staffCan(staff, "categories.manage");
  const ordered = categories.filter((c) => !c.parentId).flatMap((p) => [p, ...categories.filter((c) => c.parentId === p.id)]);
  return (
    <>
      <PageHeader title="Categories" description="Empty or inactive categories are never shown in the shop navigation." />
      {can && <Card title="New category" className="mb-6"><CategoryForm categories={categories} media={media} /></Card>}
      <div className="grid gap-3">
        {ordered.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={c.parentId ? "pl-6 text-[14px]" : "font-serif text-[20px]"}>{c.parentId ? "↳ " : ""}{c.name}</p>
              <Status value={c.active ? "active" : "inactive"} />
              <span className="text-[12px] text-charcoal/55">/shop/{c.slug} · {Number(counts.find((x) => x.id === c.id)?.n ?? 0)} products</span>
              {can && <div className="ml-auto"><ActionButton action={deleteCategoryAction} fields={{ id: c.id }} label="Delete" variant="ghost" confirm={`Delete ${c.name}?`} /></div>}
            </div>
            {can && <div className="mt-3"><Disclosure label="Edit"><CategoryForm c={c} categories={categories} media={media} /></Disclosure></div>}
          </Card>
        ))}
      </div>
    </>
  );
}
