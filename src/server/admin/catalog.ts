import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db";
import * as s from "../db/schema";
import { audit, diff } from "../audit";
import { staffActor, type StaffSession } from "../auth/session";
import { AppError, newId, slugify } from "../lib/core";
import { deleteStored, storeImage } from "../media/storage";
import { CURRENCIES } from "@/types";

const OCCASIONS = ["workwear", "everyday", "evening", "festive"];

export interface ProductDetailsInput {
  name: string; slug: string; sku: string; subtitle: string; shortDescription: string; description: string;
  categoryId: string | null; extraCategoryIds: string[]; collectionIds: string[]; occasions: string[]; tags: string[];
  fabric: string; care: string[]; details: string[]; fit: string | null; sizeGuideId: string | null;
  status: "draft" | "active" | "scheduled" | "archived"; publishAt: Date | null;
  isNew: boolean; isFeatured: boolean; isBestseller: boolean; sortOrder: number;
  seoTitle: string | null; seoDescription: string | null;
}

function validate(d: ProductDetailsInput) {
  if (!d.name) throw new AppError("Name is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) throw new AppError("Slug may only contain lowercase letters, numbers and hyphens.");
  if (!/^[A-Z0-9][A-Z0-9-]{1,63}$/.test(d.sku)) throw new AppError("SKU must be uppercase letters, numbers and hyphens.");
  if (d.status === "scheduled" && !d.publishAt) throw new AppError("Choose a publication date for a scheduled product.");
  if (!d.description) throw new AppError("Add a description.");
  d.occasions = d.occasions.filter((o) => OCCASIONS.includes(o));
}

async function assertUnique(field: "slug" | "sku", value: string, exceptId?: string) {
  const col = field === "slug" ? s.products.slug : s.products.sku;
  const [row] = await db.select({ id: s.products.id }).from(s.products).where(exceptId ? and(eq(col, value), ne(s.products.id, exceptId)) : eq(col, value));
  if (row) throw new AppError(`Another product already uses this ${field}.`);
}

export async function createProduct(staff: StaffSession, d: ProductDetailsInput, prices: Record<string, number>) {
  d.slug ||= slugify(d.name);
  validate(d);
  await assertUnique("slug", d.slug);
  await assertUnique("sku", d.sku);
  if (!prices.PKR) throw new AppError("Set at least the PKR price.");
  const id = newId("prd");
  await db.transaction(async (tx) => {
    await tx.insert(s.products).values({ id, ...detailsRow(d) });
    await tx.insert(s.productPrices).values(Object.entries(prices).filter(([, v]) => v > 0).map(([currency, price]) => ({ productId: id, currency, price })));
    await syncTaxonomy(tx, id, d);
  });
  await audit(staffActor(staff), "product.created", "product", id, `Created product ${d.name} (${d.status})`);
  return id;
}

const detailsRow = (d: ProductDetailsInput) => ({
  slug: d.slug, sku: d.sku, name: d.name, subtitle: d.subtitle, shortDescription: d.shortDescription, description: d.description, categoryId: d.categoryId,
  occasions: d.occasions, tags: d.tags, fabric: d.fabric, care: d.care, details: d.details, fit: d.fit, sizeGuideId: d.sizeGuideId,
  status: d.status, publishAt: d.status === "scheduled" ? d.publishAt : null, isNew: d.isNew, isFeatured: d.isFeatured, isBestseller: d.isBestseller, sortOrder: d.sortOrder,
  seoTitle: d.seoTitle, seoDescription: d.seoDescription,
});

async function syncTaxonomy(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string, d: ProductDetailsInput) {
  await tx.delete(s.productCategories).where(eq(s.productCategories.productId, id));
  const extra = d.extraCategoryIds.filter((c) => c !== d.categoryId);
  if (extra.length) await tx.insert(s.productCategories).values(extra.map((categoryId) => ({ productId: id, categoryId })));
  await tx.delete(s.productCollections).where(eq(s.productCollections.productId, id));
  if (d.collectionIds.length) await tx.insert(s.productCollections).values(d.collectionIds.map((collectionId, i) => ({ productId: id, collectionId, sortOrder: i })));
}

export async function updateProductDetails(staff: StaffSession, id: string, d: ProductDetailsInput) {
  validate(d);
  await assertUnique("slug", d.slug, id);
  await assertUnique("sku", d.sku, id);
  const [before] = await db.select().from(s.products).where(eq(s.products.id, id));
  if (!before) throw new AppError("Product not found.");
  if (d.status === "active" || d.status === "scheduled") await assertPublishable(id);
  await db.transaction(async (tx) => {
    await tx.update(s.products).set(detailsRow(d)).where(eq(s.products.id, id));
    await syncTaxonomy(tx, id, d);
  });
  const changes = diff(before as unknown as Record<string, unknown>, detailsRow(d) as unknown as Record<string, unknown>, ["name", "slug", "sku", "status", "categoryId", "publishAt", "isNew", "isFeatured", "isBestseller"]);
  await audit(staffActor(staff), before.status !== d.status ? "product.status_changed" : "product.updated", "product", id, `Updated ${d.name}${before.status !== d.status ? ` (${before.status} → ${d.status})` : ""}`, changes);
}

/** A product can only go live with a PKR price, at least one active variant and one image. */
export async function assertPublishable(id: string) {
  const [[price], [variant], [image]] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(s.productPrices).where(and(eq(s.productPrices.productId, id), eq(s.productPrices.currency, "PKR"))),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.productVariants).where(and(eq(s.productVariants.productId, id), eq(s.productVariants.active, true))),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.productImages).where(eq(s.productImages.productId, id)),
  ]);
  const missing = [!Number(price.n) && "a PKR price", !Number(variant.n) && "at least one active size/colour", !Number(image.n) && "at least one image"].filter(Boolean);
  if (missing.length) throw new AppError(`Before publishing, add ${missing.join(", ")}.`);
}

