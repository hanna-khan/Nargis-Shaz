"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { audit } from "@/server/audit";
import { requireStaff, staffActor } from "@/server/auth/session";
import { f, invalidate, studioAction } from "@/server/admin/guard";
import * as cat from "@/server/admin/catalog";
import { adjustStock, type AdjustReason } from "@/server/inventory";
import { AppError, newId, slugify } from "@/server/lib/core";
import { CURRENCIES } from "@/types";

function details(form: FormData): cat.ProductDetailsInput {
  const status = f.str(form, "status") as cat.ProductDetailsInput["status"];
  return {
    name: f.str(form, "name", 160), slug: f.str(form, "slug", 160).toLowerCase() || slugify(f.str(form, "name")), sku: f.str(form, "sku", 64).toUpperCase(),
    subtitle: f.str(form, "subtitle", 200), shortDescription: f.str(form, "shortDescription", 400), description: f.str(form, "description", 10_000),
    categoryId: f.opt(form, "categoryId"), extraCategoryIds: f.list(form, "extraCategoryIds"), collectionIds: f.list(form, "collectionIds"), occasions: f.list(form, "occasions"),
    tags: f.str(form, "tags").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20),
    fabric: f.str(form, "fabric", 255), care: f.lines(form, "care").slice(0, 12), details: f.lines(form, "details").slice(0, 20), fit: f.opt(form, "fit", 255), sizeGuideId: f.opt(form, "sizeGuideId"),
    status: ["draft", "active", "scheduled", "archived"].includes(status) ? status : "draft", publishAt: f.date(form, "publishAt"),
    isNew: f.bool(form, "isNew"), isFeatured: f.bool(form, "isFeatured"), isBestseller: f.bool(form, "isBestseller"), sortOrder: f.int(form, "sortOrder") ?? 0,
    seoTitle: f.opt(form, "seoTitle", 160), seoDescription: f.opt(form, "seoDescription", 320),
  };
}

export async function createProductAction(_prev: unknown, form: FormData) {
  let id = "";
  try {
    const staff = await requireStaff("products.create");
    const prices = Object.fromEntries(CURRENCIES.map((c) => [c, f.money(form, `price_${c}`) ?? 0]));
    id = await cat.createProduct(staff, { ...details(form), status: "draft" }, prices);
  } catch (e) {
    const { toFailure } = await import("@/server/lib/core");
    return toFailure(e);
  }
  redirect(`/admin/products/${id}?created=1`);
}

export const updateProductAction = studioAction("products.update", async (staff, form) => {
  const d = details(form);
  if ((d.status === "active" || d.status === "scheduled") && !(staff.isSuperAdmin || staff.permissions.has("products.publish"))) {
    const [cur] = await db.select({ status: s.products.status }).from(s.products).where(eq(s.products.id, f.str(form, "id")));
    if (cur?.status !== d.status) throw new AppError("You need the products.publish permission to publish.");
  }
  await cat.updateProductDetails(staff, f.str(form, "id"), d);
  invalidate("catalog");
  return "Product saved.";
});

export const pricesAction = studioAction("products.price", async (staff, form) => {
  await cat.updatePrices(staff, f.str(form, "id"), CURRENCIES.map((c) => ({ currency: c, price: f.money(form, `price_${c}`), compareAt: f.money(form, `compare_${c}`) })));
  invalidate("catalog");
  return "Prices saved.";
});

export const addVariantsAction = studioAction("products.update", async (staff, form) => {
  const names = f.list(form, "colourName"), hexes = f.list(form, "colourHex");
  const colours = names.map((name, i) => ({ name: name.slice(0, 80), hex: hexes[i] ?? "#cccccc" }));
  const sizes = [...f.list(form, "sizes"), ...f.str(form, "customSizes").split(",").map((x) => x.trim()).filter(Boolean)].map((x) => x.slice(0, 40));
  const n = await cat.addVariants(staff, f.str(form, "id"), colours, [...new Set(sizes)]);
  invalidate("catalog");
  return n ? `${n} variant(s) added with zero stock. Set stock in Inventory.` : "Those combinations already exist.";
});

