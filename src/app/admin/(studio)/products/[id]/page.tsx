import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { ActionButton, AdminForm, Check, Disclosure, Field, SelectField } from "@/components/admin/client";
import { ALink, Card, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { CURRENCIES } from "@/types";
import {
  addVariantsAction, attachLibraryImageAction, deleteProductAction, duplicateProductAction, imageAction, pricesAction, relatedAction, removeVariantAction,
  updateProductAction, updateVariantsAction, uploadImagesAction,
} from "../../../_actions/catalog";
import { ProductFields } from "../fields";

export const metadata = { title: "Edit product" };
const major = (n: number | null | undefined) => (n ? (n / 100).toFixed(2).replace(/\.00$/, "") : "");

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { staff, allowed } = await staffPage("products.view");
  if (!allowed) return <NoAccess permission="products.view" />;
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id));
  if (!p) notFound();
  const [prices, variants, images, cats, cols, related, allProducts, attrs] = await Promise.all([
    db.select().from(s.productPrices).where(eq(s.productPrices.productId, id)),
    db.select({ v: s.productVariants, inv: s.inventory }).from(s.productVariants).leftJoin(s.inventory, eq(s.inventory.variantId, s.productVariants.id)).where(eq(s.productVariants.productId, id)).orderBy(asc(s.productVariants.sortOrder)),
    db.select({ pi: s.productImages, m: s.mediaAssets }).from(s.productImages).innerJoin(s.mediaAssets, eq(s.mediaAssets.id, s.productImages.mediaId)).where(eq(s.productImages.productId, id)).orderBy(asc(s.productImages.sortOrder)),
    db.select().from(s.productCategories).where(eq(s.productCategories.productId, id)),
    db.select().from(s.productCollections).where(eq(s.productCollections.productId, id)),
    db.select().from(s.relatedProducts).where(eq(s.relatedProducts.productId, id)),
    db.select({ id: s.products.id, name: s.products.name, status: s.products.status }).from(s.products).where(and(ne(s.products.id, id), isNull(s.products.deletedAt))).orderBy(asc(s.products.name)),
    db.select().from(s.productAttributeValues).orderBy(asc(s.productAttributeValues.sortOrder)),
  ]);
  const vids = variants.map((x) => x.v.id);
  const [vprices, library] = await Promise.all([
    vids.length ? db.select().from(s.variantPrices).where(inArray(s.variantPrices.variantId, vids)) : [],
    db.select({ id: s.mediaAssets.id, filename: s.mediaAssets.filename, alt: s.mediaAssets.alt, folder: s.mediaAssets.folder }).from(s.mediaAssets).where(isNull(s.mediaAssets.deletedAt)).orderBy(desc(s.mediaAssets.createdAt)).limit(300),
  ]);
  const attr = (vid: string | null) => attrs.find((a) => a.id === vid);
  const colours = [...new Map(variants.map((x) => [x.v.colourValueId, attr(x.v.colourValueId)])).values()].filter((x) => !!x);
  const sizes = attrs.filter((a) => a.attributeId === "attr-size");
  const canEdit = staffCan(staff, "products.update");
  const canPrice = staffCan(staff, "products.price");

  return (
    <>
      <PageHeader title={p.name} back={{ href: "/admin/products", label: "Products" }} description={<>{p.sku} · <Status value={p.status} /> {p.status === "active" && <Link href={`/products/${p.slug}`} target="_blank" className="ml-2 underline">View in shop ↗</Link>}</>}
        actions={<>
          {staffCan(staff, "products.create") && <ActionButton action={duplicateProductAction as never} fields={{ id }} label="Duplicate" />}
          {staffCan(staff, "inventory.view") && <ALink href={`/admin/inventory?q=${encodeURIComponent(p.sku)}`} variant="outline">Stock</ALink>}
        </>} />
      {(sp.created || sp.duplicated) && <p role="status" className="mb-4 rounded-[3px] bg-[#e3eadc] px-3.5 py-2.5 text-[13px] text-success">{sp.created ? "Draft created. Add colours, sizes and images, then publish." : "Copy created as a draft with zero stock."}</p>}

      <div className="grid gap-6">
        <Card title="Details, status & SEO">
          <AdminForm action={updateProductAction} submit="Save product" footer={canEdit}>
            <input type="hidden" name="id" value={id} />
            <ProductFields p={{ ...p, extraCategoryIds: cats.map((c) => c.categoryId), collectionIds: cols.map((c) => c.collectionId) }} />
          </AdminForm>
        </Card>

        <Card title="Prices">
          <AdminForm action={pricesAction} submit="Save prices" footer={canPrice}>
            <input type="hidden" name="id" value={id} />
            <p className="text-[12px] text-charcoal/55">Enter major units. “Was” prices show the item as reduced. Each market sells in its own currency; set every currency you sell in.</p>
            <div className="grid gap-4 sm:grid-cols-4">
              {CURRENCIES.map((c) => {
                const pr = prices.find((x) => x.currency === c);
                return <div key={c} className="grid gap-2"><Field label={`${c} price`} name={`price_${c}`} defaultValue={major(pr?.price)} inputMode="decimal" disabled={!canPrice} /><Field label={`${c} was`} name={`compare_${c}`} defaultValue={major(pr?.compareAtPrice)} inputMode="decimal" disabled={!canPrice} /></div>;
              })}
            </div>
          </AdminForm>
        </Card>

        <Card title={`Variants (${variants.length})`}>
          {variants.length > 0 && (
            <AdminForm action={updateVariantsAction} submit="Save variants" footer={canEdit}>
              <input type="hidden" name="id" value={id} />
              <Table head={["Colour", "Size", "SKU", "Stock", ...(canPrice ? ["Cost (PKR)", "Price override (PKR / USD / GBP / EUR)"] : []), "Active", ""]}>
                {variants.map(({ v, inv }) => (
                  <tr key={v.id}>
                    <td><span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: attr(v.colourValueId)?.hex ?? "#ddd" }} />{attr(v.colourValueId)?.label ?? "—"}</span><input type="hidden" name="variantId" value={v.id} /></td>
                    <td>{attr(v.sizeValueId)?.label ?? "—"}</td>
                    <td><input name={`sku_${v.id}`} defaultValue={v.sku} className="w-44 rounded-[3px] border border-line px-2 py-1 text-[12.5px]" aria-label={`SKU for ${v.sku}`} /></td>
                    <td>{(inv?.onHand ?? 0) - (inv?.reserved ?? 0)}<span className="text-[11px] text-charcoal/50"> / {inv?.onHand ?? 0}</span></td>
                    {canPrice && <td><input name={`cost_${v.id}`} defaultValue={major(v.costPrice)} inputMode="decimal" className="w-24 rounded-[3px] border border-line px-2 py-1 text-[12.5px]" aria-label="Cost price" /></td>}
                    {canPrice && <td className="whitespace-nowrap">{CURRENCIES.map((c) => <input key={c} name={`vprice_${v.id}_${c}`} defaultValue={major(vprices.find((x) => x.variantId === v.id && x.currency === c)?.price)} placeholder={c} inputMode="decimal" className="mr-1 w-[70px] rounded-[3px] border border-line px-2 py-1 text-[12px]" aria-label={`${c} override`} />)}</td>}
                    <td><input type="checkbox" name={`active_${v.id}`} defaultChecked={v.active} className="h-4 w-4 accent-charcoal" aria-label="Active" /></td>
                    <td>{canEdit && <ActionButton action={removeVariantAction} fields={{ variantId: v.id }} label="Remove" variant="ghost" confirm="Remove this variant? If it has orders or stock it will be deactivated instead." />}</td>
                  </tr>
                ))}
              </Table>
            </AdminForm>
          )}
          {canEdit && (
            <div className="mt-5">
              <Disclosure label="Add colours / sizes" defaultOpen={!variants.length}>
                <AdminForm action={addVariantsAction} submit="Add variants" resetOnSuccess>
                  <input type="hidden" name="id" value={id} />
                  <p className="text-[12px] text-charcoal/55">Every colour × size combination is created (existing ones are skipped). New variants start with zero stock.</p>
                  {[0, 1, 2].map((i) => {
                    const c = colours[i];
                    return (
                      <div key={i} className="grid gap-3 sm:grid-cols-[1fr_140px]">
                        <Field label={`Colour ${i + 1}${i ? " (optional)" : ""}`} name="colourName" defaultValue={c?.label ?? ""} placeholder="Ivory" />
                        <Field label="Swatch hex" name="colourHex" defaultValue={c?.hex ?? "#E6DCC8"} placeholder="#E6DCC8" />
                      </div>
                    );
                  })}
                  <fieldset><legend className="mb-2 text-[11.5px] text-charcoal/65">Sizes</legend><div className="flex flex-wrap gap-4">{sizes.map((z) => <Check key={z.id} name="sizes" value={z.label} label={z.label} defaultChecked={variants.some((x) => x.v.sizeValueId === z.id)} />)}</div></fieldset>
                  <Field label="Other sizes (comma separated)" name="customSizes" placeholder="One size, 6, 8" />
                </AdminForm>
              </Disclosure>
            </div>
          )}
        </Card>

        <Card title={`Images (${images.length})`}>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {images.map(({ pi, m }, i) => (
              <li key={pi.id} className="rounded-[3px] border border-line bg-white p-2">
                <div className="relative aspect-[3/4] overflow-hidden bg-beige"><Image src={m.url} alt={pi.alt ?? m.alt} fill sizes="200px" className="object-cover" /></div>
                {canEdit && (
                  <>
                    <AdminForm action={imageAction} submit="Save" className="mt-2 gap-2">
                      <input type="hidden" name="productId" value={id} /><input type="hidden" name="imageId" value={pi.id} /><input type="hidden" name="op" value="save" />
                      <SelectField label="Colour" name="colourValueId" defaultValue={pi.colourValueId ?? ""}><option value="">All colours</option>{colours.map((c) => <option key={c!.id} value={c!.id}>{c!.label}</option>)}</SelectField>
                      <Field label="Alt text" name="alt" defaultValue={pi.alt ?? m.alt} />
                    </AdminForm>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {i > 0 && <ActionButton action={imageAction} fields={{ productId: id, imageId: pi.id, op: "up" }} label="← Move" variant="ghost" />}
                      {i < images.length - 1 && <ActionButton action={imageAction} fields={{ productId: id, imageId: pi.id, op: "down" }} label="Move →" variant="ghost" />}
                      <ActionButton action={imageAction} fields={{ productId: id, imageId: pi.id, op: "remove" }} label="Remove" variant="ghost" confirm="Remove this image from the product? It stays in the media library." />
                    </div>
                  </>
                )}
                <p className="mt-1 truncate text-[10.5px] text-charcoal/45">{i === 0 ? "Main image · " : i === 1 ? "Hover image · " : ""}{m.filename}</p>
              </li>
            ))}
          </ul>
          {canEdit && staffCan(staff, "media.upload") && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <AdminForm action={uploadImagesAction} submit="Upload" resetOnSuccess>
                <input type="hidden" name="productId" value={id} />
                <Field label="Upload images (JPEG, PNG, WebP or AVIF · max 12 MB each)" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" />
                <SelectField label="Colour" name="colourValueId"><option value="">All colours</option>{colours.map((c) => <option key={c!.id} value={c!.id}>{c!.label}</option>)}</SelectField>
                <Field label="Alt text" name="alt" placeholder={`${p.name} — front view`} />
              </AdminForm>
              <AdminForm action={attachLibraryImageAction} submit="Add from library" resetOnSuccess>
                <input type="hidden" name="productId" value={id} />
                <SelectField label="Media library" name="mediaId"><option value="">Choose…</option>{library.map((m) => <option key={m.id} value={m.id}>{m.folder} · {m.alt.slice(0, 70) || m.filename}</option>)}</SelectField>
                <SelectField label="Colour" name="colourValueId"><option value="">All colours</option>{colours.map((c) => <option key={c!.id} value={c!.id}>{c!.label}</option>)}</SelectField>
              </AdminForm>
            </div>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {(["look", "related"] as const).map((kind) => (
            <Card key={kind} title={kind === "look" ? "Complete the look" : "You may also like"}>
              <AdminForm action={relatedAction} submit="Save" footer={canEdit}>
                <input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value={kind} />
                <div className="max-h-64 overflow-y-auto rounded-[3px] border border-line p-3">
                  {allProducts.map((x) => <Check key={x.id} name="relatedIds" value={x.id} label={`${x.name}${x.status !== "active" ? ` (${x.status})` : ""}`} defaultChecked={related.some((r) => r.kind === kind && r.relatedId === x.id)} />)}
                </div>
                {kind === "related" && <p className="text-[11.5px] text-charcoal/50">If none are chosen, similar pieces from the same category are shown automatically.</p>}
              </AdminForm>
            </Card>
          ))}
        </div>

        {staffCan(staff, "products.delete") && (
          <Card title="Delete product">
            <p className="mb-3 text-[13px] text-charcoal/65">Prefer archiving (Status → Archived) to keep the product for reference. Deleting removes it, its variants, stock records and image links permanently; past orders keep their item names, SKUs and prices.</p>
            <ActionButton action={deleteProductAction as never} fields={{ id }} label="Delete permanently" variant="danger" confirm={`Permanently delete ${p.name}? This can't be undone.`} />
          </Card>
        )}
      </div>
    </>
  );
}