export async function setProductStatus(staff: StaffSession, ids: string[], status: "draft" | "active" | "archived") {
  let done = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      if (status === "active") await assertPublishable(id);
      await db.update(s.products).set({ status, publishAt: null }).where(eq(s.products.id, id));
      done++;
    } catch (e) { errors.push((e as Error).message); }
  }
  await audit(staffActor(staff), "product.bulk_status", "product", null, `Set ${done} product(s) to ${status}`);
  return { done, errors };
}

export async function updatePrices(staff: StaffSession, id: string, rows: { currency: string; price: number | null; compareAt: number | null }[]) {
  const before = await db.select().from(s.productPrices).where(eq(s.productPrices.productId, id));
  const pkr = rows.find((r) => r.currency === "PKR");
  if (!pkr?.price) throw new AppError("The PKR price is required.");
  for (const r of rows) if (r.price && r.compareAt && r.compareAt <= r.price) throw new AppError(`${r.currency}: the "was" price must be higher than the selling price.`);
  await db.transaction(async (tx) => {
    await tx.delete(s.productPrices).where(eq(s.productPrices.productId, id));
    await tx.insert(s.productPrices).values(rows.filter((r) => r.price && CURRENCIES.includes(r.currency as never)).map((r) => ({ productId: id, currency: r.currency, price: r.price!, compareAtPrice: r.compareAt })));
  });
  const changes = Object.fromEntries(rows.map((r) => [r.currency, { from: before.find((b) => b.currency === r.currency)?.price ?? null, to: r.price }]).filter(([, v]) => (v as { from: unknown; to: unknown }).from !== (v as { from: unknown; to: unknown }).to));
  await audit(staffActor(staff), "product.price_changed", "product", id, "Updated prices", changes);
}

/* ─────────────── Variants ─────────────── */

