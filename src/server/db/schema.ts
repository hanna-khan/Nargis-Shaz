/**
 * Nargis & Shaz — MySQL schema (Drizzle ORM).
 *
 * Conventions
 * - Primary keys are application-generated strings (varchar 64) so seeded catalogue ids stay stable.
 * - Money is ALWAYS an integer in minor units (paisa / pence / cents) with an explicit currency column.
 * - Every table has created_at / updated_at where rows change. Timestamps are UTC DATETIME(3).
 * - Historical records (orders, order items, payments, refunds) snapshot everything they show, and
 *   catalogue foreign keys from them use ON DELETE SET NULL so deleting a product never destroys history.
 */
import { sql } from "drizzle-orm";
import {
  boolean, char, datetime, index, int, json, mysqlTable, primaryKey, text, tinyint, uniqueIndex, varchar,
} from "drizzle-orm/mysql-core";

const id = (name = "id") => varchar(name, { length: 64 });
const ts = (name: string) => datetime(name, { mode: "date", fsp: 3 });
const created = () => ts("created_at").notNull().default(sql`CURRENT_TIMESTAMP(3)`);
const updated = () => ts("updated_at").notNull().default(sql`CURRENT_TIMESTAMP(3)`).$onUpdate(() => new Date());
const cur = (name = "currency") => char(name, { length: 3 });

/* ═════════════════════════════ Reference: currencies, markets, countries, tax ═════════════════════════════ */

export const currencies = mysqlTable("currencies", {
  code: cur("code").primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  symbol: varchar("symbol", { length: 8 }).notNull(),
  locale: varchar("locale", { length: 16 }).notNull(),
  minorDigits: tinyint("minor_digits").notNull().default(2),
  displayDecimals: tinyint("display_decimals").notNull().default(0),
  /** Fallback conversion only — catalogue prices are set explicitly per currency. Units per 1 PKR × 1e6. */
  rateFromPkrMicros: int("rate_from_pkr_micros").notNull().default(1_000_000),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  updatedAt: updated(),
});

export const markets = mysqlTable("markets", {
  id: id().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  currency: cur().notNull().references(() => currencies.code),
  defaultCountry: char("default_country", { length: 2 }).notNull(),
  zone: varchar("zone", { length: 16 }).notNull().$type<"domestic" | "international">(),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
});

export const countries = mysqlTable("countries", {
  code: char("code", { length: 2 }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  marketId: id("market_id").notNull().references(() => markets.id),
  addressFormat: varchar("address_format", { length: 8 }).notNull().$type<"pk" | "gb" | "us" | "eu" | "intl">(),
  phonePrefix: varchar("phone_prefix", { length: 8 }).notNull(),
  active: boolean("active").notNull().default(true),
}, (t) => [index("countries_market_idx").on(t.marketId)]);

export const taxSettings = mysqlTable("tax_settings", {
  id: id().primaryKey(),
  /** ISO country code or "*" for the fallback rule. */
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  label: varchar("label", { length: 40 }).notNull(),
  /** Basis points: 1800 = 18%. */
  rateBps: int("rate_bps").notNull().default(0),
  inclusive: boolean("inclusive").notNull().default(true),
  dutiesOnDelivery: boolean("duties_on_delivery").notNull().default(false),
  active: boolean("active").notNull().default(true),
  updatedAt: updated(),
}, (t) => [uniqueIndex("tax_country_uq").on(t.countryCode)]);

/* ═════════════════════════════ Shipping ═════════════════════════════ */

export const shippingZones = mysqlTable("shipping_zones", {
  id: id().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  marketId: id("market_id").notNull().references(() => markets.id),
  /** Country codes covered by this zone. */
  countries: json("countries").$type<string[]>().notNull(),
  /** Optional city allow-list (e.g. express only in Karachi/Lahore/Islamabad). Empty = all cities. */
  cities: json("cities").$type<string[]>().notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
});

export const shippingMethods = mysqlTable("shipping_methods", {
  id: id().primaryKey(),
  zoneId: id("zone_id").notNull().references(() => shippingZones.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 80 }).notNull(),
  description: varchar("description", { length: 200 }).notNull().default(""),
  carrier: varchar("carrier", { length: 60 }).notNull().default(""),
  currency: cur().notNull().references(() => currencies.code),
  rate: int("rate").notNull(),
  /** Subtotal at/above which delivery is free (minor units). NULL = never free. */
  freeOver: int("free_over"),
  codAvailable: boolean("cod_available").notNull().default(false),
  minDays: int("min_days").notNull().default(2),
  maxDays: int("max_days").notNull().default(5),
  /** Optional city restriction for this method (overrides zone cities when non-empty). */
  cities: json("cities").$type<string[]>().notNull(),
  trackingUrlTemplate: varchar("tracking_url_template", { length: 255 }),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("ship_zone_idx").on(t.zoneId)]);

/* ═════════════════════════════ Media ═════════════════════════════ */

export const mediaAssets = mysqlTable("media_assets", {
  id: id().primaryKey(),
  /** "remote" = external URL (sample photography), "local" = public/uploads in dev, "r2" = Cloudflare R2. */
  driver: varchar("driver", { length: 12 }).notNull().$type<"remote" | "local" | "r2">(),
  storageKey: varchar("storage_key", { length: 255 }),
  url: varchar("url", { length: 1024 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 64 }).notNull(),
  bytes: int("bytes").notNull().default(0),
  width: int("width"),
  height: int("height"),
  alt: varchar("alt", { length: 300 }).notNull().default(""),
  folder: varchar("folder", { length: 32 }).notNull().default("products"),
  checksum: char("checksum", { length: 64 }),
  credit: json("credit").$type<{ source: string; photographer: string; photographerUrl?: string; sourceUrl?: string; license: string } | null>(),
  uploadedBy: id("uploaded_by"),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: ts("deleted_at"),
}, (t) => [index("media_folder_idx").on(t.folder), index("media_created_idx").on(t.createdAt)]);

