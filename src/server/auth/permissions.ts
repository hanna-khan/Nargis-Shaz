/**
 * Permission catalogue and default roles. These are SEEDED into MySQL (permissions, roles,
 * role_permissions); at runtime a staff member's effective permissions are always read from the
 * database, so the Super Admin can edit roles in Studio without code changes.
 * This module is pure (no DB) so it can be unit-tested and imported by client components for labels.
 */

export const PERMISSION_CATALOGUE = {
  dashboard: { label: "Dashboard", actions: ["view"] },
  products: { label: "Products", actions: ["view", "create", "update", "delete", "publish", "price"] },
  categories: { label: "Categories & collections", actions: ["view", "manage"] },
  inventory: { label: "Inventory", actions: ["view", "adjust"] },
  orders: { label: "Orders", actions: ["view", "update", "cancel", "notes", "ship", "collect_cod", "export"] },
  returns: { label: "Returns", actions: ["view", "manage"] },
  refunds: { label: "Refunds", actions: ["create"] },
  payments: { label: "Payments", actions: ["view", "manage"] },
  customers: { label: "Customers", actions: ["view", "view_pii", "update", "suspend", "export"] },
  coupons: { label: "Coupons & promotions", actions: ["view", "manage"] },
  shipping: { label: "Shipping", actions: ["view", "manage"] },
  content: { label: "Homepage & content", actions: ["view", "edit", "publish"] },
  media: { label: "Media library", actions: ["view", "upload", "delete"] },
  reports: { label: "Reports & analytics", actions: ["view", "finance", "export"] },
  settings: { label: "Store settings", actions: ["view", "manage"] },
  staff: { label: "Staff & permissions", actions: ["view", "manage"] },
  audit: { label: "Audit log", actions: ["view"] },
  notifications: { label: "Emails & messages", actions: ["view", "manage"] },
} as const;

type Catalogue = typeof PERMISSION_CATALOGUE;
export type Resource = keyof Catalogue;
export type Permission = { [R in Resource]: `${R}.${Catalogue[R]["actions"][number]}` }[Resource];

export const ALL_PERMISSIONS: Permission[] = (Object.keys(PERMISSION_CATALOGUE) as Resource[]).flatMap((r) =>
  (PERMISSION_CATALOGUE[r].actions as readonly string[]).map((a) => `${r}.${a}` as Permission),
);

const r = (res: Resource): Permission[] => ALL_PERMISSIONS.filter((p) => p.startsWith(`${res}.`));
const only = (...p: Permission[]) => p;

export interface RoleDefinition { key: string; name: string; description: string; permissions: Permission[] }

export const DEFAULT_ROLES: RoleDefinition[] = [
  { key: "super_admin", name: "Super Admin", description: "Unrestricted access including staff, roles and payment configuration.", permissions: ALL_PERMISSIONS },
  {
    key: "administrator", name: "Administrator", description: "Runs the whole store. Cannot change staff roles or payment configuration.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "staff.manage" && p !== "payments.manage"),
  },
  {
    key: "store_manager", name: "Store Manager", description: "Day-to-day trading: catalogue, stock, orders, customers and promotions.",
    permissions: [...r("dashboard"), ...r("products"), ...r("categories"), ...r("inventory"), ...r("orders"), ...r("returns"), ...r("refunds"), "payments.view", "customers.view", "customers.view_pii", "customers.update", ...r("coupons"), "shipping.view", "content.view", "media.view", "reports.view", "reports.export", "audit.view", "notifications.view"],
  },
  { key: "product_manager", name: "Product Manager", description: "Creates and maintains products, categories, collections and imagery.", permissions: [...r("dashboard"), ...r("products"), ...r("categories"), "inventory.view", "media.view", "media.upload"] },
  { key: "inventory_manager", name: "Inventory Manager", description: "Owns stock levels, adjustments and returned stock.", permissions: only("dashboard.view", "products.view", "inventory.view", "inventory.adjust", "returns.view", "returns.manage", "orders.view", "reports.view") },
  { key: "order_manager", name: "Order Manager", description: "Processes, ships and tracks orders; records COD collection.", permissions: only("dashboard.view", "orders.view", "orders.update", "orders.cancel", "orders.notes", "orders.ship", "orders.collect_cod", "orders.export", "returns.view", "returns.manage", "customers.view", "customers.view_pii", "inventory.view", "products.view", "shipping.view") },
  { key: "customer_support", name: "Customer Support", description: "Answers customers, views orders and adds notes. No refunds or financial data.", permissions: only("dashboard.view", "orders.view", "orders.notes", "customers.view", "customers.view_pii", "customers.update", "returns.view", "notifications.view", "notifications.manage", "products.view") },
  { key: "content_manager", name: "Content Manager", description: "Homepage, campaigns, pages, navigation and the media library.", permissions: [...r("content"), ...r("media"), "products.view", "categories.view", "dashboard.view"] },
  { key: "marketing_manager", name: "Marketing Manager", description: "Coupons, campaigns, newsletter and marketing reports.", permissions: [...r("coupons"), "content.view", "content.edit", "media.view", "media.upload", "customers.view", "customers.export", "reports.view", "reports.export", "dashboard.view", "products.view"] },
  { key: "finance_manager", name: "Finance Manager", description: "Payments, refunds, reconciliation and financial reports.", permissions: only("dashboard.view", "orders.view", "orders.export", "payments.view", "refunds.create", "reports.view", "reports.finance", "reports.export", "customers.view", "audit.view") },
];

/** Pure permission check used by server guards and unit tests. */
export function hasPermission(granted: ReadonlySet<string> | readonly string[], needed: Permission, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true;
  const set = granted instanceof Set ? granted : new Set(granted as readonly string[]);
  return set.has(needed);
}

export function permissionLabel(p: string) {
  const [res, action] = p.split(".");
  const group = PERMISSION_CATALOGUE[res as Resource]?.label ?? res;
  return `${group}: ${action.replace(/_/g, " ")}`;
}
