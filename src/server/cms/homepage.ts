import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import * as s from "../db/schema";
import { newId } from "../lib/core";

/**
 * Homepage CMS. Staff edit DRAFT sections (homepage_sections + homepage_section_items); "Publish"
 * writes an immutable snapshot to homepage_publications, which is what the storefront renders.
 * Images are stored as media ids and resolved at render time, so alt-text edits apply everywhere.
 */

export const SECTION_TYPES = {
  hero: { label: "Hero campaign", items: false, help: "Full-width campaign image (desktop + mobile), heading, text and two buttons." },
  products: { label: "Product rail / grid", items: false, help: "New arrivals, bestsellers, featured, a collection or hand-picked products." },
  category_cards: { label: "Featured categories", items: true, help: "Image cards linking to categories, occasions or collections." },
  campaign: { label: "Seasonal campaign", items: true, help: "Large image with text; extra items add supporting images." },
  statement: { label: "Brand statement", items: false, help: "A single line of large serif text. Wrap words in *asterisks* for italics." },
  editorial: { label: "Editorial composition", items: true, help: "Asymmetric layout with up to four images, heading, text and a button." },
  details: { label: "Details / promotional tiles", items: true, help: "Three to four image tiles with a title and short text." },
  collections: { label: "Collection banners", items: true, help: "Banners for selected collections (items pick the collection)." },
  story: { label: "Story", items: false, help: "Image with heading, text and a link to Our story." },
  quote: { label: "Quote", items: false, help: "Short customer or press quote. Eyebrow is the attribution." },
  newsletter: { label: "Newsletter sign-up", items: false, help: "Newsletter heading, text and the sign-up form." },
  promo: { label: "Promotional banner", items: false, help: "A full-width promotional message with a button and optional image." },
} as const;

export type SectionType = keyof typeof SECTION_TYPES;

export interface SectionItemData { id: string; title: string; body: string; href: string | null; imageId: string | null; productId: string | null; collectionId: string | null }
export interface SectionData {
  id: string; type: SectionType; name: string; enabled: boolean;
  eyebrow: string; heading: string; body: string;
  primary: { label: string; href: string } | null; secondary: { label: string; href: string } | null;
  imageId: string | null; mobileImageId: string | null;
  settings: { source?: "new" | "bestsellers" | "featured" | "collection" | "manual"; limit?: number; layout?: "grid" | "rail"; collectionId?: string; productIds?: string[] } & Record<string, unknown>;
  items: SectionItemData[];
}

export interface HomepageSnapshot { version: 1; publishedAt: string; sections: SectionData[] }

export async function loadDraftSections(): Promise<SectionData[]> {
  const [secs, items] = await Promise.all([
    db.select().from(s.homepageSections).orderBy(asc(s.homepageSections.sortOrder)),
    db.select().from(s.homepageSectionItems).orderBy(asc(s.homepageSectionItems.sortOrder)),
  ]);
  return secs.map((x) => ({
    id: x.id, type: x.type as SectionType, name: x.name, enabled: x.enabled, eyebrow: x.eyebrow, heading: x.heading, body: x.body,
    primary: x.primaryLabel && x.primaryHref ? { label: x.primaryLabel, href: x.primaryHref } : null,
    secondary: x.secondaryLabel && x.secondaryHref ? { label: x.secondaryLabel, href: x.secondaryHref } : null,
    imageId: x.imageId, mobileImageId: x.mobileImageId, settings: (x.settings ?? {}) as SectionData["settings"],
    items: items.filter((i) => i.sectionId === x.id).map((i) => ({ id: i.id, title: i.title, body: i.body, href: i.href, imageId: i.imageId, productId: i.productId, collectionId: i.collectionId })),
  }));
}

export async function publishHomepage(staffUserId: string | null) {
  const sections = (await loadDraftSections()).filter((x) => x.enabled);
  const snapshot: HomepageSnapshot = { version: 1, publishedAt: new Date().toISOString(), sections };
  await db.insert(s.homepagePublications).values({ id: newId("hpub"), snapshot, publishedBy: staffUserId });
  return snapshot;
}

export async function getPublishedHomepage(): Promise<HomepageSnapshot | null> {
  const [row] = await db.select().from(s.homepagePublications).orderBy(desc(s.homepagePublications.publishedAt)).limit(1);
  return (row?.snapshot as HomepageSnapshot) ?? null;
}

export async function listPublications(limit = 10) {
  return db.select({ id: s.homepagePublications.id, publishedAt: s.homepagePublications.publishedAt, publishedBy: s.homepagePublications.publishedBy })
    .from(s.homepagePublications).orderBy(desc(s.homepagePublications.publishedAt)).limit(limit);
}

/** True when the draft differs from the live snapshot (drives the "Unpublished changes" badge). */
export async function hasUnpublishedChanges() {
  const [draft, live] = await Promise.all([loadDraftSections(), getPublishedHomepage()]);
  return JSON.stringify(draft.filter((x) => x.enabled)) !== JSON.stringify(live?.sections ?? []);
}

export async function mediaIdsUsedByHomepage() {
  const draft = await loadDraftSections();
  return new Set(draft.flatMap((x) => [x.imageId, x.mobileImageId, ...x.items.map((i) => i.imageId)]).filter((x): x is string => !!x));
}

export async function sectionIdsExist(ids: string[]) {
  if (!ids.length) return [];
  return (await db.select({ id: s.homepageSections.id }).from(s.homepageSections).where(inArray(s.homepageSections.id, ids))).map((r) => r.id);
}

export async function getSectionRow(id: string) {
  const [row] = await db.select().from(s.homepageSections).where(eq(s.homepageSections.id, id));
  return row ?? null;
}
