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
  sizeKb: number;
  uploadedAt: string;
}

export interface HomepageContent {
  announcement: string;
  hero: { eyebrow: string; headline: string; body: string; primaryCta: { label: string; href: string }; secondaryCta: { label: string; href: string } };
  statement: { eyebrow: string; text: string };
  featuredCollectionIds: string[];
  story: { eyebrow: string; headline: string; body: string };
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