export const updateVariantsAction = studioAction("products.update", async (staff, form) => {
  const ids = f.list(form, "variantId");
  const canPrice = staff.isSuperAdmin || staff.permissions.has("products.price");
  await cat.updateVariants(staff, f.str(form, "id"), ids.map((id) => ({
    id, sku: f.str(form, `sku_${id}`, 80).toUpperCase(), costPrice: canPrice ? f.money(form, `cost_${id}`) : null, active: f.bool(form, `active_${id}`),
    prices: canPrice ? Object.fromEntries(CURRENCIES.map((c) => [c, f.money(form, `vprice_${id}_${c}`)])) : {},
  })));
  invalidate("catalog");
  return "Variants saved.";
});

export const removeVariantAction = studioAction("products.update", async (staff, form) => {
  const r = await cat.removeVariant(staff, f.str(form, "variantId"));
  invalidate("catalog");
  return r === "deleted" ? "Variant deleted." : "Variant has orders or stock, so it was deactivated instead.";
});

export const uploadImagesAction = studioAction("media.upload", async (staff, form) => {
  const files = form.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
  const productId = f.opt(form, "productId");
  const ids = await cat.uploadMedia(staff, files, { folder: f.str(form, "folder") || (productId ? "products" : "editorial"), alt: f.str(form, "alt", 300) });
  if (productId) {
    await requireStaff("products.update");
    await cat.attachImages(staff, productId, ids, f.opt(form, "colourValueId"));
  }
  invalidate("catalog", "content");
  return `${ids.length} image(s) uploaded.`;
});

export const attachLibraryImageAction = studioAction("products.update", async (staff, form) => {
  const mediaId = f.str(form, "mediaId");
  if (!mediaId) throw new AppError("Choose an image.");
  await cat.attachImages(staff, f.str(form, "productId"), [mediaId], f.opt(form, "colourValueId"));
  invalidate("catalog");
  return "Image added.";
});

export const imageAction = studioAction("products.update", async (staff, form) => {
  const productId = f.str(form, "productId"), imageId = f.str(form, "imageId"), op = f.str(form, "op");
  if (op === "up" || op === "down") await cat.moveImage(productId, imageId, op === "up" ? -1 : 1);
  else if (op === "remove") await db.delete(s.productImages).where(and(eq(s.productImages.id, imageId), eq(s.productImages.productId, productId)));
  else if (op === "save") await db.update(s.productImages).set({ colourValueId: f.opt(form, "colourValueId"), alt: f.opt(form, "alt", 300) }).where(and(eq(s.productImages.id, imageId), eq(s.productImages.productId, productId)));
  await audit(staffActor(staff), "product.image_updated", "product", productId, `Image ${op}`);
  invalidate("catalog");
  return op === "remove" ? "Image removed from product (still in the media library)." : "Images updated.";
});

export const relatedAction = studioAction("products.update", async (staff, form) => {
  await cat.saveRelated(staff, f.str(form, "id"), f.str(form, "kind") === "look" ? "look" : "related", f.list(form, "relatedIds"));
  invalidate("catalog");
  return "Saved.";
});

export async function duplicateProductAction(_prev: unknown, form: FormData) {
  let id = "";
  try {
    const staff = await requireStaff("products.create");
    id = await cat.duplicateProduct(staff, f.str(form, "id"));
  } catch (e) {
    const { toFailure } = await import("@/server/lib/core");
    return toFailure(e);
  }
  redirect(`/admin/products/${id}?duplicated=1`);
}

export async function deleteProductAction(_prev: unknown, form: FormData) {
  try {
    const staff = await requireStaff("products.delete");
    await cat.deleteProduct(staff, f.str(form, "id"));
    invalidate("catalog");
  } catch (e) {
    const { toFailure } = await import("@/server/lib/core");
    return toFailure(e);
  }
  redirect("/admin/products?deleted=1");
}

