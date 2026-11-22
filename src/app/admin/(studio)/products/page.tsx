import Link from "next/link";
import Image from "next/image";
import { and, asc, desc, eq, inArray, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { ActionButton, SelectAll } from "@/components/admin/client";
import { ALink, Empty, FilterBar, FInput, FSelect, Money, NoAccess, PageHeader, Pagination, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { bulkProductsAction } from "../../_actions/catalog";

export const metadata = { title: "Products" };
const PAGE = 25;

export default async function ProductsPage(props: PageProps<"/admin/products">) {
  const { staff, allowed } = await staffPage("products.view");
  if (!allowed) return <NoAccess permission="products.view" />;
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const where: SQL[] = [isNull(s.products.deletedAt)];
  if (str("q")) { const L = `%${str("q").replace(/[\\%_]/g, (c) => `\\${c}`)}%`; where.push(or(like(s.products.name, L), like(s.products.sku, L), like(s.products.slug, L), sql`EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = ${s.products.id} AND v.sku LIKE ${L})`)!); }
  if (str("status")) where.push(eq(s.products.status, str("status") as never));
  if (str("category")) where.push(eq(s.products.categoryId, str("category")));
  const cond = and(...where);
  const [rows, [{ n }], categories, collections] = await Promise.all([
    db.select().from(s.products).where(cond).orderBy(desc(s.products.updatedAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.products).where(cond),
    db.select({ id: s.categories.id, name: s.categories.name }).from(s.categories).orderBy(asc(s.categories.sortOrder)),
    db.select({ id: s.collections.id, name: s.collections.name }).from(s.collections),
  ]);
  const ids = rows.map((r) => r.id);
  const [prices, stock, images] = ids.length ? await Promise.all([
    db.select().from(s.productPrices).where(and(inArray(s.productPrices.productId, ids), eq(s.productPrices.currency, "PKR"))),
    db.select({ id: s.productVariants.productId, avail: sql<number>`SUM(${s.inventory.onHand} - ${s.inventory.reserved})`, variants: sql<number>`COUNT(*)` }).from(s.productVariants).leftJoin(s.inventory, eq(s.inventory.variantId, s.productVariants.id)).where(and(inArray(s.productVariants.productId, ids), eq(s.productVariants.active, true))).groupBy(s.productVariants.productId),
    db.select({ productId: s.productImages.productId, url: s.mediaAssets.url, sort: s.productImages.sortOrder }).from(s.productImages).innerJoin(s.mediaAssets, eq(s.mediaAssets.id, s.productImages.mediaId)).where(inArray(s.productImages.productId, ids)).orderBy(asc(s.productImages.sortOrder)),
  ]) : [[], [], []];
  const canBulk = staffCan(staff, "products.update");

  return (
    <>
      <PageHeader title="Products" description={`${Number(n)} product${Number(n) === 1 ? "" : "s"}`} actions={staffCan(staff, "products.create") ? <ALink href="/admin/products/new">New product</ALink> : undefined} />
      {sp.deleted && <p role="status" className="mb-4 rounded-[3px] bg-[#e3eadc] px-3.5 py-2.5 text-[13px] text-success">Product deleted. Past orders keep their item details.</p>}
      <FilterBar path="/admin/products">
        <FInput label="Search" name="q" defaultValue={str("q")} placeholder="Name, SKU or slug" className="min-w-[220px]" />
        <FSelect label="Status" name="status" defaultValue={str("status")}><option value="">Any</option>{["active", "draft", "scheduled", "archived"].map((x) => <option key={x}>{x}</option>)}</FSelect>
        <FSelect label="Category" name="category" defaultValue={str("category")}><option value="">Any</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</FSelect>
      </FilterBar>
      {canBulk && rows.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
          <label className="flex items-center gap-2"><SelectAll form="bulk-products" /> Select page</label>
          <span className="text-charcoal/55">With selected:</span>
          {staffCan(staff, "products.publish") && <ActionButton action={bulkProductsAction} fields={{ op: "active" }} label="Publish" bulkForm="bulk-products" />}
          <ActionButton action={bulkProductsAction} fields={{ op: "draft" }} label="Unpublish" bulkForm="bulk-products" />
          <ActionButton action={bulkProductsAction} fields={{ op: "archived" }} label="Archive" bulkForm="bulk-products" confirm="Archive the selected products? They disappear from the shop." />
          <ActionButton action={bulkProductsAction} fields={{ op: "new_on" }} label="Mark new" bulkForm="bulk-products" />
          <ActionButton action={bulkProductsAction} fields={{ op: "new_off" }} label="Unmark new" bulkForm="bulk-products" />
          <ActionButton action={bulkProductsAction} fields={{ op: "featured_on" }} label="Feature" bulkForm="bulk-products" />
          {collections.slice(0, 4).map((c) => <ActionButton key={c.id} action={bulkProductsAction} fields={{ op: "collection", collectionId: c.id }} label={`+ ${c.name}`} bulkForm="bulk-products" />)}
        </div>
      )}
      <Table head={["", "", "Product", "Status", "Category", "Price (PKR)", "Stock"]} empty={!rows.length ? <div className="p-6"><Empty title="No products found" /></div> : undefined}>
        {rows.map((p) => {
          const st = stock.find((x) => x.id === p.id);
          const img = images.find((x) => x.productId === p.id);
          const price = prices.find((x) => x.productId === p.id);
          const avail = Number(st?.avail ?? 0);
          return (
            <tr key={p.id}>
              <td className="w-8">{canBulk && <input form="bulk-products" type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} className="h-4 w-4 accent-charcoal" />}</td>
              <td className="w-14"><div className="relative h-14 w-11 overflow-hidden bg-beige">{img && <Image src={img.url} alt="" fill sizes="44px" className="object-cover" />}</div></td>
              <td><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link><span className="block text-[11.5px] text-charcoal/50">{p.sku}{p.isNew ? " · New" : ""}{p.isFeatured ? " · Featured" : ""}</span></td>
              <td><Status value={p.status} /></td>
              <td className="text-charcoal/70">{categories.find((c) => c.id === p.categoryId)?.name ?? "—"}</td>
              <td>{price ? <Money amount={price.price} currency="PKR" /> : <span className="text-danger">Missing</span>}</td>
              <td>{st ? <Status value={avail <= 0 ? "out" : avail < 6 ? "low" : "in_stock"} label={`${avail} in ${Number(st.variants)} variants`} /> : <span className="text-charcoal/50">No variants</span>}</td>
            </tr>
          );
        })}
      </Table>
      <form id="bulk-products" />
      <Pagination page={page} pages={Math.ceil(Number(n) / PAGE)} params={sp} path="/admin/products" />
    </>
  );
}