async function attrValue(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], attributeId: "attr-colour" | "attr-size", label: string, hex?: string) {
  const value = label.trim();
  const [found] = await tx.select().from(s.productAttributeValues).where(and(eq(s.productAttributeValues.attributeId, attributeId), eq(s.productAttributeValues.value, value)));
  if (found) {
    if (hex && found.hex !== hex) await tx.update(s.productAttributeValues).set({ hex }).where(eq(s.productAttributeValues.id, found.id));
    return found.id;
  }
  const id = `${attributeId === "attr-colour" ? "colour" : "size"}-${slugify(value) || newId("v")}`;
  const [{ n }] = await tx.select({ n: sql<number>`COUNT(*)` }).from(s.productAttributeValues).where(eq(s.productAttributeValues.attributeId, attributeId));
  await tx.insert(s.productAttributeValues).values({ id, attributeId, value, label: value, hex: hex ?? null, family: attributeId === "attr-colour" ? value.replace(/\s+II$/, "") : null, sortOrder: Number(n) + 1 });
  return id;
}

/** Adds every colour × size combination that doesn't exist yet (with zero stock). */
export async function addVariants(staff: StaffSession, productId: string, colours: { name: string; hex: string }[], sizes: string[]) {
  const [p] = await db.select().from(s.products).where(eq(s.products.id, productId));
  if (!p) throw new AppError("Product not found.");
  if (!colours.length || !sizes.length) throw new AppError("Choose at least one colour and one size.");
  let created = 0;
  await db.transaction(async (tx) => {
    const existing = await tx.select().from(s.productVariants).where(eq(s.productVariants.productId, productId));
    for (const c of colours) {
      if (!/^#[0-9a-fA-F]{6}$/.test(c.hex)) throw new AppError(`Colour ${c.name}: use a hex value like #E6DCC8.`);
      const colourId = await attrValue(tx, "attr-colour", c.name, c.hex);
      for (const size of sizes) {
        const sizeId = await attrValue(tx, "attr-size", size);
        if (existing.some((v) => v.colourValueId === colourId && v.sizeValueId === sizeId)) continue;
        const vid = newId("var");
        const sku = `${p.sku}-${c.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "COL"}-${size.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
        const [dupe] = await tx.select({ id: s.productVariants.id }).from(s.productVariants).where(eq(s.productVariants.sku, sku));
        await tx.insert(s.productVariants).values({ id: vid, productId, sku: dupe ? `${sku}-${vid.slice(-4).toUpperCase()}` : sku, colourValueId: colourId, sizeValueId: sizeId, sortOrder: existing.length + created });
        await tx.insert(s.inventory).values({ variantId: vid, onHand: 0, reserved: 0 });
        created++;
      }
    }
  });
  await audit(staffActor(staff), "product.variants_added", "product", productId, `Added ${created} variant(s) to ${p.name}`);
  return created;
}

export async function updateVariants(staff: StaffSession, productId: string, rows: { id: string; sku: string; costPrice: number | null; active: boolean; prices: Record<string, number | null> }[]) {
  await db.transaction(async (tx) => {
    for (const r of rows) {
      if (!/^[A-Z0-9][A-Z0-9-]{1,79}$/.test(r.sku)) throw new AppError(`Invalid SKU “${r.sku}”.`);
      const [dupe] = await tx.select({ id: s.productVariants.id }).from(s.productVariants).where(and(eq(s.productVariants.sku, r.sku), ne(s.productVariants.id, r.id)));
      if (dupe) throw new AppError(`SKU ${r.sku} is already used by another variant.`);
      await tx.update(s.productVariants).set({ sku: r.sku, costPrice: r.costPrice, active: r.active }).where(and(eq(s.productVariants.id, r.id), eq(s.productVariants.productId, productId)));
      await tx.delete(s.variantPrices).where(eq(s.variantPrices.variantId, r.id));
      const overrides = Object.entries(r.prices).filter(([, v]) => v && v > 0);
      if (overrides.length) await tx.insert(s.variantPrices).values(overrides.map(([currency, price]) => ({ variantId: r.id, currency, price: price! })));
    }
  });
  await audit(staffActor(staff), "product.variants_updated", "product", productId, `Updated ${rows.length} variant(s)`);
}

/** Removes a variant that has never been ordered; otherwise it is deactivated to keep history intact. */
export async function removeVariant(staff: StaffSession, variantId: string) {
  const [v] = await db.select().from(s.productVariants).where(eq(s.productVariants.id, variantId));
  if (!v) throw new AppError("Variant not found.");
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(s.orderItems).where(eq(s.orderItems.variantId, variantId));
  const [inv] = await db.select().from(s.inventory).where(eq(s.inventory.variantId, variantId));
  if ((inv?.reserved ?? 0) > 0) throw new AppError("This variant has stock reserved for a pending payment.");
  if (Number(n) > 0 || (inv?.onHand ?? 0) > 0) {
    await db.update(s.productVariants).set({ active: false }).where(eq(s.productVariants.id, variantId));
    await audit(staffActor(staff), "product.variant_deactivated", "product", v.productId, `Deactivated variant ${v.sku} (has orders or stock)`);
    return "deactivated";
  }
  await db.delete(s.productVariants).where(eq(s.productVariants.id, variantId));
  await audit(staffActor(staff), "product.variant_deleted", "product", v.productId, `Deleted variant ${v.sku}`);
  return "deleted";
}

/* ─────────────── Images & media ─────────────── */

export async function uploadMedia(staff: StaffSession, files: File[], opts: { folder: string; alt?: string }) {
  if (!files.length) throw new AppError("Choose at least one image.");
  if (files.length > 20) throw new AppError("Upload up to 20 images at a time.");
  const ids: string[] = [];
  for (const file of files) {
    const id = newId("med");
    const stored = await storeImage(id, file);
    await db.insert(s.mediaAssets).values({
      id, driver: stored.driver, storageKey: stored.storageKey, url: stored.url, filename: file.name.slice(0, 255), mimeType: stored.mimeType, bytes: stored.bytes,
      width: stored.width, height: stored.height, alt: (opts.alt || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")).slice(0, 300), folder: opts.folder, checksum: stored.checksum,
      credit: { source: "Nargis & Shaz", photographer: "Nargis & Shaz", license: "Owned" }, uploadedBy: staff.id,
    });
    ids.push(id);
  }
  await audit(staffActor(staff), "media.uploaded", "media", ids[0] ?? null, `Uploaded ${ids.length} image(s) to ${opts.folder}`);
  return ids;
}

export async function replaceMediaFile(staff: StaffSession, mediaId: string, file: File) {
  const [m] = await db.select().from(s.mediaAssets).where(eq(s.mediaAssets.id, mediaId));
  if (!m) throw new AppError("Media not found.");
  const stored = await storeImage(mediaId, file);
  await db.update(s.mediaAssets).set({ driver: stored.driver, storageKey: stored.storageKey, url: stored.url, filename: file.name.slice(0, 255), mimeType: stored.mimeType, bytes: stored.bytes, width: stored.width, height: stored.height, checksum: stored.checksum, credit: { source: "Nargis & Shaz", photographer: "Nargis & Shaz", license: "Owned" } }).where(eq(s.mediaAssets.id, mediaId));
  await audit(staffActor(staff), "media.replaced", "media", mediaId, `Replaced image file for ${m.filename}`);
}

/** Where a media asset is used (products, categories, collections, homepage, banners, settings). */
export async function mediaUsage(ids: string[]) {
  if (!ids.length) return new Map<string, string[]>();
  const [pi, cats, cols, secs, items, banners, settings] = await Promise.all([
    db.select({ id: s.productImages.mediaId, name: s.products.name }).from(s.productImages).innerJoin(s.products, eq(s.products.id, s.productImages.productId)).where(inArray(s.productImages.mediaId, ids)),
    db.select({ img: s.categories.imageId, banner: s.categories.bannerId, name: s.categories.name }).from(s.categories),
    db.select({ id: s.collections.heroId, name: s.collections.name }).from(s.collections).where(inArray(s.collections.heroId, ids)),
    db.select({ a: s.homepageSections.imageId, b: s.homepageSections.mobileImageId, name: s.homepageSections.name }).from(s.homepageSections),
    db.select({ id: s.homepageSectionItems.imageId, sec: s.homepageSectionItems.sectionId }).from(s.homepageSectionItems).where(inArray(s.homepageSectionItems.imageId, ids)),
    db.select({ id: s.banners.imageId }).from(s.banners).where(inArray(s.banners.imageId, ids)),
    db.select().from(s.storeSettings).where(inArray(s.storeSettings.key, ["logoMediaId", "seo"])),
  ]);
  const out = new Map<string, string[]>(ids.map((i) => [i, []]));
  const add = (id: string | null | undefined, label: string) => { if (id && out.has(id)) out.get(id)!.push(label); };
  pi.forEach((r) => add(r.id, `Product: ${r.name}`));
  cats.forEach((c) => { add(c.img, `Category: ${c.name}`); add(c.banner, `Category banner: ${c.name}`); });
  cols.forEach((c) => add(c.id, `Collection: ${c.name}`));
  secs.forEach((x) => { add(x.a, `Homepage: ${x.name}`); add(x.b, `Homepage (mobile): ${x.name}`); });
  items.forEach((x) => add(x.id, "Homepage section item"));
  banners.forEach((x) => add(x.id, "Banner"));
  settings.forEach((x) => { const v = x.value as unknown; if (typeof v === "string") add(v, "Store logo"); else if (v && typeof v === "object" && "ogImageId" in v) add((v as { ogImageId: string }).ogImageId, "SEO share image"); });
  return out;
}

export async function deleteMedia(staff: StaffSession, mediaId: string) {
  const usage = (await mediaUsage([mediaId])).get(mediaId) ?? [];
  if (usage.length) throw new AppError(`This image is in use (${usage.slice(0, 3).join("; ")}). Remove it there first.`);
  const [m] = await db.select().from(s.mediaAssets).where(eq(s.mediaAssets.id, mediaId));
  if (!m) return;
  await deleteStored(m.driver, m.storageKey);
  await db.delete(s.mediaAssets).where(eq(s.mediaAssets.id, mediaId));
  await audit(staffActor(staff), "media.deleted", "media", mediaId, `Deleted image ${m.filename}`);
}

export async function attachImages(staff: StaffSession, productId: string, mediaIds: string[], colourValueId: string | null) {
  const [{ n }] = await db.select({ n: sql<number>`COALESCE(MAX(sort_order), -1)` }).from(s.productImages).where(eq(s.productImages.productId, productId));
  await db.insert(s.productImages).values(mediaIds.map((mediaId, i) => ({ id: newId("pim"), productId, mediaId, colourValueId, sortOrder: Number(n) + 1 + i })));
  await audit(staffActor(staff), "product.images_added", "product", productId, `Added ${mediaIds.length} image(s)`);
}

export async function moveImage(productId: string, imageId: string, dir: -1 | 1) {
  const imgs = await db.select().from(s.productImages).where(eq(s.productImages.productId, productId)).orderBy(asc(s.productImages.sortOrder));
  const i = imgs.findIndex((x) => x.id === imageId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= imgs.length) return;
  [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
  await db.transaction(async (tx) => { for (const [k, img] of imgs.entries()) await tx.update(s.productImages).set({ sortOrder: k }).where(eq(s.productImages.id, img.id)); });
}

/* ─────────────── Duplicate / delete ─────────────── */

export async function duplicateProduct(staff: StaffSession, id: string) {
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id));
  if (!p) throw new AppError("Product not found.");
  const nid = newId("prd");
  const suffix = nid.slice(-4).toLowerCase();
  await db.transaction(async (tx) => {
    await tx.insert(s.products).values({ ...p, id: nid, slug: `${p.slug}-copy-${suffix}`.slice(0, 160), sku: `${p.sku}-C${suffix.toUpperCase()}`.slice(0, 64), name: `${p.name} (copy)`, status: "draft", publishAt: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null });
    const prices = await tx.select().from(s.productPrices).where(eq(s.productPrices.productId, id));
    if (prices.length) await tx.insert(s.productPrices).values(prices.map((x) => ({ ...x, productId: nid })));
    const vars = await tx.select().from(s.productVariants).where(eq(s.productVariants.productId, id));
    for (const v of vars) {
      const vid = newId("var");
      await tx.insert(s.productVariants).values({ ...v, id: vid, productId: nid, sku: `${v.sku}-C${suffix.toUpperCase()}`.slice(0, 80), createdAt: new Date(), updatedAt: new Date() });
      await tx.insert(s.inventory).values({ variantId: vid, onHand: 0, reserved: 0 });
      const vp = await tx.select().from(s.variantPrices).where(eq(s.variantPrices.variantId, v.id));
      if (vp.length) await tx.insert(s.variantPrices).values(vp.map((x) => ({ ...x, variantId: vid })));
    }
    const imgs = await tx.select().from(s.productImages).where(eq(s.productImages.productId, id));
    if (imgs.length) await tx.insert(s.productImages).values(imgs.map((x) => ({ ...x, id: newId("pim"), productId: nid })));
    const cols = await tx.select().from(s.productCollections).where(eq(s.productCollections.productId, id));
    if (cols.length) await tx.insert(s.productCollections).values(cols.map((x) => ({ ...x, productId: nid })));
    const cats = await tx.select().from(s.productCategories).where(eq(s.productCategories.productId, id));
    if (cats.length) await tx.insert(s.productCategories).values(cats.map((x) => ({ ...x, productId: nid })));
  });
  await audit(staffActor(staff), "product.duplicated", "product", nid, `Duplicated ${p.name} as a draft (stock starts at 0)`);
  return nid;
}

/**
 * Permanent deletion. Order history is preserved (order items keep their snapshots; their product
 * reference becomes empty). Products with stock reserved for pending payments can't be deleted.
 */
export async function deleteProduct(staff: StaffSession, id: string) {
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id));
  if (!p) throw new AppError("Product not found.");
  const [{ r }] = await db.select({ r: sql<number>`COALESCE(SUM(${s.inventory.reserved}), 0)` }).from(s.inventory).innerJoin(s.productVariants, eq(s.productVariants.id, s.inventory.variantId)).where(eq(s.productVariants.productId, id));
  if (Number(r) > 0) throw new AppError("Stock of this product is reserved for pending payments. Try again later or archive it.");
  await db.delete(s.products).where(eq(s.products.id, id));
  await audit(staffActor(staff), "product.deleted", "product", id, `Permanently deleted ${p.name} (${p.sku}); order history kept`);
}

export async function saveRelated(staff: StaffSession, productId: string, kind: "look" | "related", ids: string[]) {
  const clean = [...new Set(ids)].filter((x) => x !== productId).slice(0, 12);
  await db.transaction(async (tx) => {
    await tx.delete(s.relatedProducts).where(and(eq(s.relatedProducts.productId, productId), eq(s.relatedProducts.kind, kind)));
    if (clean.length) await tx.insert(s.relatedProducts).values(clean.map((relatedId, i) => ({ productId, relatedId, kind, sortOrder: i })));
  });
  await audit(staffActor(staff), "product.related_updated", "product", productId, `${kind === "look" ? "Complete the look" : "Related products"}: ${clean.length} selected`);
}
