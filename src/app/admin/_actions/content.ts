"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { audit } from "@/server/audit";
import { staffActor } from "@/server/auth/session";
import { f, invalidate, studioAction } from "@/server/admin/guard";
import { publishHomepage, SECTION_TYPES, type SectionType } from "@/server/cms/homepage";
import { AppError, newId } from "@/server/lib/core";

const href = (v: string | null) => {
  if (!v) return null;
  if (!/^(\/(?!\/)|https:\/\/)/.test(v)) throw new AppError(`Links must start with / or https:// (“${v}”).`);
  return v.slice(0, 300);
};

/* ─────────────── Homepage sections ─────────────── */

export const addSectionAction = studioAction("content.edit", async (staff, form) => {
  const type = f.str(form, "type") as SectionType;
  if (!(type in SECTION_TYPES)) throw new AppError("Choose a section type.");
  const [{ max }] = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` }).from(s.homepageSections);
  const id = newId("hs");
  await db.insert(s.homepageSections).values({ id, type, name: f.str(form, "name", 120) || SECTION_TYPES[type].label, sortOrder: Number(max) + 1, body: "", enabled: false, settings: type === "products" ? { source: "new", limit: 8, layout: "grid" } : {}, updatedBy: staff.id });
  await audit(staffActor(staff), "homepage.section_added", "homepage", id, `Added ${SECTION_TYPES[type].label} section (draft, hidden)`);
  return "Section added (hidden until you enable it and publish).";
});

export const saveSectionAction = studioAction("content.edit", async (staff, form) => {
  const id = f.str(form, "id");
  const [sec] = await db.select().from(s.homepageSections).where(eq(s.homepageSections.id, id));
  if (!sec) throw new AppError("Section not found.");
  const pl = f.opt(form, "primaryLabel", 80), ph = href(f.opt(form, "primaryHref", 300));
  const sl = f.opt(form, "secondaryLabel", 80), sh = href(f.opt(form, "secondaryHref", 300));
  if ((pl && !ph) || (!pl && ph) || (sl && !sh) || (!sl && sh)) throw new AppError("Buttons need both a label and a link.");
  const settings = { ...(sec.settings ?? {}) } as Record<string, unknown>;
  if (sec.type === "products") {
    const source = f.str(form, "source");
    settings.source = ["new", "bestsellers", "featured", "collection", "manual"].includes(source) ? source : "new";
    settings.limit = Math.min(24, Math.max(1, f.int(form, "limit") ?? 8));
    settings.layout = f.str(form, "layout") === "rail" ? "rail" : "grid";
    settings.collectionId = f.opt(form, "collectionId");
    settings.productIds = f.list(form, "productIds").slice(0, 24);
  }
  await db.update(s.homepageSections).set({
    name: f.str(form, "name", 120) || sec.name, enabled: f.bool(form, "enabled"), eyebrow: f.str(form, "eyebrow", 160), heading: f.str(form, "heading", 300), body: f.str(form, "body", 4000),
    primaryLabel: pl, primaryHref: ph, secondaryLabel: sl, secondaryHref: sh, imageId: f.opt(form, "imageId"), mobileImageId: f.opt(form, "mobileImageId"), settings, updatedBy: staff.id,
  }).where(eq(s.homepageSections.id, id));
  await audit(staffActor(staff), "homepage.section_updated", "homepage", id, `Edited section “${sec.name}” (draft)`);
  return "Draft saved. Preview, then publish to update the live homepage.";
});

export const sectionOpAction = studioAction("content.edit", async (staff, form) => {
  const id = f.str(form, "id"), op = f.str(form, "op");
  const all = await db.select().from(s.homepageSections).orderBy(asc(s.homepageSections.sortOrder));
  const i = all.findIndex((x) => x.id === id);
  if (i < 0) throw new AppError("Section not found.");
  if (op === "up" || op === "down") {
    const j = op === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return "Already at the edge.";
    [all[i], all[j]] = [all[j], all[i]];
    await db.transaction(async (tx) => { for (const [k, x] of all.entries()) await tx.update(s.homepageSections).set({ sortOrder: k }).where(eq(s.homepageSections.id, x.id)); });
  } else if (op === "toggle") {
    await db.update(s.homepageSections).set({ enabled: !all[i].enabled }).where(eq(s.homepageSections.id, id));
  } else if (op === "delete") {
    await db.delete(s.homepageSections).where(eq(s.homepageSections.id, id));
  }
  await audit(staffActor(staff), `homepage.section_${op}`, "homepage", id, `${op} section “${all[i]?.name}” (draft)`);
  return op === "delete" ? "Section deleted from the draft." : "Draft updated.";
});

export const saveItemAction = studioAction("content.edit", async (staff, form) => {
  const sectionId = f.str(form, "sectionId");
  const id = f.opt(form, "id");
  const row = { title: f.str(form, "title", 200), body: f.str(form, "body", 2000), href: href(f.opt(form, "href", 300)), imageId: f.opt(form, "imageId"), productId: f.opt(form, "productId"), collectionId: f.opt(form, "collectionId") };
  if (id) await db.update(s.homepageSectionItems).set(row).where(and(eq(s.homepageSectionItems.id, id), eq(s.homepageSectionItems.sectionId, sectionId)));
  else {
    const [{ max }] = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` }).from(s.homepageSectionItems).where(eq(s.homepageSectionItems.sectionId, sectionId));
    await db.insert(s.homepageSectionItems).values({ id: newId("hsi"), sectionId, sortOrder: Number(max) + 1, ...row });
  }
  await audit(staffActor(staff), "homepage.item_saved", "homepage", sectionId, "Edited section item (draft)");
  return "Item saved to the draft.";
});

