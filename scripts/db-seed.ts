/**
 * Seeds the database. Safe by design:
 *  - Reference data (currencies, markets, shipping, tax, payment methods, roles & permissions,
 *    attributes, email templates, policies, navigation) is INSERT-IF-MISSING: existing rows that staff
 *    have edited are never overwritten.
 *  - The initial catalogue (17 products, categories, collections, sample photography, homepage) is
 *    imported only when the products table is empty.
 *  - No orders, customers or analytics are ever fabricated.
 *
 *   npm run db:seed                  reference data + initial catalogue (if empty)
 *   npm run db:seed -- --reference   reference data only (production-safe)
 *   SEED_OWNER_EMAIL=… SEED_OWNER_PASSWORD=… npm run db:seed   also creates the first Super Admin
 */
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/server/db";
import * as s from "../src/server/db/schema";
import { ALL_PERMISSIONS, DEFAULT_ROLES, PERMISSION_CATALOGUE, type Resource } from "../src/server/auth/permissions";
import { hashPassword, passwordProblem } from "../src/server/auth/password";
import { TEMPLATE_DEFAULTS } from "../src/server/email/templates";
import { DEFAULT_SETTINGS } from "../src/server/settings";
import { categoryData, collectionData, productData } from "../src/data/catalog";
import { campaign, shoots } from "../src/data/photography";
import { countryData, currencyData, marketData, shippingData, taxData } from "../src/data/markets";
import { discountData, homepageData } from "../src/data/operations";
import { faqs, policies } from "../src/content/policies";
import type { ProductImage } from "../src/types";

try { process.loadEnvFile(".env"); } catch { /* host env */ }

const args = new Set(process.argv.slice(2));
const referenceOnly = args.has("--reference");
const db = getDb();
const log = (m: string) => console.log(`  ${m}`);

