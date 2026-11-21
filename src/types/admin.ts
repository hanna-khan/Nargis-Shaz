import type { CurrencyCode } from "./commerce";
import type { ProductImage } from "./catalog";

/* ---------- Team, roles and permissions ---------- */

export type RoleId = "owner" | "administrator" | "store_manager" | "content_manager" | "staff";

export type PermissionResource =
  | "products"
  | "orders"
  | "inventory"
  | "customers"
  | "discounts"
  | "content"
  | "settings"
  | "team"
  | "finance";

export type PermissionAction = "view" | "create" | "update" | "delete" | "export" | "refund" | "manage";

/** e.g. "products.update", "finance.view", "orders.refund" */
export type Permission = `${PermissionResource}.${PermissionAction}`;

export interface Role {
  id: RoleId;
  name: string;
  description: string;
  permissions: Permission[];
  /** Roles a member with this role may assign to others. */
  canAssign: RoleId[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  roleId: RoleId;
  status: "active" | "invited" | "suspended";
  lastActiveAt: string | null;
  avatarTone: string;
}

/* ---------- Audit log ---------- */

export interface AuditLogEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string; // "product.updated", "order.refunded", "team.role_changed"
  resource: PermissionResource;
  resourceId?: string;
  summary: string;
  /** Before/after snapshot of changed fields. */
  changes?: Record<string, { from: unknown; to: unknown }>;
  ip?: string;
}

/* ---------- Media & content ---------- */

export interface MediaAsset extends ProductImage {
  filename: string;
  folder: "products" | "campaigns" | "editorial";
  /** Product this frame belongs to, if any. */
  productId?: string;
  sizeKb: number;
  uploadedAt: string;
}

export interface Cta { label: string; href: string }

/**
 * Storefront homepage content. Edited in Studio → Homepage content; every image field
 * references a media-library asset id so photography can be swapped without code changes.
 */
export interface HomepageContent {
  announcement: string;
  hero: { eyebrow: string; headline: string; body: string; primaryCta: Cta; secondaryCta: Cta; imageId: string; mobileImageId: string };
  newArrivals: { eyebrow: string; title: string; limit: number };
  /** Category / collection cards: link target + image. */
  categoryCards: { title: string; href: string; imageId: string }[];
  campaign: { eyebrow: string; headline: string; body: string; cta: Cta; imageIds: string[] };
  bestsellers: { eyebrow: string; title: string; mode: "auto" | "manual"; productIds: string[]; limit: number };
  statement: { eyebrow: string; text: string };
  /** Asymmetric editorial composition ("The Art of Dressing"). */
  editorial: { eyebrow: string; headline: string; body: string; imageIds: string[]; cta: Cta };
  details: { eyebrow: string; headline: string; items: { title: string; body: string; imageId: string }[] };
  featuredCollectionIds: string[];
  story: { eyebrow: string; headline: string; body: string; imageId: string };
  quote: { text: string; attribution: string };
}

/* ---------- Store settings ---------- */

export interface PaymentProviderConfig {
  id: string; // matches a provider id in lib/payments/registry
  enabled: boolean;
  marketIds: string[];
  mode: "test" | "live";
  /** Public, non-secret display configuration only. Secrets live in server env vars. */
  displayName: string;
}

export interface StoreSettings {
  storeName: string;
  legalName: string;
  supportEmail: string;
  supportPhone: string;
  baseCurrency: CurrencyCode;
  defaultMarketId: string;
  /** Used only as a fallback when an explicit price is missing. */
  exchangeRates: Record<CurrencyCode, number>; // units of currency per 1 PKR
  lowStockThreshold: number;
  orderNumberPrefix: string;
  payments: PaymentProviderConfig[];
}