/* ═════════════════════════════ Catalogue ═════════════════════════════ */

export const categories = mysqlTable("categories", {
  id: id().primaryKey(),
  parentId: id("parent_id"),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  imageId: id("image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  bannerId: id("banner_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  sortOrder: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  seoTitle: varchar("seo_title", { length: 160 }),
  seoDescription: varchar("seo_description", { length: 320 }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("category_slug_uq").on(t.slug), index("category_parent_idx").on(t.parentId)]);

export const collections = mysqlTable("collections", {
  id: id().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  eyebrow: varchar("eyebrow", { length: 120 }).notNull().default(""),
  headline: varchar("headline", { length: 240 }).notNull().default(""),
  description: text("description").notNull(),
  /** workwear | everyday | evening | festive — drives the occasion landing pages. */
  occasion: varchar("occasion", { length: 16 }),
  heroId: id("hero_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  featured: boolean("featured").notNull().default(false),
  seasonal: boolean("seasonal").notNull().default(false),
  status: varchar("status", { length: 12 }).notNull().default("draft").$type<"published" | "draft">(),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  sortOrder: int("sort_order").notNull().default(0),
  seoTitle: varchar("seo_title", { length: 160 }),
  seoDescription: varchar("seo_description", { length: 320 }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("collection_slug_uq").on(t.slug)]);

export const sizeGuides = mysqlTable("size_guides", {
  id: id().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  /** Table rows: size → measurements (cm). */
  rows: json("rows").$type<{ size: string; bust: string; waist: string; hip: string; uk?: string; eu?: string; us?: string }[]>().notNull(),
  notes: text("notes"),
  updatedAt: updated(),
});

export const products = mysqlTable("products", {
  id: id().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 64 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  subtitle: varchar("subtitle", { length: 200 }).notNull().default(""),
  shortDescription: varchar("short_description", { length: 400 }).notNull().default(""),
  description: text("description").notNull(),
  categoryId: id("category_id").references(() => categories.id, { onDelete: "set null" }),
  sizeGuideId: id("size_guide_id").references(() => sizeGuides.id, { onDelete: "set null" }),
  fabric: varchar("fabric", { length: 255 }).notNull().default(""),
  care: json("care").$type<string[]>().notNull(),
  details: json("details").$type<string[]>().notNull(),
  fit: varchar("fit", { length: 255 }),
  tags: json("tags").$type<string[]>().notNull(),
  occasions: json("occasions").$type<string[]>().notNull(),
  status: varchar("status", { length: 12 }).notNull().default("draft").$type<"active" | "draft" | "archived" | "scheduled">(),
  publishAt: ts("publish_at"),
  isNew: boolean("is_new").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  /** Manual bestseller pin; automatic ranking uses order data. */
  isBestseller: boolean("is_bestseller").notNull().default(false),
  sortOrder: int("sort_order").notNull().default(0),
  seoTitle: varchar("seo_title", { length: 160 }),
  seoDescription: varchar("seo_description", { length: 320 }),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: ts("deleted_at"),
}, (t) => [
  uniqueIndex("product_slug_uq").on(t.slug), uniqueIndex("product_sku_uq").on(t.sku),
  index("product_status_idx").on(t.status, t.publishAt), index("product_category_idx").on(t.categoryId), index("product_created_idx").on(t.createdAt),
]);

/** Product base price per currency. Sale = price below compare_at_price. */
export const productPrices = mysqlTable("product_prices", {
  productId: id("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  currency: cur().notNull().references(() => currencies.code),
  price: int("price").notNull(),
  compareAtPrice: int("compare_at_price"),
}, (t) => [primaryKey({ columns: [t.productId, t.currency] }), index("price_currency_idx").on(t.currency, t.price)]);

export const productCategories = mysqlTable("product_categories", {
  productId: id("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  categoryId: id("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.productId, t.categoryId] }), index("pc_category_idx").on(t.categoryId)]);

export const productAttributes = mysqlTable("product_attributes", {
  id: id().primaryKey(),
  code: varchar("code", { length: 32 }).notNull(), // colour | size | fabric …
  name: varchar("name", { length: 60 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
}, (t) => [uniqueIndex("attr_code_uq").on(t.code)]);

export const productAttributeValues = mysqlTable("product_attribute_values", {
  id: id().primaryKey(),
  attributeId: id("attribute_id").notNull().references(() => productAttributes.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 80 }).notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  /** Swatch colour for colour values. */
  hex: varchar("hex", { length: 9 }),
  /** Filter group (e.g. "Ivory II" → "Ivory"). */
  family: varchar("family", { length: 80 }),
  sortOrder: int("sort_order").notNull().default(0),
}, (t) => [uniqueIndex("attr_value_uq").on(t.attributeId, t.value)]);

export const productVariants = mysqlTable("product_variants", {
  id: id().primaryKey(),
  productId: id("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 80 }).notNull(),
  colourValueId: id("colour_value_id").references(() => productAttributeValues.id),
  sizeValueId: id("size_value_id").references(() => productAttributeValues.id),
  /** Cost price in PKR minor units (finance only). */
  costPrice: int("cost_price"),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("variant_sku_uq").on(t.sku), index("variant_product_idx").on(t.productId), uniqueIndex("variant_combo_uq").on(t.productId, t.colourValueId, t.sizeValueId)]);

/** Optional per-variant price override. */
export const variantPrices = mysqlTable("variant_prices", {
  variantId: id("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  currency: cur().notNull().references(() => currencies.code),
  price: int("price").notNull(),
  compareAtPrice: int("compare_at_price"),
}, (t) => [primaryKey({ columns: [t.variantId, t.currency] })]);

export const productImages = mysqlTable("product_images", {
  id: id().primaryKey(),
  productId: id("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  mediaId: id("media_id").notNull().references(() => mediaAssets.id, { onDelete: "restrict" }),
  /** Images belong to a colourway so the gallery and card hover always show the same garment. */
  colourValueId: id("colour_value_id").references(() => productAttributeValues.id, { onDelete: "set null" }),
  alt: varchar("alt", { length: 300 }),
  sortOrder: int("sort_order").notNull().default(0),
}, (t) => [index("pimg_product_idx").on(t.productId, t.sortOrder), index("pimg_media_idx").on(t.mediaId)]);

export const productCollections = mysqlTable("product_collections", {
  productId: id("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  collectionId: id("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  sortOrder: int("sort_order").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.productId, t.collectionId] }), index("pcol_collection_idx").on(t.collectionId)]);

export const relatedProducts = mysqlTable("related_products", {
  productId: id("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relatedId: id("related_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  /** related = "You may also like", look = "Complete the look". */
  kind: varchar("kind", { length: 12 }).notNull().$type<"related" | "look">(),
  sortOrder: int("sort_order").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.productId, t.relatedId, t.kind] })]);

/* ═════════════════════════════ Inventory ═════════════════════════════ */

/** One row per variant. available = on_hand − reserved. Updated only with guarded atomic UPDATEs. */
export const inventory = mysqlTable("inventory", {
  variantId: id("variant_id").primaryKey().references(() => productVariants.id, { onDelete: "cascade" }),
  onHand: int("on_hand").notNull().default(0),
  reserved: int("reserved").notNull().default(0),
  damaged: int("damaged").notNull().default(0),
  lowStockThreshold: int("low_stock_threshold"),
  location: varchar("location", { length: 60 }).notNull().default("Lahore atelier"),
  updatedAt: updated(),
});

export const stockAdjustments = mysqlTable("stock_adjustments", {
  id: id().primaryKey(),
  reason: varchar("reason", { length: 24 }).notNull().$type<"received" | "correction" | "damaged" | "returned" | "transfer" | "count">(),
  note: varchar("note", { length: 500 }).notNull().default(""),
  staffUserId: id("staff_user_id").notNull(),
  createdAt: created(),
});

export const inventoryMovements = mysqlTable("inventory_movements", {
  id: id().primaryKey(),
  variantId: id("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull().$type<"receipt" | "sale" | "return" | "damage" | "adjustment" | "reserve" | "release" | "cancel_restock" | "transfer">(),
  /** Signed change to on_hand (reserve/release change reserved instead and record 0 here). */
  quantity: int("quantity").notNull(),
  reservedDelta: int("reserved_delta").notNull().default(0),
  onHandAfter: int("on_hand_after").notNull(),
  adjustmentId: id("adjustment_id").references(() => stockAdjustments.id, { onDelete: "set null" }),
  orderId: id("order_id"),
  staffUserId: id("staff_user_id"),
  note: varchar("note", { length: 500 }).notNull().default(""),
  createdAt: created(),
}, (t) => [index("inv_mov_variant_idx").on(t.variantId, t.createdAt), index("inv_mov_order_idx").on(t.orderId)]);

export const stockReservations = mysqlTable("stock_reservations", {
  id: id().primaryKey(),
  variantId: id("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  orderId: id("order_id").notNull(),
  quantity: int("quantity").notNull(),
  status: varchar("status", { length: 12 }).notNull().$type<"active" | "committed" | "released">(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("resv_order_idx").on(t.orderId), index("resv_status_idx").on(t.status, t.expiresAt)]);

/* ═════════════════════════════ Customers & authentication ═════════════════════════════ */

export const users = mysqlTable("users", {
  id: id().primaryKey(),
  email: varchar("email", { length: 254 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name", { length: 80 }).notNull(),
  lastName: varchar("last_name", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  status: varchar("status", { length: 16 }).notNull().default("active").$type<"active" | "suspended" | "deactivated">(),
  emailVerifiedAt: ts("email_verified_at"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  lastLoginAt: ts("last_login_at"),
  failedLoginCount: int("failed_login_count").notNull().default(0),
  lockedUntil: ts("locked_until"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_created_idx").on(t.createdAt)]);

export const customerProfiles = mysqlTable("customer_profiles", {
  userId: id("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  preferredMarketId: id("preferred_market_id"),
  notificationPrefs: json("notification_prefs").$type<{ orderUpdates: boolean; newsletter: boolean; backInStock: boolean }>().notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  updatedAt: updated(),
});

export const customerAddresses = mysqlTable("customer_addresses", {
  id: id().primaryKey(),
  userId: id("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 40 }).notNull().default("Home"),
  firstName: varchar("first_name", { length: 80 }).notNull(),
  lastName: varchar("last_name", { length: 80 }).notNull(),
  line1: varchar("line1", { length: 200 }).notNull(),
  line2: varchar("line2", { length: 200 }),
  city: varchar("city", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  countryCode: char("country_code", { length: 2 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("addr_user_idx").on(t.userId)]);

export const customerNotes = mysqlTable("customer_notes", {
  id: id().primaryKey(),
  userId: id("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  staffUserId: id("staff_user_id").notNull(),
  kind: varchar("kind", { length: 12 }).notNull().default("note").$type<"note" | "support">(),
  body: text("body").notNull(),
  createdAt: created(),
}, (t) => [index("cnote_user_idx").on(t.userId)]);

export const accountDeletionRequests = mysqlTable("account_deletion_requests", {
  id: id().primaryKey(),
  userId: id("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 500 }).notNull().default(""),
  status: varchar("status", { length: 12 }).notNull().default("pending").$type<"pending" | "completed" | "rejected">(),
  handledBy: id("handled_by"),
  createdAt: created(),
  updatedAt: updated(),
});

/** Sessions for both customers and staff. Only a SHA-256 hash of the cookie token is stored. */
export const userSessions = mysqlTable("user_sessions", {
  id: id().primaryKey(),
  tokenHash: char("token_hash", { length: 64 }).notNull(),
  subject: varchar("subject", { length: 8 }).notNull().$type<"customer" | "staff">(),
  userId: id("user_id").references(() => users.id, { onDelete: "cascade" }),
  staffUserId: id("staff_user_id").references(() => staffUsers.id, { onDelete: "cascade" }),
  ip: varchar("ip", { length: 64 }),
  userAgent: varchar("user_agent", { length: 255 }),
  expiresAt: ts("expires_at").notNull(),
  lastSeenAt: ts("last_seen_at").notNull(),
  revokedAt: ts("revoked_at"),
  createdAt: created(),
}, (t) => [uniqueIndex("session_token_uq").on(t.tokenHash), index("session_user_idx").on(t.userId), index("session_staff_idx").on(t.staffUserId)]);

const tokenTable = (name: string) => mysqlTable(name, {
  id: id().primaryKey(),
  tokenHash: char("token_hash", { length: 64 }).notNull(),
  subject: varchar("subject", { length: 8 }).notNull().$type<"customer" | "staff">(),
  userId: id("user_id"),
  staffUserId: id("staff_user_id"),
  /** reset | invite (staff invitation acceptance) | verify */
  purpose: varchar("purpose", { length: 12 }).notNull().default("reset"),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: created(),
}, (t) => [uniqueIndex(`${name}_token_uq`).on(t.tokenHash)]);

export const passwordResetTokens = tokenTable("password_reset_tokens");
export const emailVerificationTokens = tokenTable("email_verification_tokens");

/* ═════════════════════════════ Staff & permissions ═════════════════════════════ */

export const staffUsers = mysqlTable("staff_users", {
  id: id().primaryKey(),
  email: varchar("email", { length: 254 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  status: varchar("status", { length: 12 }).notNull().default("invited").$type<"invited" | "active" | "deactivated">(),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  lastLoginAt: ts("last_login_at"),
  failedLoginCount: int("failed_login_count").notNull().default(0),
  lockedUntil: ts("locked_until"),
  invitedBy: id("invited_by"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("staff_email_uq").on(t.email)]);

export const roles = mysqlTable("roles", {
  id: id().primaryKey(),
  key: varchar("key", { length: 40 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  description: varchar("description", { length: 300 }).notNull().default(""),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("role_key_uq").on(t.key)]);

export const permissions = mysqlTable("permissions", {
  key: varchar("key", { length: 64 }).primaryKey(), // products.update
  resource: varchar("resource", { length: 32 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  description: varchar("description", { length: 200 }).notNull().default(""),
});

export const rolePermissions = mysqlTable("role_permissions", {
  roleId: id("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionKey: varchar("permission_key", { length: 64 }).notNull().references(() => permissions.key, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })]);

export const staffRoleAssignments = mysqlTable("staff_role_assignments", {
  staffUserId: id("staff_user_id").notNull().references(() => staffUsers.id, { onDelete: "cascade" }),
  roleId: id("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  assignedBy: id("assigned_by"),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.staffUserId, t.roleId] })]);

/* ═════════════════════════════ Shopping ═════════════════════════════ */

export const carts = mysqlTable("carts", {
  id: id().primaryKey(),
  /** Hash of the guest cookie token. Null once owned by a logged-in user. */
  tokenHash: char("token_hash", { length: 64 }),
  userId: id("user_id").references(() => users.id, { onDelete: "cascade" }),
  marketId: id("market_id").notNull(),
  couponCode: varchar("coupon_code", { length: 40 }),
  email: varchar("email", { length: 254 }),
  status: varchar("status", { length: 12 }).notNull().default("active").$type<"active" | "merged" | "converted" | "abandoned">(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("cart_token_uq").on(t.tokenHash), index("cart_user_idx").on(t.userId, t.status), index("cart_updated_idx").on(t.status, t.updatedAt)]);

export const cartItems = mysqlTable("cart_items", {
  id: id().primaryKey(),
  cartId: id("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  variantId: id("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: int("quantity").notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("cart_item_uq").on(t.cartId, t.variantId)]);

export const wishlists = mysqlTable("wishlists", {
  id: id().primaryKey(),
  tokenHash: char("token_hash", { length: 64 }),
  userId: id("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("wish_token_uq").on(t.tokenHash), uniqueIndex("wish_user_uq").on(t.userId)]);

export const wishlistItems = mysqlTable("wishlist_items", {
  wishlistId: id("wishlist_id").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
  productId: id("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.wishlistId, t.productId] })]);

export const recentlyViewedProducts = mysqlTable("recently_viewed_products", {
  userId: id("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: id("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  viewedAt: ts("viewed_at").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] }), index("rv_user_idx").on(t.userId, t.viewedAt)]);

/* ═════════════════════════════ Orders ═════════════════════════════ */

export const orders = mysqlTable("orders", {
  id: id().primaryKey(),
  number: varchar("number", { length: 24 }).notNull(),
  /** Unguessable token so guests can view their confirmation / tracking page. */
  accessTokenHash: char("access_token_hash", { length: 64 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 80 }).notNull(),
  userId: id("user_id").references(() => users.id, { onDelete: "set null" }),
  /** Cart the order was placed from; converted when payment is confirmed (online) or at once (COD). */
  cartId: id("cart_id"),
  email: varchar("email", { length: 254 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  marketId: id("market_id").notNull(),
  currency: cur().notNull(),
  countryCode: char("country_code", { length: 2 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().$type<OrderStatus>(),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().$type<PaymentStatusDb>(),
  paymentMethod: varchar("payment_method", { length: 32 }).notNull(),
  shippingMethodId: id("shipping_method_id"),
  shippingLabel: varchar("shipping_label", { length: 120 }).notNull(),
  subtotal: int("subtotal").notNull(),
  discountTotal: int("discount_total").notNull().default(0),
  shippingTotal: int("shipping_total").notNull().default(0),
  taxTotal: int("tax_total").notNull().default(0),
  taxIncluded: int("tax_included").notNull().default(0),
  taxLabel: varchar("tax_label", { length: 40 }),
  total: int("total").notNull(),
  amountPaid: int("amount_paid").notNull().default(0),
  amountRefunded: int("amount_refunded").notNull().default(0),
  couponCode: varchar("coupon_code", { length: 40 }),
  customerNote: varchar("customer_note", { length: 1000 }),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  ip: varchar("ip", { length: 64 }),
  placedAt: ts("placed_at").notNull(),
  cancelledAt: ts("cancelled_at"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [
  uniqueIndex("order_number_uq").on(t.number), uniqueIndex("order_idem_uq").on(t.idempotencyKey),
  index("order_user_idx").on(t.userId), index("order_email_idx").on(t.email), index("order_placed_idx").on(t.placedAt),
  index("order_status_idx").on(t.status, t.placedAt), index("order_paystatus_idx").on(t.paymentStatus),
]);

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
export type PaymentStatusDb = "unpaid" | "awaiting_cod" | "pending" | "paid" | "failed" | "partially_refunded" | "refunded" | "voided";

export const orderItems = mysqlTable("order_items", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: id("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: id("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: varchar("product_name", { length: 160 }).notNull(),
  productSlug: varchar("product_slug", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 80 }).notNull(),
  colour: varchar("colour", { length: 80 }).notNull(),
  size: varchar("size", { length: 40 }).notNull(),
  imageUrl: varchar("image_url", { length: 1024 }),
  unitPrice: int("unit_price").notNull(),
  compareAtPrice: int("compare_at_price"),
  quantity: int("quantity").notNull(),
  lineTotal: int("line_total").notNull(),
  discountAllocated: int("discount_allocated").notNull().default(0),
  quantityReturned: int("quantity_returned").notNull().default(0),
  costPrice: int("cost_price"),
}, (t) => [index("oi_order_idx").on(t.orderId), index("oi_product_idx").on(t.productId)]);

export const orderAddresses = mysqlTable("order_addresses", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 10 }).notNull().$type<"shipping" | "billing">(),
  firstName: varchar("first_name", { length: 80 }).notNull(),
  lastName: varchar("last_name", { length: 80 }).notNull(),
  line1: varchar("line1", { length: 200 }).notNull(),
  line2: varchar("line2", { length: 200 }),
  city: varchar("city", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  countryCode: char("country_code", { length: 2 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
}, (t) => [uniqueIndex("oaddr_uq").on(t.orderId, t.type)]);

export const orderStatusHistory = mysqlTable("order_status_history", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  field: varchar("field", { length: 16 }).notNull().$type<"status" | "payment">(),
  fromValue: varchar("from_value", { length: 20 }),
  toValue: varchar("to_value", { length: 20 }).notNull(),
  actorType: varchar("actor_type", { length: 10 }).notNull().$type<"customer" | "staff" | "system" | "provider">(),
  staffUserId: id("staff_user_id"),
  note: varchar("note", { length: 500 }).notNull().default(""),
  createdAt: created(),
}, (t) => [index("osh_order_idx").on(t.orderId, t.createdAt)]);

export const orderNotes = mysqlTable("order_notes", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  visibility: varchar("visibility", { length: 10 }).notNull().$type<"internal" | "customer">(),
  body: text("body").notNull(),
  staffUserId: id("staff_user_id"),
  notifiedAt: ts("notified_at"),
  createdAt: created(),
}, (t) => [index("onote_order_idx").on(t.orderId)]);

export const shipments = mysqlTable("shipments", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  carrier: varchar("carrier", { length: 60 }).notNull(),
  trackingNumber: varchar("tracking_number", { length: 80 }).notNull(),
  trackingUrl: varchar("tracking_url", { length: 512 }),
  status: varchar("status", { length: 16 }).notNull().$type<"label_created" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "returned">(),
  shippedAt: ts("shipped_at"),
  deliveredAt: ts("delivered_at"),
  staffUserId: id("staff_user_id"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("ship_order_idx").on(t.orderId), index("ship_tracking_idx").on(t.trackingNumber)]);

export const shipmentEvents = mysqlTable("shipment_events", {
  id: id().primaryKey(),
  shipmentId: id("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull(),
  description: varchar("description", { length: 300 }).notNull(),
  location: varchar("location", { length: 120 }),
  occurredAt: ts("occurred_at").notNull(),
  createdAt: created(),
}, (t) => [index("sev_ship_idx").on(t.shipmentId, t.occurredAt)]);

export const returns = mysqlTable("returns", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  number: varchar("number", { length: 24 }).notNull(),
  status: varchar("status", { length: 12 }).notNull().$type<"requested" | "approved" | "received" | "refunded" | "rejected">(),
  reason: varchar("reason", { length: 500 }).notNull(),
  staffUserId: id("staff_user_id"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("return_number_uq").on(t.number), index("return_order_idx").on(t.orderId)]);

export const returnItems = mysqlTable("return_items", {
  id: id().primaryKey(),
  returnId: id("return_id").notNull().references(() => returns.id, { onDelete: "cascade" }),
  orderItemId: id("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  quantity: int("quantity").notNull(),
  condition: varchar("condition", { length: 12 }).notNull().$type<"resellable" | "damaged">(),
  restocked: boolean("restocked").notNull().default(false),
});

/* ═════════════════════════════ Payments ═════════════════════════════ */

export const paymentMethods = mysqlTable("payment_methods", {
  id: id().primaryKey(), // cod | safepay_card | stripe_card …
  provider: varchar("provider", { length: 24 }).notNull(), // cod | safepay | stripe | test
  kind: varchar("kind", { length: 8 }).notNull().$type<"cod" | "online">(),
  label: varchar("label", { length: 80 }).notNull(),
  description: varchar("description", { length: 255 }).notNull().default(""),
  /** Markets where the method is offered. */
  marketIds: json("market_ids").$type<string[]>().notNull(),
  /** test = provider sandbox; live = production credentials. Credentials themselves are env vars only. */
  mode: varchar("mode", { length: 8 }).notNull().default("test").$type<"test" | "live">(),
  enabled: boolean("enabled").notNull().default(false),
  /** COD: maximum order total per currency (minor units); empty = no limit. */
  limits: json("limits").$type<Record<string, number>>().notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  updatedAt: updated(),
});

export const payments = mysqlTable("payments", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  methodId: varchar("method_id", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 24 }).notNull(),
  amount: int("amount").notNull(),
  currency: cur().notNull(),
  status: varchar("status", { length: 20 }).notNull().$type<"pending" | "awaiting_cod" | "authorized" | "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded">(),
  /** Provider checkout/session/tracker id. */
  providerReference: varchar("provider_reference", { length: 128 }),
  providerPaymentId: varchar("provider_payment_id", { length: 128 }),
  amountRefunded: int("amount_refunded").notNull().default(0),
  failureReason: varchar("failure_reason", { length: 300 }),
  paidAt: ts("paid_at"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("pay_order_idx").on(t.orderId), uniqueIndex("pay_provider_ref_uq").on(t.provider, t.providerReference), index("pay_status_idx").on(t.status, t.createdAt)]);

export const paymentTransactions = mysqlTable("payment_transactions", {
  id: id().primaryKey(),
  paymentId: id("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 16 }).notNull().$type<"session" | "sale" | "authorization" | "capture" | "refund" | "void" | "cod_collection" | "failure">(),
  amount: int("amount").notNull(),
  currency: cur().notNull(),
  status: varchar("status", { length: 12 }).notNull().$type<"succeeded" | "failed" | "pending">(),
  providerTransactionId: varchar("provider_transaction_id", { length: 128 }),
  staffUserId: id("staff_user_id"),
  raw: json("raw").$type<unknown>(),
  createdAt: created(),
}, (t) => [index("ptx_payment_idx").on(t.paymentId), uniqueIndex("ptx_provider_uq").on(t.type, t.providerTransactionId)]);

export const paymentWebhookEvents = mysqlTable("payment_webhook_events", {
  id: id().primaryKey(),
  provider: varchar("provider", { length: 24 }).notNull(),
  eventId: varchar("event_id", { length: 160 }).notNull(),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  signatureValid: boolean("signature_valid").notNull(),
  status: varchar("status", { length: 12 }).notNull().$type<"received" | "processed" | "ignored" | "failed" | "rejected">(),
  payload: json("payload").$type<unknown>(),
  error: varchar("error", { length: 500 }),
  attempts: int("attempts").notNull().default(1),
  receivedAt: created(),
  processedAt: ts("processed_at"),
}, (t) => [uniqueIndex("webhook_event_uq").on(t.provider, t.eventId), index("webhook_received_idx").on(t.receivedAt)]);

export const refunds = mysqlTable("refunds", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  paymentId: id("payment_id").references(() => payments.id, { onDelete: "set null" }),
  returnId: id("return_id").references(() => returns.id, { onDelete: "set null" }),
  amount: int("amount").notNull(),
  currency: cur().notNull(),
  /** provider = refunded through the gateway; manual = bank transfer / cash (COD). */
  method: varchar("method", { length: 12 }).notNull().$type<"provider" | "manual">(),
  status: varchar("status", { length: 12 }).notNull().$type<"pending" | "succeeded" | "failed">(),
  reason: varchar("reason", { length: 500 }).notNull(),
  providerRefundId: varchar("provider_refund_id", { length: 128 }),
  restock: boolean("restock").notNull().default(false),
  staffUserId: id("staff_user_id"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("refund_order_idx").on(t.orderId), index("refund_created_idx").on(t.createdAt)]);

/* ═════════════════════════════ Marketing ═════════════════════════════ */

export const coupons = mysqlTable("coupons", {
  id: id().primaryKey(),
  code: varchar("code", { length: 40 }).notNull(),
  description: varchar("description", { length: 255 }).notNull().default(""),
  type: varchar("type", { length: 16 }).notNull().$type<"percentage" | "fixed" | "free_shipping">(),
  /** percentage: basis points (1000 = 10%). */
  percentBps: int("percent_bps").notNull().default(0),
  /** fixed: amount per currency (minor units). */
  fixedAmounts: json("fixed_amounts").$type<Record<string, number>>().notNull(),
  minimumSubtotals: json("minimum_subtotals").$type<Record<string, number>>().notNull(),
  maximumDiscounts: json("maximum_discounts").$type<Record<string, number>>().notNull(),
  /** Empty = all markets. */
  marketIds: json("market_ids").$type<string[]>().notNull(),
  appliesTo: varchar("applies_to", { length: 12 }).notNull().default("all").$type<"all" | "products" | "categories">(),
  productIds: json("product_ids").$type<string[]>().notNull(),
  categoryIds: json("category_ids").$type<string[]>().notNull(),
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
  usageLimit: int("usage_limit"),
  perCustomerLimit: int("per_customer_limit"),
  usageCount: int("usage_count").notNull().default(0),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("coupon_code_uq").on(t.code)]);

export const couponRedemptions = mysqlTable("coupon_redemptions", {
  id: id().primaryKey(),
  couponId: id("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  orderId: id("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  userId: id("user_id"),
  email: varchar("email", { length: 254 }).notNull(),
  amount: int("amount").notNull(),
  currency: cur().notNull(),
  /** Voided when the order is cancelled so the use is returned to the customer's allowance. */
  voidedAt: ts("voided_at"),
  createdAt: created(),
}, (t) => [uniqueIndex("redemption_order_uq").on(t.orderId), index("redemption_coupon_idx").on(t.couponId, t.email)]);

export const promotionalCampaigns = mysqlTable("promotional_campaigns", {
  id: id().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  couponId: id("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
  collectionId: id("collection_id").references(() => collections.id, { onDelete: "set null" }),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  status: varchar("status", { length: 12 }).notNull().default("draft").$type<"draft" | "scheduled" | "active" | "ended">(),
  createdAt: created(),
  updatedAt: updated(),
});

export const newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: id().primaryKey(),
  email: varchar("email", { length: 254 }).notNull(),
  status: varchar("status", { length: 14 }).notNull().$type<"pending" | "subscribed" | "unsubscribed">(),
  tokenHash: char("token_hash", { length: 64 }),
  source: varchar("source", { length: 32 }).notNull().default("footer"),
  confirmedAt: ts("confirmed_at"),
  unsubscribedAt: ts("unsubscribed_at"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("newsletter_email_uq").on(t.email)]);

export const abandonedCarts = mysqlTable("abandoned_carts", {
  id: id().primaryKey(),
  cartId: id("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 254 }).notNull(),
  subtotal: int("subtotal").notNull(),
  currency: cur().notNull(),
  remindedAt: ts("reminded_at"),
  recoveredOrderId: id("recovered_order_id"),
  createdAt: created(),
}, (t) => [uniqueIndex("abandoned_cart_uq").on(t.cartId)]);

/* ═════════════════════════════ CMS & website content ═════════════════════════════ */

export const homepageSections = mysqlTable("homepage_sections", {
  id: id().primaryKey(),
  type: varchar("type", { length: 24 }).notNull(),
  /** Admin label. */
  name: varchar("name", { length: 120 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  eyebrow: varchar("eyebrow", { length: 160 }).notNull().default(""),
  heading: varchar("heading", { length: 300 }).notNull().default(""),
  body: text("body").notNull(),
  primaryLabel: varchar("primary_label", { length: 80 }),
  primaryHref: varchar("primary_href", { length: 300 }),
  secondaryLabel: varchar("secondary_label", { length: 80 }),
  secondaryHref: varchar("secondary_href", { length: 300 }),
  imageId: id("image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  mobileImageId: id("mobile_image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  /** Type-specific settings (product source, limit, collection ids …). */
  settings: json("settings").$type<Record<string, unknown>>().notNull(),
  updatedBy: id("updated_by"),
  createdAt: created(),
  updatedAt: updated(),
});

export const homepageSectionItems = mysqlTable("homepage_section_items", {
  id: id().primaryKey(),
  sectionId: id("section_id").notNull().references(() => homepageSections.id, { onDelete: "cascade" }),
  sortOrder: int("sort_order").notNull().default(0),
  title: varchar("title", { length: 200 }).notNull().default(""),
  body: text("body").notNull(),
  href: varchar("href", { length: 300 }),
  imageId: id("image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  productId: id("product_id").references(() => products.id, { onDelete: "cascade" }),
  collectionId: id("collection_id").references(() => collections.id, { onDelete: "cascade" }),
}, (t) => [index("hsi_section_idx").on(t.sectionId, t.sortOrder)]);

/** Published homepage snapshots. The storefront renders the latest one; drafts are previewed in Studio. */
export const homepagePublications = mysqlTable("homepage_publications", {
  id: id().primaryKey(),
  snapshot: json("snapshot").$type<unknown>().notNull(),
  publishedBy: id("published_by"),
  publishedAt: created(),
});

export const banners = mysqlTable("banners", {
  id: id().primaryKey(),
  placement: varchar("placement", { length: 24 }).notNull().$type<"announcement" | "category_top" | "checkout">(),
  message: varchar("message", { length: 300 }).notNull(),
  href: varchar("href", { length: 300 }),
  imageId: id("image_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
});

export const staticPages = mysqlTable("static_pages", {
  id: id().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 12 }).notNull().default("draft").$type<"published" | "draft">(),
  seoTitle: varchar("seo_title", { length: 160 }),
  seoDescription: varchar("seo_description", { length: 320 }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("page_slug_uq").on(t.slug)]);

export const policyPages = mysqlTable("policy_pages", {
  slug: varchar("slug", { length: 64 }).primaryKey(), // shipping | returns | privacy | terms
  title: varchar("title", { length: 200 }).notNull(),
  intro: varchar("intro", { length: 500 }).notNull().default(""),
  /** Sections: heading + paragraphs (plain text, rendered escaped). */
  sections: json("sections").$type<{ heading: string; body: string[] }[]>().notNull(),
  updatedBy: id("updated_by"),
  updatedAt: updated(),
});

export const navigationMenus = mysqlTable("navigation_menus", {
  id: id().primaryKey(),
  key: varchar("key", { length: 40 }).notNull(), // header | footer-shop | footer-care | footer-house
  name: varchar("name", { length: 80 }).notNull(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("menu_key_uq").on(t.key)]);

export const navigationItems = mysqlTable("navigation_items", {
  id: id().primaryKey(),
  menuId: id("menu_id").notNull().references(() => navigationMenus.id, { onDelete: "cascade" }),
  parentId: id("parent_id"),
  label: varchar("label", { length: 80 }).notNull(),
  href: varchar("href", { length: 300 }).notNull(),
  /** Header mega-menu panel type: shop | occasion:<id> | collections | none */
  panel: varchar("panel", { length: 40 }).notNull().default("none"),
  sortOrder: int("sort_order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
}, (t) => [index("navitem_menu_idx").on(t.menuId, t.sortOrder)]);

export const storeSettings = mysqlTable("store_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<unknown>().notNull(),
  updatedBy: id("updated_by"),
  updatedAt: updated(),
});

/* ═════════════════════════════ Operations ═════════════════════════════ */

export const auditLogs = mysqlTable("audit_logs", {
  id: id().primaryKey(),
  actorType: varchar("actor_type", { length: 10 }).notNull().$type<"staff" | "customer" | "system" | "anonymous">(),
  actorId: id("actor_id"),
  actorLabel: varchar("actor_label", { length: 160 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }),
  summary: varchar("summary", { length: 500 }).notNull(),
  changes: json("changes").$type<Record<string, { from: unknown; to: unknown }> | null>(),
  ip: varchar("ip", { length: 64 }),
  userAgent: varchar("user_agent", { length: 255 }),
  createdAt: created(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_actor_idx").on(t.actorId), index("audit_action_idx").on(t.action)]);

export const notificationTemplates = mysqlTable("notification_templates", {
  key: varchar("key", { length: 48 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  /** Plain-text paragraphs with {{placeholders}}; rendered into the branded HTML layout and escaped. */
  body: text("body").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedBy: id("updated_by"),
  updatedAt: updated(),
});

export const notifications = mysqlTable("notifications", {
  id: id().primaryKey(),
  channel: varchar("channel", { length: 8 }).notNull().default("email"),
  templateKey: varchar("template_key", { length: 48 }).notNull(),
  recipient: varchar("recipient", { length: 254 }).notNull(),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  status: varchar("status", { length: 12 }).notNull().$type<"queued" | "sent" | "failed" | "skipped">(),
  attempts: int("attempts").notNull().default(0),
  nextAttemptAt: ts("next_attempt_at"),
  lastError: varchar("last_error", { length: 500 }),
  orderId: id("order_id"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("notif_status_idx").on(t.status, t.nextAttemptAt), index("notif_order_idx").on(t.orderId)]);

export const emailLogs = mysqlTable("email_logs", {
  id: id().primaryKey(),
  notificationId: id("notification_id").references(() => notifications.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 16 }).notNull(),
  providerMessageId: varchar("provider_message_id", { length: 128 }),
  to: varchar("to_address", { length: 254 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  status: varchar("status", { length: 12 }).notNull().$type<"sent" | "failed" | "skipped">(),
  error: varchar("error", { length: 500 }),
  createdAt: created(),
}, (t) => [index("email_created_idx").on(t.createdAt), index("email_to_idx").on(t.to)]);

export const contactMessages = mysqlTable("contact_messages", {
  id: id().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  orderNumber: varchar("order_number", { length: 24 }),
  subject: varchar("subject", { length: 160 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("new").$type<"new" | "open" | "closed">(),
  ip: varchar("ip", { length: 64 }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("contact_status_idx").on(t.status, t.createdAt)]);

/** Fixed-window rate limit counters (login, password reset, checkout, contact form). */
export const rateLimits = mysqlTable("rate_limits", {
  key: varchar("key", { length: 191 }).primaryKey(),
  count: int("count").notNull(),
  windowStart: ts("window_start").notNull(),
});

/** Monotonic counters (order numbers, return numbers). */
export const sequences = mysqlTable("sequences", {
  name: varchar("name", { length: 32 }).primaryKey(),
  value: int("value").notNull(),
});
