import { notFound } from "next/navigation";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { ActionButton, AdminForm, Check, Field, SelectField, TextareaField } from "@/components/admin/client";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { deleteCollectionAction, saveCollectionAction } from "../../../_actions/catalog";

export const metadata = { title: "Collection" };
const toLocal = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 16) : "");

export default async function CollectionPage(props: PageProps<"/admin/collections/[id]">) {
  const { staff, allowed } = await staffPage("categories.view");
  if (!allowed) return <NoAccess permission="categories.view" />;
  const { id } = await props.params;
  const isNew = id === "new";
  const [c] = isNew ? [undefined] : await db.select().from(s.collections).where(eq(s.collections.id, id));
  if (!isNew && !c) notFound();
  const [products, members, media] = await Promise.all([
    db.select({ id: s.products.id, name: s.products.name, status: s.products.status }).from(s.products).where(isNull(s.products.deletedAt)).orderBy(asc(s.products.name)),
    isNew ? [] : db.select().from(s.productCollections).where(eq(s.productCollections.collectionId, id)),
    db.select({ id: s.mediaAssets.id, alt: s.mediaAssets.alt, filename: s.mediaAssets.filename }).from(s.mediaAssets).where(isNull(s.mediaAssets.deletedAt)).orderBy(desc(s.mediaAssets.createdAt)).limit(300),
  ]);
  const can = staffCan(staff, "categories.manage");
  return (
    <>
      <PageHeader title={c?.name ?? "New collection"} back={{ href: "/admin/collections", label: "Collections" }} />
      <Card>
        <AdminForm action={saveCollectionAction} submit="Save collection" footer={can} className="md:grid-cols-2">
          {c && <input type="hidden" name="id" value={c.id} />}
          <Field label="Name" name="name" defaultValue={c?.name} required />
          <Field label="Slug" name="slug" defaultValue={c?.slug} />
          <Field label="Eyebrow" name="eyebrow" defaultValue={c?.eyebrow} placeholder="The new season" />
          <Field label="Headline (wrap words in *asterisks* for italics)" name="headline" defaultValue={c?.headline} />
          <TextareaField label="Description" name="description" defaultValue={c?.description} className="md:col-span-2" rows={3} />
          <SelectField label="Hero image" name="heroId" defaultValue={c?.heroId ?? ""}><option value="">None</option>{media.map((m) => <option key={m.id} value={m.id}>{m.alt.slice(0, 70) || m.filename}</option>)}</SelectField>
          <SelectField label="Occasion page" name="occasion" defaultValue={c?.occasion ?? ""} hint="An occasion collection powers /workwear, /evening…"><option value="">None</option>{["workwear", "everyday", "evening", "festive"].map((o) => <option key={o} value={o}>{o}</option>)}</SelectField>
          <SelectField label="Status" name="status" defaultValue={c?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option></SelectField>
          <Field label="Display order" name="sortOrder" type="number" defaultValue={String(c?.sortOrder ?? 0)} />
          <Field label="Starts (optional)" name="startsAt" type="datetime-local" defaultValue={toLocal(c?.startsAt)} />
          <Field label="Ends (optional)" name="endsAt" type="datetime-local" defaultValue={toLocal(c?.endsAt)} />
          <div className="flex gap-6"><Check name="featured" label="Featured" defaultChecked={c?.featured} /><Check name="seasonal" label="Seasonal" defaultChecked={c?.seasonal} /></div>
          <Field label="SEO title" name="seoTitle" defaultValue={c?.seoTitle ?? ""} />
          <TextareaField label="SEO description" name="seoDescription" defaultValue={c?.seoDescription ?? ""} rows={2} className="md:col-span-2" />
          <fieldset className="md:col-span-2">
            <input type="hidden" name="productsSubmitted" value="1" />
            <legend className="mb-2 text-[11.5px] text-charcoal/65">Products in this collection</legend>
            <div className="grid max-h-80 gap-1 overflow-y-auto rounded-[3px] border border-line p-3 sm:grid-cols-2">
              {products.map((p) => <Check key={p.id} name="productIds" value={p.id} label={`${p.name}${p.status !== "active" ? ` (${p.status})` : ""}`} defaultChecked={members.some((m) => m.productId === p.id)} />)}
            </div>
          </fieldset>
        </AdminForm>
      </Card>
      {c && can && <div className="mt-6"><ActionButton action={deleteCollectionAction} fields={{ id: c.id }} label="Delete collection" variant="danger" confirm={`Delete ${c.name}? Products are not deleted.`} /></div>}
    </>
  );
}