export const itemOpAction = studioAction("content.edit", async (staff, form) => {
  const id = f.str(form, "id"), op = f.str(form, "op"), sectionId = f.str(form, "sectionId");
  const items = await db.select().from(s.homepageSectionItems).where(eq(s.homepageSectionItems.sectionId, sectionId)).orderBy(asc(s.homepageSectionItems.sortOrder));
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) throw new AppError("Item not found.");
  if (op === "delete") await db.delete(s.homepageSectionItems).where(eq(s.homepageSectionItems.id, id));
  else {
    const j = op === "up" ? i - 1 : i + 1;
    if (j >= 0 && j < items.length) {
      [items[i], items[j]] = [items[j], items[i]];
      for (const [k, x] of items.entries()) await db.update(s.homepageSectionItems).set({ sortOrder: k }).where(eq(s.homepageSectionItems.id, x.id));
    }
  }
  await audit(staffActor(staff), `homepage.item_${op}`, "homepage", sectionId, `Item ${op} (draft)`);
  return "Draft updated.";
});

export const publishHomepageAction = studioAction("content.publish", async (staff) => {
  const snap = await publishHomepage(staff.id);
  await audit(staffActor(staff), "homepage.published", "homepage", null, `Published homepage (${snap.sections.length} sections)`);
  invalidate("content");
  return "Homepage published — the live site now shows this version.";
});

/* ─────────────── Policies, FAQs, navigation ─────────────── */

export const savePolicyAction = studioAction("content.publish", async (staff, form) => {
  const slug = f.str(form, "slug");
  const headings = f.list(form, "heading");
  const bodies = form.getAll("sectionBody").map(String);
  const sections = headings.map((heading, i) => ({ heading: heading.slice(0, 200), body: (bodies[i] ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) })).filter((x) => x.heading && x.body.length);
  if (!sections.length) throw new AppError("Add at least one section with a heading and text.");
  const extraHeading = f.str(form, "newHeading", 200), extraBody = f.str(form, "newBody", 8000);
  if (extraHeading && extraBody) sections.push({ heading: extraHeading, body: extraBody.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) });
  await db.update(s.policyPages).set({ title: f.str(form, "title", 200), intro: f.str(form, "intro", 500), sections, updatedBy: staff.id }).where(eq(s.policyPages.slug, slug));
  await audit(staffActor(staff), "content.policy_updated", "policy", slug, `Updated ${slug} page`);
  invalidate("content");
  return "Page published.";
});

export const saveNavigationAction = studioAction("content.publish", async (staff, form) => {
  const menuId = f.str(form, "menuId");
  const ids = f.list(form, "itemId");
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      const label = f.str(form, `label_${id}`, 80), link = f.str(form, `href_${id}`, 300);
      if (f.bool(form, `delete_${id}`) || (!label && !link)) { await tx.delete(s.navigationItems).where(and(eq(s.navigationItems.id, id), eq(s.navigationItems.menuId, menuId))); continue; }
      await tx.update(s.navigationItems).set({ label, href: href(link)!, sortOrder: f.int(form, `sort_${id}`) ?? i, enabled: f.bool(form, `enabled_${id}`), panel: f.str(form, `panel_${id}`) || "none" }).where(and(eq(s.navigationItems.id, id), eq(s.navigationItems.menuId, menuId)));
    }
    const nl = f.str(form, "newLabel", 80), nh = f.str(form, "newHref", 300);
    if (nl && nh) await tx.insert(s.navigationItems).values({ id: newId("nav"), menuId, label: nl, href: href(nh)!, panel: f.str(form, "newPanel") || "none", sortOrder: 99 });
  });
  await audit(staffActor(staff), "content.navigation_updated", "navigation", menuId, "Updated navigation");
  invalidate("content");
  return "Navigation published.";
});
