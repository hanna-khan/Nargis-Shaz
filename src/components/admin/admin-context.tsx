"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { auditEntry, diff } from "@/lib/audit";
import { can as canFn, ROLES } from "@/lib/auth/permissions";
import type {
  AuditLogEntry, Category, Collection, Country, Customer, Discount, FulfilmentStatus, HomepageContent, Market, MediaAsset,
  Order, PaymentStatus, Permission, PermissionResource, Product, RoleId, ShippingMethod, StaffMember, StoreSettings, TaxRule,
} from "@/types";

export interface AdminData {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  orders: Order[];
  customers: Customer[];
  discounts: Discount[];
  staff: StaffMember[];
  audit: AuditLogEntry[];
  settings: StoreSettings;
  media: MediaAsset[];
  homepage: HomepageContent;
  markets: Market[];
  countries: Country[];
  shipping: ShippingMethod[];
  taxRules: TaxRule[];
  sales: { date: string; revenue: number; orders: number }[];
}

type Result = { ok: true } | { ok: false; error: string };

interface AdminState extends AdminData {
  me: StaffMember;
  previewAs: (id: string) => void;
  can: (p: Permission) => boolean;
  saveProduct: (p: Product, isNew?: boolean) => Result;
  archiveProduct: (id: string) => Result;
  adjustStock: (productId: string, variantId: string, stock: number) => Result;
  updateOrder: (id: string, patch: { fulfilmentStatus?: FulfilmentStatus; paymentStatus?: PaymentStatus; note?: string }) => Result;
  saveDiscount: (d: Discount) => Result;
  saveCategory: (c: Category) => Result;
  saveCollection: (c: Collection) => Result;
  saveHomepage: (h: HomepageContent) => Result;
  saveSettings: (s: StoreSettings, shipping?: ShippingMethod[]) => Result;
  inviteStaff: (m: Omit<StaffMember, "id" | "status" | "lastActiveAt" | "avatarTone">) => Result;
  changeRole: (id: string, roleId: RoleId) => Result;
  toast: string | null;
}

const Ctx = createContext<AdminState | null>(null);

/**
 * Admin client store (Phase 1). Every mutation:
 *   1. checks the previewed member's permission (UI-only — Phase 2 re-checks on the server + RLS),
 *   2. updates local state,
 *   3. records an audit-log entry.
 * Phase 2: each action becomes a Server Action calling requirePermission() and the Supabase repository.
 */