/** INSERT IGNORE: keeps any row that already exists (by primary/unique key). */
async function insertMissing<T extends Parameters<typeof db.insert>[0]>(table: T, rows: (typeof table.$inferInsert)[]) {
  if (!rows.length) return 0;
  const r = await db.insert(table).ignore().values(rows as never);
  return (r as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
const familyOf = (name: string) => name.replace(/\s+II$/, "");

async function seedReference() {
  console.log("Reference data");
  const rates: Record<string, number> = { PKR: 1_000_000, USD: 3_600, GBP: 2_800, EUR: 3_300 };
  const names: Record<string, string> = { PKR: "Pakistani rupee", USD: "US dollar", GBP: "Pound sterling", EUR: "Euro" };
  log(`currencies +${await insertMissing(s.currencies, currencyData.map((c, i) => ({ code: c.code, name: names[c.code], symbol: c.symbol, locale: c.locale, minorDigits: 2, displayDecimals: c.displayFractionDigits, rateFromPkrMicros: rates[c.code], sortOrder: i })))}`);
  log(`markets +${await insertMissing(s.markets, marketData.map((m, i) => ({ id: m.id, name: m.name, currency: m.currency, defaultCountry: m.defaultCountry, zone: m.zone, active: m.active, sortOrder: i })))}`);
  log(`countries +${await insertMissing(s.countries, countryData.map((c) => ({ code: c.code, name: c.name, marketId: c.marketId, addressFormat: c.addressFormat, phonePrefix: c.phonePrefix })))}`);
  log(`tax rules +${await insertMissing(s.taxSettings, taxData.map((t) => ({ id: t.id, countryCode: t.countryCode, label: t.label, rateBps: Math.round(t.rate * 10_000), inclusive: t.inclusive, dutiesOnDelivery: !!t.dutiesCollectedOnDelivery })))}`);

  const zoneLabels: Record<string, string> = { pk: "Pakistan", gb: "United Kingdom", eu: "European Union", us: "United States", intl: "Rest of world" };
  log(`shipping zones +${await insertMissing(s.shippingZones, marketData.map((m, i) => ({ id: `zone-${m.id}`, name: zoneLabels[m.id] ?? m.name, marketId: m.id, countries: m.countries, cities: [], sortOrder: i })))}`);
  log(`shipping methods +${await insertMissing(s.shippingMethods, shippingData.map((m, i) => ({
    id: m.id, zoneId: `zone-${m.marketId}`, label: m.label, description: m.description, carrier: m.marketId === "pk" ? "TCS / Leopards" : "DHL Express",
    currency: marketData.find((x) => x.id === m.marketId)!.currency, rate: m.rate, freeOver: m.freeOver, codAvailable: m.marketId === "pk",
    minDays: m.estimatedDays[0], maxDays: m.estimatedDays[1], cities: m.id === "pk-express" ? ["Karachi", "Lahore", "Islamabad", "Rawalpindi"] : [], sortOrder: i,
    trackingUrlTemplate: m.marketId === "pk" ? null : "https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id={tracking}",
  })))}`);

  const intl = ["gb", "eu", "us", "intl"];
  log(`payment methods +${await insertMissing(s.paymentMethods, [
    { id: "cod", provider: "cod", kind: "cod", label: "Cash on delivery", description: "Pay the courier in cash when your order arrives.", marketIds: ["pk"], mode: "live", enabled: true, limits: { PKR: 300_000_00 }, sortOrder: 1 },
    { id: "safepay_card", provider: "safepay", kind: "online", label: "Debit or credit card", description: "Visa, Mastercard and UnionPay on Safepay's secure page.", marketIds: ["pk"], mode: "test", enabled: false, limits: {}, sortOrder: 2 },
    { id: "stripe_card", provider: "stripe", kind: "online", label: "Debit or credit card", description: "Visa, Mastercard, Amex, Apple Pay and Google Pay on a secure payment page.", marketIds: intl, mode: "test", enabled: false, limits: {}, sortOrder: 3 },
    { id: "test_card", provider: "test", kind: "online", label: "Card (test gateway)", description: "Development only — no real payment is taken.", marketIds: ["pk", ...intl], mode: "test", enabled: true, limits: {}, sortOrder: 9 },
  ])}`);

  log(`permissions +${await insertMissing(s.permissions, ALL_PERMISSIONS.map((p) => {
    const [resource, action] = p.split(".");
    return { key: p, resource, action, description: `${PERMISSION_CATALOGUE[resource as Resource].label}: ${action.replace(/_/g, " ")}` };
  }))}`);
  const newRoles = await insertMissing(s.roles, DEFAULT_ROLES.map((r) => ({ id: `role-${r.key}`, key: r.key, name: r.name, description: r.description, isSystem: true })));
  log(`roles +${newRoles}`);
  // Role permissions are only filled for roles that have none yet (staff edits are kept).
  for (const r of DEFAULT_ROLES) {
    const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(s.rolePermissions).where(eq(s.rolePermissions.roleId, `role-${r.key}`));
    if (Number(n) === 0) await insertMissing(s.rolePermissions, r.permissions.map((p) => ({ roleId: `role-${r.key}`, permissionKey: p })));
  }
  // New permissions introduced by an update are granted to Super Admin automatically.
  await insertMissing(s.rolePermissions, ALL_PERMISSIONS.map((p) => ({ roleId: "role-super_admin", permissionKey: p })));

  await insertMissing(s.productAttributes, [{ id: "attr-colour", code: "colour", name: "Colour", sortOrder: 1 }, { id: "attr-size", code: "size", name: "Size", sortOrder: 2 }]);
  await insertMissing(s.productAttributeValues, SIZE_ORDER.map((v, i) => ({ id: `size-${v.toLowerCase()}`, attributeId: "attr-size", value: v, label: v, sortOrder: i })));
  log(`email templates +${await insertMissing(s.notificationTemplates, TEMPLATE_DEFAULTS.map((t) => ({ key: t.key, name: t.name, subject: t.subject, body: t.body })))}`);
  log(`policies +${await insertMissing(s.policyPages, [...policies.map((p) => ({ slug: p.slug, title: p.title, intro: p.intro, sections: p.sections })), { slug: "faqs", title: "Frequently asked questions", intro: "", sections: faqs.map((f) => ({ heading: f.q, body: [f.a] })) }])}`);
  await insertMissing(s.sizeGuides, [{
    id: "sg-womens", name: "Women's clothing", notes: "Body measurements in centimetres. Between sizes? Choose the larger size for tailoring and the smaller for relaxed knitwear. Festive sets are made to order — our atelier confirms measurements after purchase.",
    rows: [["XS", "6", "34", "2", "80", "62", "88"], ["S", "8", "36", "4", "84", "66", "92"], ["M", "10", "38", "6", "88", "70", "96"], ["L", "12", "40", "8", "93", "75", "101"], ["XL", "14", "42", "10", "98", "80", "106"], ["XXL", "16", "44", "12", "104", "86", "112"]]
      .map(([size, uk, eu, us, bust, waist, hip]) => ({ size, uk, eu, us, bust, waist, hip })),
  }]);

  const menus = [
    { id: "menu-header", key: "header", name: "Header navigation" },
    { id: "menu-footer-shop", key: "footer-shop", name: "Footer · Shop" },
    { id: "menu-footer-care", key: "footer-care", name: "Footer · Client care" },
    { id: "menu-footer-house", key: "footer-house", name: "Footer · The house" },
  ];
  if ((await insertMissing(s.navigationMenus, menus)) > 0) {
    const item = (menuId: string, label: string, href: string, i: number, panel = "none") => ({ id: `nav-${menuId.slice(5)}-${i}`, menuId, label, href, panel, sortOrder: i });
    await insertMissing(s.navigationItems, [
      item("menu-header", "New in", "/new-arrivals", 0), item("menu-header", "Shop women", "/shop", 1, "shop"), item("menu-header", "Workwear", "/workwear", 2, "occasion:workwear"),
      item("menu-header", "Festive", "/festive", 3, "occasion:festive"), item("menu-header", "Collections", "/collections/autumn-winter-2026", 4, "collections"),
      item("menu-footer-shop", "New arrivals", "/new-arrivals", 0), item("menu-footer-shop", "All clothing", "/shop", 1), item("menu-footer-shop", "Workwear", "/workwear", 2), item("menu-footer-shop", "Festive & occasion", "/festive", 3), item("menu-footer-shop", "Bestsellers", "/shop?sort=bestselling", 4),
      item("menu-footer-care", "Customer care", "/customer-care", 0), item("menu-footer-care", "Track your order", "/track-order", 1), item("menu-footer-care", "Delivery", "/legal/shipping", 2), item("menu-footer-care", "Returns & exchanges", "/legal/returns", 3), item("menu-footer-care", "Contact us", "/customer-care#contact", 4),
      item("menu-footer-house", "Our story", "/our-story", 0), item("menu-footer-house", "The atelier", "/our-story#craft", 1), item("menu-footer-house", "Privacy policy", "/legal/privacy", 2), item("menu-footer-house", "Terms & conditions", "/legal/terms", 3),
    ]);
  }
  await insertMissing(s.storeSettings, Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })));
  await insertMissing(s.sequences, [{ name: "order", value: 10_000 }, { name: "return", value: 0 }]);
}