export const bulkProductsAction = studioAction("products.update", async (staff, form) => {
  const ids = f.list(form, "ids").slice(0, 200);
  const op = f.str(form, "op");
  if (!ids.length) throw new AppError("Select at least one product.");
  if (op === "active" || op === "draft" || op === "archived") {
    if (op === "active" && !(staff.isSuperAdmin || staff.permissions.has("products.publish"))) throw new AppError("You need the products.publish permission.");
    const r = await cat.setProductStatus(staff, ids, op);
    invalidate("catalog");
    return r.errors.length ? { ok: false, error: `${r.done} updated; ${r.errors.length} skipped: ${r.errors[0]}` } : `${r.done} product(s) set to ${op}.`;
  }
  if (op === "new_on" || op === "new_off" || op === "featured_on" || op === "featured_off") {
    const col = op.startsWith("new") ? { isNew: op === "new_on" } : { isFeatured: op === "featured_on" };
    for (const id of ids) await db.update(s.products).set(col).where(eq(s.products.id, id));
    await audit(staffActor(staff), "product.bulk_flags", "product", null, `${op} on ${ids.length} product(s)`);
    invalidate("catalog");
    return `${ids.length} product(s) updated.`;
  }
  if (op === "collection") {
    const collectionId = f.str(form, "collectionId");
    if (!collectionId) throw new AppError("Choose a collection.");
    for (const id of ids) await db.insert(s.productCollections).ignore().values({ productId: id, collectionId });
    await audit(staffActor(staff), "collection.products_added", "collection", collectionId, `Added ${ids.length} product(s)`);
    invalidate("catalog");
    return `${ids.length} product(s) added to the collection.`;
  }
  throw new AppError("Choose an action.");
});

/* ─────────────── Inventory ─────────────── */

export const adjustStockAction = studioAction("inventory.adjust", async (staff, form) => {
  const reason = f.str(form, "reason") as AdjustReason;
  if (!["received", "correction", "damaged", "returned", "transfer", "count"].includes(reason)) throw new AppError("Choose a reason.");
  const quantity = f.int(form, "quantity");
  if (quantity === null) throw new AppError("Enter a quantity.");
  const mode = f.str(form, "mode") === "set" ? "set" : "add";
  const threshold = f.str(form, "threshold") === "" ? undefined : f.int(form, "threshold");
  const variantId = f.str(form, "variantId");
  const r = await adjustStock({ variantId, mode, quantity, reason, note: f.str(form, "note", 500), staffUserId: staff.id, lowStockThreshold: threshold });
  const [v] = await db.select({ sku: s.productVariants.sku }).from(s.productVariants).where(eq(s.productVariants.id, variantId));
  await audit(staffActor(staff), "inventory.adjusted", "variant", variantId, `${v?.sku}: ${r.before} → ${r.after} (${reason})`, { onHand: { from: r.before, to: r.after } });
  invalidate("catalog");
  return `Stock for ${v?.sku}: ${r.before} → ${r.after}.`;
});

/* ─────────────── Categories ─────────────── */

export const saveCategoryAction = studioAction("categories.manage", async (staff, form) => {
  const id = f.opt(form, "id");
  const name = f.str(form, "name", 120);
  const slug = (f.str(form, "slug", 120) || slugify(name)).toLowerCase();
  if (!name) throw new AppError("Name is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new AppError("Slug may only contain lowercase letters, numbers and hyphens.");
  const parentId = f.opt(form, "parentId");
  if (id && parentId === id) throw new AppError("A category can't be its own parent.");
  if (parentId) {
    const [parent] = await db.select({ parentId: s.categories.parentId }).from(s.categories).where(eq(s.categories.id, parentId));
    if (parent?.parentId) throw new AppError("Categories can be nested one level deep.");
  }
  const [dupe] = await db.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.slug, slug));
  if (dupe && dupe.id !== id) throw new AppError("Another category uses this slug.");
  const row = { name, slug, parentId, description: f.str(form, "description", 2000), imageId: f.opt(form, "imageId"), bannerId: f.opt(form, "bannerId"), sortOrder: f.int(form, "sortOrder") ?? 0, active: f.bool(form, "active"), seoTitle: f.opt(form, "seoTitle", 160), seoDescription: f.opt(form, "seoDescription", 320) };
  if (id) await db.update(s.categories).set(row).where(eq(s.categories.id, id));
  else await db.insert(s.categories).values({ id: newId("cat"), ...row });
  await audit(staffActor(staff), id ? "category.updated" : "category.created", "category", id, `${id ? "Updated" : "Created"} category ${name}`);
  invalidate("catalog");
  return "Category saved.";
});