export function AdminProvider({ data, children }: { data: AdminData; children: ReactNode }) {
  const [s, setS] = useState<AdminData>(data);
  const [meId, setMeId] = useState(data.staff[0].id);
  const [toast, setToast] = useState<string | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const me = s.staff.find((m) => m.id === meId) ?? s.staff[0];
  const can = useCallback((p: Permission) => canFn(me, p), [me]);

  const flash = (msg: string) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2600); };

  const commit = useCallback(
    (perm: Permission, resource: PermissionResource, action: string, summary: string, mutate: (d: AdminData) => AdminData, resourceId?: string, changes?: AuditLogEntry["changes"]): Result => {
      if (!canFn(me, perm)) { flash(`Your role (${ROLES[me.roleId].name}) can't do this`); return { ok: false, error: `Missing permission ${perm}` }; }
      setS((d) => {
        const next = mutate(d);
        const entry = auditEntry({ actor: me, action, resource, resourceId, summary, changes, at: new Date().toISOString(), seq: ++seq.current });
        return { ...next, audit: [entry, ...next.audit] };
      });
      flash(summary);
      return { ok: true };
    }, [me]);

  const api = useMemo<Omit<AdminState, keyof AdminData | "me" | "toast">>(() => ({
    previewAs: setMeId,
    can,
    saveProduct: (p, isNew) => {
      const before = s.products.find((x) => x.id === p.id);
      return commit(isNew ? "products.create" : "products.update", "products", isNew ? "product.created" : "product.updated", `${isNew ? "Created" : "Saved"} ${p.name}`,
        (d) => ({ ...d, products: isNew ? [p, ...d.products] : d.products.map((x) => (x.id === p.id ? p : x)) }), p.id,
        before ? diff(before, p, ["name", "status", "prices", "categoryId", "description", "isNew"]) : undefined);
    },
    archiveProduct: (id) => commit("products.delete", "products", "product.archived", `Archived ${s.products.find((p) => p.id === id)?.name}`,
      (d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, status: "archived" } : p)) }), id),
    adjustStock: (productId, variantId, stock) => {
      const p = s.products.find((x) => x.id === productId)!;
      const v = p.variants.find((x) => x.id === variantId)!;
      return commit("inventory.update", "inventory", "inventory.adjusted", `Stock for ${v.sku}: ${v.stock} → ${stock}`,
        (d) => ({ ...d, products: d.products.map((x) => (x.id !== productId ? x : { ...x, variants: x.variants.map((y) => (y.id === variantId ? { ...y, stock: Math.max(0, stock) } : y)) })) }),
        productId, { stock: { from: v.stock, to: stock } });
    },
    updateOrder: (id, patch) => {
      const o = s.orders.find((x) => x.id === id)!;
      const refund = patch.paymentStatus === "refunded";
      const perm: Permission = refund ? "orders.refund" : "orders.update";
      const summary = refund ? `Refunded ${o.number}` : patch.fulfilmentStatus ? `Marked ${o.number} as ${patch.fulfilmentStatus}` : patch.paymentStatus ? `Set ${o.number} payment to ${patch.paymentStatus.replace("_", " ")}` : `Note added to ${o.number}`;
      if (refund && !canFn(me, "finance.refund")) { flash("Refunds require financial permissions"); return { ok: false, error: "finance.refund" }; }
      return commit(perm, refund ? "finance" : "orders", refund ? "order.refunded" : "order.updated", summary, (d) => ({
        ...d,
        orders: d.orders.map((x) => x.id !== id ? x : {
          ...x, ...("fulfilmentStatus" in patch && patch.fulfilmentStatus ? { fulfilmentStatus: patch.fulfilmentStatus } : {}), ...(patch.paymentStatus ? { paymentStatus: patch.paymentStatus } : {}),
          timeline: [{ at: new Date().toISOString(), message: patch.note ?? summary, actor: `${me.name}` }, ...x.timeline],
        }),
      }), id, diff(o, { ...o, ...patch } as Order, ["fulfilmentStatus", "paymentStatus"]));
    },
    saveDiscount: (dsc) => {
      const exists = s.discounts.some((x) => x.id === dsc.id);
      return commit(exists ? "discounts.update" : "discounts.create", "discounts", exists ? "discount.updated" : "discount.created", `${exists ? "Updated" : "Created"} discount ${dsc.code}`,
        (d) => ({ ...d, discounts: exists ? d.discounts.map((x) => (x.id === dsc.id ? dsc : x)) : [dsc, ...d.discounts] }), dsc.id);
    },
    saveCategory: (c) => {
      const exists = s.categories.some((x) => x.id === c.id);
      return commit(exists ? "products.update" : "products.create", "products", "category.saved", `Saved category ${c.name}`, (d) => ({ ...d, categories: exists ? d.categories.map((x) => (x.id === c.id ? c : x)) : [...d.categories, c] }), c.id);
    },
    saveCollection: (c) => {
      const exists = s.collections.some((x) => x.id === c.id);
      return commit(exists ? "content.update" : "content.create", "content", "collection.saved", `Saved collection ${c.name}`, (d) => ({ ...d, collections: exists ? d.collections.map((x) => (x.id === c.id ? c : x)) : [...d.collections, c] }), c.id);
    },
    saveHomepage: (h) => commit("content.update", "content", "content.homepage_updated", "Updated homepage content", (d) => ({ ...d, homepage: h }), undefined, diff(s.homepage, h, ["announcement", "hero", "statement", "story", "quote"])),
    saveSettings: (st, shipping) => commit("settings.update", "settings", "settings.updated", "Updated store settings", (d) => ({ ...d, settings: st, shipping: shipping ?? d.shipping }), undefined, diff(s.settings, st, ["storeName", "supportEmail", "defaultMarketId", "lowStockThreshold", "payments", "exchangeRates"])),
    inviteStaff: (m) => commit("team.manage", "team", "team.invited", `Invited ${m.email} as ${ROLES[m.roleId].name}`, (d) => ({ ...d, staff: [...d.staff, { ...m, id: `stf_${d.staff.length + 1}_${seq.current}`, status: "invited", lastActiveAt: null, avatarTone: "#C7B49D" }] })),
    changeRole: (id, roleId) => {
      const m = s.staff.find((x) => x.id === id)!;
      if (m.roleId === "owner") { flash("The owner's role can't be changed here"); return { ok: false, error: "owner" }; }
      if (!ROLES[me.roleId].canAssign.includes(roleId)) { flash(`${ROLES[me.roleId].name} can't assign ${ROLES[roleId].name}`); return { ok: false, error: "assign" }; }
      return commit("team.manage", "team", "team.role_changed", `Changed ${m.name}'s role to ${ROLES[roleId].name}`, (d) => ({ ...d, staff: d.staff.map((x) => (x.id === id ? { ...x, roleId } : x)) }), id, { roleId: { from: m.roleId, to: roleId } });
    },
  }), [s, me, can, commit]);

  return <Ctx.Provider value={{ ...s, ...api, me, toast }}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside <AdminProvider>");
  return v;
}