async function seedCatalogue() {
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(s.products);
  if (Number(n) > 0) { console.log("Catalogue: products already exist — skipped (never overwritten)."); return; }
  console.log("Initial catalogue");

  const media = new Map<string, ProductImage & { folder: string }>();
  const add = (img: ProductImage | undefined, folder: string) => { if (img?.src && !media.has(img.id)) media.set(img.id, { ...img, folder }); };
  Object.values(shoots).flat().forEach((i) => add(i, "products"));
  Object.values(campaign).forEach((i) => add(i, "campaigns"));
  collectionData.forEach((c) => add(c.hero, "editorial"));
  categoryData.forEach((c) => add(c.image, "editorial"));
  log(`media +${await insertMissing(s.mediaAssets, [...media.values()].map((m) => ({
    id: m.id, driver: "remote" as const, url: m.src!, filename: m.src!.split("/").pop()!.split("?")[0], mimeType: "image/jpeg", width: m.width ?? null, height: m.height ?? null,
    alt: m.alt, folder: m.folder, credit: m.credit ?? null,
  })))} (sample photography from Pexels — replace with brand photography)`);

  log(`categories +${await insertMissing(s.categories, categoryData.map((c) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description, sortOrder: c.sortOrder, imageId: c.image?.id ?? null })))}`);
  log(`collections +${await insertMissing(s.collections, collectionData.map((c) => ({
    id: c.id, slug: c.slug, name: c.name, eyebrow: c.eyebrow, headline: c.headline, description: c.description, occasion: c.occasionId ?? null, heroId: c.hero.id,
    featured: c.featured, seasonal: !c.occasionId, status: c.status, sortOrder: c.sortOrder, seoTitle: c.seo?.title ?? null, seoDescription: c.seo?.description ?? null,
  })))}`);

  const colours = new Map<string, { label: string; hex: string; family: string }>();
  productData.forEach((p) => p.colours.forEach((c) => colours.set(c.name, { label: c.name, hex: c.hex, family: familyOf(c.name) })));
  const colourId = (name: string) => `colour-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  await insertMissing(s.productAttributeValues, [...colours.values()].map((c, i) => ({ id: colourId(c.label), attributeId: "attr-colour", value: c.label, label: c.label, hex: c.hex, family: c.family, sortOrder: i })));

  const bySlug = new Map(productData.map((p) => [p.slug, p.id]));
  for (const p of productData) {
    await db.transaction(async (tx) => {
      await tx.insert(s.products).values({
        id: p.id, slug: p.slug, sku: `NS-${p.id.slice(4)}`, name: p.name, subtitle: p.subtitle, shortDescription: p.subtitle, description: p.description, categoryId: p.categoryId,
        sizeGuideId: "sg-womens", fabric: p.fabric, care: p.care, details: p.details, fit: p.fit ?? null, tags: p.tags, occasions: p.occasionIds,
        status: "active", isNew: p.isNew, isBestseller: (p.stats?.unitsSold30d ?? 0) >= 110, createdAt: new Date(p.createdAt),
      });
      await tx.insert(s.productPrices).values((Object.keys(p.prices) as (keyof typeof p.prices)[]).map((c) => ({ productId: p.id, currency: c, price: p.prices[c], compareAtPrice: p.compareAtPrices?.[c] ?? null })));
      for (const [ci, c] of p.colours.entries()) {
        for (const [i, img] of c.images.entries()) await tx.insert(s.productImages).values({ id: `pim-${p.id}-${ci}-${i}`, productId: p.id, mediaId: img.id, colourValueId: colourId(c.name), sortOrder: i });
      }
      for (const [i, v] of p.variants.entries()) {
        const colour = p.colours.find((c) => c.id === v.colourId)!;
        const vid = `var-${p.id.slice(4)}-${colourId(colour.name).slice(7)}-${v.size.toLowerCase()}`;
        await tx.insert(s.productVariants).values({ id: vid, productId: p.id, sku: v.sku, colourValueId: colourId(colour.name), sizeValueId: `size-${v.size.toLowerCase()}`, sortOrder: i, costPrice: Math.round(p.prices.PKR * 0.38) });
        await tx.insert(s.inventory).values({ variantId: vid, onHand: v.stock, reserved: 0 });
        if (v.stock > 0) await tx.insert(s.inventoryMovements).values({ id: `mov-seed-${vid}`, variantId: vid, type: "receipt", quantity: v.stock, onHandAfter: v.stock, note: "Opening stock (initial import)" });
      }
      if (p.collectionIds.length) await tx.insert(s.productCollections).values(p.collectionIds.map((cid, i) => ({ productId: p.id, collectionId: cid, sortOrder: i })));
      // Occasion collections hold their products too, so collection pages and coupons can target them.
      const occ = p.occasionIds.map((o) => `col-${o}`).filter((cid) => collectionData.some((c) => c.id === cid) && !p.collectionIds.includes(cid));
      if (occ.length) await tx.insert(s.productCollections).values(occ.map((cid, i) => ({ productId: p.id, collectionId: cid, sortOrder: 10 + i })));
    });
  }
  for (const p of productData) {
    const look = (p.completeTheLook ?? []).map((sl) => bySlug.get(sl)).filter((x): x is string => !!x && x !== p.id);
    if (look.length) await db.insert(s.relatedProducts).values(look.map((rid, i) => ({ productId: p.id, relatedId: rid, kind: "look" as const, sortOrder: i })));
  }
  log(`products +${productData.length} with ${productData.reduce((a, p) => a + p.variants.length, 0)} variants and opening stock`);

  log(`coupons +${await insertMissing(s.coupons, discountData.map((d) => ({
    id: d.id, code: d.code, description: d.description, type: d.type, percentBps: d.type === "percentage" ? (d.value as number) * 100 : 0,
    fixedAmounts: d.type === "fixed" ? (d.value as Record<string, number>) : {}, minimumSubtotals: (d.minimumSubtotal ?? {}) as Record<string, number>, maximumDiscounts: {},
    marketIds: d.marketIds === "all" ? [] : d.marketIds, appliesTo: "all" as const, productIds: [], categoryIds: d.code === "JASHN15" ? ["cat-festive"] : [],
    firstOrderOnly: d.code === "WELCOME10", perCustomerLimit: d.code === "WELCOME10" ? 1 : null, usageLimit: d.usageLimit, usageCount: 0,
    startsAt: new Date(d.startsAt), endsAt: d.endsAt ? new Date(d.endsAt) : null, active: d.active,
  })).map((c) => (c.code === "JASHN15" ? { ...c, appliesTo: "categories" as const } : c)))} (usage counts start at 0)`);

  // Homepage sections (draft) + first publication.
  const h = homepageData;
  type Sec = typeof s.homepageSections.$inferInsert;
  const sec = (i: number, type: string, name: string, x: Partial<Sec>): Sec => ({ id: `hs-${i}-${type}`, type, name, sortOrder: i, body: "", settings: {}, ...x });
  const sections: Sec[] = [
    sec(0, "hero", "Hero campaign", { eyebrow: h.hero.eyebrow, heading: h.hero.headline, body: h.hero.body, primaryLabel: h.hero.primaryCta.label, primaryHref: h.hero.primaryCta.href, secondaryLabel: h.hero.secondaryCta.label, secondaryHref: h.hero.secondaryCta.href, imageId: h.hero.imageId, mobileImageId: h.hero.mobileImageId }),
    sec(1, "products", "New arrivals", { eyebrow: h.newArrivals.eyebrow, heading: h.newArrivals.title, primaryLabel: "Shop all new arrivals", primaryHref: "/new-arrivals", settings: { source: "new", limit: h.newArrivals.limit, layout: "grid" } }),
    sec(2, "category_cards", "Featured categories", { eyebrow: "Shop by", heading: "Dress for the *occasion*" }),
    sec(3, "campaign", "Seasonal campaign", { eyebrow: h.campaign.eyebrow, heading: h.campaign.headline, body: h.campaign.body, primaryLabel: h.campaign.cta.label, primaryHref: h.campaign.cta.href, imageId: h.campaign.imageIds[0] }),
    sec(4, "products", "Bestsellers", { eyebrow: h.bestsellers.eyebrow, heading: h.bestsellers.title, primaryLabel: "Shop bestsellers", primaryHref: "/shop?sort=bestselling", settings: { source: "bestsellers", limit: h.bestsellers.limit, layout: "rail" } }),
    sec(5, "statement", "Brand statement", { eyebrow: h.statement.eyebrow, body: h.statement.text }),
    sec(6, "editorial", "Editorial — The art of dressing", { eyebrow: h.editorial.eyebrow, heading: h.editorial.headline, body: h.editorial.body, primaryLabel: h.editorial.cta.label, primaryHref: h.editorial.cta.href }),
    sec(7, "details", "In the details", { eyebrow: h.details.eyebrow, heading: h.details.headline }),
    sec(8, "collections", "Collection banners", { eyebrow: "Collections", heading: "Explore the *house*" }),
    sec(9, "story", "Our story", { eyebrow: h.story.eyebrow, heading: h.story.headline, body: h.story.body, primaryLabel: "Read our story", primaryHref: "/our-story", imageId: h.story.imageId }),
    sec(10, "quote", "Client quote", { body: h.quote.text, eyebrow: h.quote.attribution }),
    sec(11, "newsletter", "Newsletter", { eyebrow: "The letter", heading: "Be the first to *know*", body: "New collections, private events and the occasional note from the atelier. No more than twice a month." }),
  ];
  await insertMissing(s.homepageSections, sections);
  const items: (typeof s.homepageSectionItems.$inferInsert)[] = [
    ...h.categoryCards.map((c, i) => ({ id: `hsi-cards-${i}`, sectionId: "hs-2-category_cards", sortOrder: i, title: c.title, body: "", href: c.href, imageId: c.imageId })),
    ...h.campaign.imageIds.slice(1).map((id, i) => ({ id: `hsi-camp-${i}`, sectionId: "hs-3-campaign", sortOrder: i, title: "", body: "", imageId: id })),
    ...h.editorial.imageIds.map((id, i) => ({ id: `hsi-edit-${i}`, sectionId: "hs-6-editorial", sortOrder: i, title: "", body: "", imageId: id })),
    ...h.details.items.map((d, i) => ({ id: `hsi-det-${i}`, sectionId: "hs-7-details", sortOrder: i, title: d.title, body: d.body, imageId: d.imageId })),
    ...h.featuredCollectionIds.map((cid, i) => ({ id: `hsi-col-${i}`, sectionId: "hs-8-collections", sortOrder: i, title: "", body: "", collectionId: cid })),
  ];
  await insertMissing(s.homepageSectionItems, items);
  log(`homepage sections +${sections.length} (publish from Studio → Homepage, or automatically below)`);
}

async function seedOwner() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!email) return;
  const [existing] = await db.select({ id: s.staffUsers.id }).from(s.staffUsers).where(eq(s.staffUsers.email, email));
  if (existing) { console.log(`Owner ${email} already exists — unchanged.`); return; }
  if (!password) throw new Error("SEED_OWNER_PASSWORD is required with SEED_OWNER_EMAIL");
  const problem = passwordProblem(password, email);
  if (problem) throw new Error(`SEED_OWNER_PASSWORD: ${problem}`);
  const id = `stf_owner_${Date.now().toString(36)}`;
  await db.insert(s.staffUsers).values({ id, email, name: process.env.SEED_OWNER_NAME ?? "Store owner", passwordHash: await hashPassword(password), status: "active", isSuperAdmin: true });
  await db.insert(s.staffRoleAssignments).values({ staffUserId: id, roleId: "role-super_admin" });
  console.log(`Super Admin created: ${email}`);
}

async function main() {
  await seedReference();
  if (!referenceOnly) {
    await seedCatalogue();
    const { publishHomepage } = await import("../src/server/cms/homepage");
    const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(s.homepagePublications);
    if (Number(n) === 0) { await publishHomepage(null); log("homepage published"); }
  }
  await seedOwner();
  console.log("✓ Seed complete");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(closeDb);