export const deleteCategoryAction = studioAction("categories.manage", async (staff, form) => {
  const id = f.str(form, "id");
  const [[{ p }], [{ c }]] = await Promise.all([
    db.select({ p: sql<number>`COUNT(*)` }).from(s.products).where(eq(s.products.categoryId, id)),
    db.select({ c: sql<number>`COUNT(*)` }).from(s.categories).where(eq(s.categories.parentId, id)),
  ]);
  if (Number(p) > 0) throw new AppError(`${p} product(s) use this category. Move them to another category first.`);
  if (Number(c) > 0) throw new AppError("This category has sub-categories. Move or delete them first.");
  const [row] = await db.select().from(s.categories).where(eq(s.categories.id, id));
  await db.delete(s.categories).where(eq(s.categories.id, id));
  await audit(staffActor(staff), "category.deleted", "category", id, `Deleted category ${row?.name}`);
  invalidate("catalog");
  return "Category deleted.";
});

/* ─────────────── Collections ─────────────── */

export const saveCollectionAction = studioAction("categories.manage", async (staff, form) => {
  const id = f.opt(form, "id");
  const name = f.str(form, "name", 120);
  const slug = (f.str(form, "slug", 120) || slugify(name)).toLowerCase();
  if (!name) throw new AppError("Name is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new AppError("Slug may only contain lowercase letters, numbers and hyphens.");
  const [dupe] = await db.select({ id: s.collections.id }).from(s.collections).where(eq(s.collections.slug, slug));
  if (dupe && dupe.id !== id) throw new AppError("Another collection uses this slug.");
  const occasion = f.opt(form, "occasion");
  const row = {
    name, slug, eyebrow: f.str(form, "eyebrow", 120), headline: f.str(form, "headline", 240) || name, description: f.str(form, "description", 4000),
    occasion: occasion && ["workwear", "everyday", "evening", "festive"].includes(occasion) ? occasion : null, heroId: f.opt(form, "heroId"),
    featured: f.bool(form, "featured"), seasonal: f.bool(form, "seasonal"), status: (f.str(form, "status") === "published" ? "published" : "draft") as "published" | "draft",
    startsAt: f.date(form, "startsAt"), endsAt: f.date(form, "endsAt"), sortOrder: f.int(form, "sortOrder") ?? 0, seoTitle: f.opt(form, "seoTitle", 160), seoDescription: f.opt(form, "seoDescription", 320),
  };
  const cid = id ?? newId("col");
  await db.transaction(async (tx) => {
    if (id) await tx.update(s.collections).set(row).where(eq(s.collections.id, id));
    else await tx.insert(s.collections).values({ id: cid, ...row });
    if (form.has("productsSubmitted")) {
      const ids = f.list(form, "productIds");
      await tx.delete(s.productCollections).where(eq(s.productCollections.collectionId, cid));
      if (ids.length) await tx.insert(s.productCollections).values(ids.map((productId, i) => ({ productId, collectionId: cid, sortOrder: i })));
    }
  });
  await audit(staffActor(staff), id ? "collection.updated" : "collection.created", "collection", cid, `${id ? "Updated" : "Created"} collection ${name}`);
  invalidate("catalog");
  if (!id) redirect(`/admin/collections/${cid}`);
  return "Collection saved.";
});

export const deleteCollectionAction = studioAction("categories.manage", async (staff, form) => {
  const id = f.str(form, "id");
  const [row] = await db.select().from(s.collections).where(eq(s.collections.id, id));
  await db.delete(s.collections).where(eq(s.collections.id, id));
  await audit(staffActor(staff), "collection.deleted", "collection", id, `Deleted collection ${row?.name}`);
  invalidate("catalog", "content");
  redirect("/admin/collections");
});

/* ─────────────── Media library ─────────────── */

export const updateMediaAction = studioAction("media.upload", async (staff, form) => {
  const id = f.str(form, "id");
  const file = form.get("file");
  if (file instanceof File && file.size > 0) await cat.replaceMediaFile(staff, id, file);
  await db.update(s.mediaAssets).set({ alt: f.str(form, "alt", 300), folder: f.str(form, "folder", 32) || "editorial" }).where(eq(s.mediaAssets.id, id));
  await audit(staffActor(staff), "media.updated", "media", id, "Updated image details");
  invalidate("catalog", "content");
  return "Image saved.";
});

export const deleteMediaAction = studioAction("media.delete", async (staff, form) => {
  await cat.deleteMedia(staff, f.str(form, "id"));
  invalidate("content");
  return "Image deleted.";
});
