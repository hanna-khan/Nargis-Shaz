import type { Permission, PermissionAction, PermissionResource, Role, RoleId, StaffMember } from "@/types";

export const RESOURCES: { id: PermissionResource; label: string; actions: PermissionAction[] }[] = [
  { id: "products", label: "Products", actions: ["view", "create", "update", "delete", "export"] },
  { id: "orders", label: "Orders", actions: ["view", "update", "refund", "export"] },
  { id: "inventory", label: "Inventory", actions: ["view", "update", "export"] },
  { id: "customers", label: "Customers", actions: ["view", "update", "delete", "export"] },
  { id: "discounts", label: "Discounts", actions: ["view", "create", "update", "delete"] },
  { id: "content", label: "Content & media", actions: ["view", "create", "update", "delete"] },
  { id: "settings", label: "Store settings", actions: ["view", "update"] },
  { id: "team", label: "Team management", actions: ["view", "manage"] },
  { id: "finance", label: "Financial information", actions: ["view", "export", "refund"] },
];

const all = (r: PermissionResource): Permission[] => RESOURCES.find((x) => x.id === r)!.actions.map((a) => `${r}.${a}` as Permission);
const every = RESOURCES.flatMap((r) => all(r.id));

export const ROLES: Record<RoleId, Role> = {
  owner: { id: "owner", name: "Owner", description: "Full access, including billing, team and ownership transfer.", permissions: every, canAssign: ["administrator", "store_manager", "content_manager", "staff"] },
  administrator: { id: "administrator", name: "Administrator", description: "Everything except transferring ownership.", permissions: every, canAssign: ["store_manager", "content_manager", "staff"] },
  store_manager: {
    id: "store_manager", name: "Store Manager", description: "Runs day-to-day trading: catalogue, orders, stock, customers and promotions.",
    permissions: [...all("products"), "orders.view", "orders.update", "orders.refund", "orders.export", ...all("inventory"), "customers.view", "customers.update", "customers.export", ...all("discounts"), "content.view", "settings.view", "team.view", "finance.view"],
    canAssign: ["staff"],
  },
  content_manager: {
    id: "content_manager", name: "Content Manager", description: "Owns the storefront: homepage, collections, media and product copy.",
    permissions: ["products.view", "products.update", ...all("content"), "inventory.view"],
    canAssign: [],
  },
  staff: {
    id: "staff", name: "Staff", description: "Fulfils orders and keeps stock accurate. No financial data.",
    permissions: ["products.view", "orders.view", "orders.update", "inventory.view", "inventory.update", "customers.view"],
    canAssign: [],
  },
};

export function can(member: Pick<StaffMember, "roleId"> | null | undefined, permission: Permission): boolean {
  if (!member) return false;
  return ROLES[member.roleId].permissions.includes(permission);
}

/** Admin navigation item → permission required to see it. */
export const NAV_PERMISSIONS: Record<string, Permission> = {
  "/admin": "products.view",
  "/admin/products": "products.view",
  "/admin/categories": "products.view",
  "/admin/collections": "content.view",
  "/admin/orders": "orders.view",
  "/admin/inventory": "inventory.view",
  "/admin/customers": "customers.view",
  "/admin/discounts": "discounts.view",
  "/admin/media": "content.view",
  "/admin/content": "content.view",
  "/admin/team": "team.view",
  "/admin/audit-log": "team.view",
  "/admin/settings": "settings.view",
};
