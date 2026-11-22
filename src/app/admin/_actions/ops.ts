"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { audit, diff } from "@/server/audit";
import { revokeAllSessions, staffActor } from "@/server/auth/session";
import { ALL_PERMISSIONS } from "@/server/auth/permissions";
import { f, invalidate, studioAction } from "@/server/admin/guard";
import { normaliseCode } from "@/server/commerce/coupons";
import { processEmailQueue, retryNotifications, sendEmail } from "@/server/email";
import { AppError, isProduction, newId, normaliseEmail, randomToken, sha256, siteUrl } from "@/server/lib/core";
import { getSettings, saveSettings, type StoreSettingsValue } from "@/server/settings";
import { CURRENCIES } from "@/types";

const moneyMap = (form: FormData, prefix: string) => Object.fromEntries(CURRENCIES.map((c) => [c, f.money(form, `${prefix}_${c}`)]).filter(([, v]) => v !== null && (v as number) > 0)) as Record<string, number>;

/* ─────────────── Coupons ─────────────── */

export const saveCouponAction = studioAction("coupons.manage", async (staff, form) => {
  const id = f.opt(form, "id");
  const code = normaliseCode(f.str(form, "code"));
  if (!/^[A-Z0-9-]{3,40}$/.test(code)) throw new AppError("Codes are 3–40 letters, numbers or hyphens.");
  const [dupe] = await db.select({ id: s.coupons.id }).from(s.coupons).where(eq(s.coupons.code, code));
  if (dupe && dupe.id !== id) throw new AppError("This code already exists.");
  const type = f.str(form, "type") as "percentage" | "fixed" | "free_shipping";
  if (!["percentage", "fixed", "free_shipping"].includes(type)) throw new AppError("Choose a discount type.");
  const pct = Number(f.str(form, "percent") || 0);
  if (type === "percentage" && !(pct > 0 && pct <= 90)) throw new AppError("Percentage must be between 1 and 90.");
  const fixedAmounts = moneyMap(form, "fixed");
  if (type === "fixed" && !Object.keys(fixedAmounts).length) throw new AppError("Set the fixed amount for at least one currency.");
  const startsAt = f.date(form, "startsAt"), endsAt = f.date(form, "endsAt");
  if (startsAt && endsAt && endsAt <= startsAt) throw new AppError("The end date must be after the start date.");
  const appliesTo = (["all", "products", "categories"].includes(f.str(form, "appliesTo")) ? f.str(form, "appliesTo") : "all") as "all" | "products" | "categories";
  const row = {
    code, description: f.str(form, "description", 255), type, percentBps: type === "percentage" ? Math.round(pct * 100) : 0, fixedAmounts: type === "fixed" ? fixedAmounts : {},
    minimumSubtotals: moneyMap(form, "min"), maximumDiscounts: moneyMap(form, "max"), marketIds: f.list(form, "marketIds"), appliesTo,
    productIds: appliesTo === "products" ? f.list(form, "productIds") : [], categoryIds: appliesTo === "categories" ? f.list(form, "categoryIds") : [],
    firstOrderOnly: f.bool(form, "firstOrderOnly"), usageLimit: f.int(form, "usageLimit"), perCustomerLimit: f.int(form, "perCustomerLimit"), startsAt, endsAt, active: f.bool(form, "active"),
  };
  if (appliesTo !== "all" && !row.productIds.length && !row.categoryIds.length) throw new AppError("Choose the products or categories this code applies to.");
  if (id) {
    const [before] = await db.select().from(s.coupons).where(eq(s.coupons.id, id));
    await db.update(s.coupons).set(row).where(eq(s.coupons.id, id));
    await audit(staffActor(staff), "coupon.updated", "coupon", id, `Updated coupon ${code}`, diff(before as never, row as never, ["code", "type", "percentBps", "fixedAmounts", "active", "usageLimit", "startsAt", "endsAt"]));
  } else {
    const nid = newId("cpn");
    await db.insert(s.coupons).values({ id: nid, ...row });
    await audit(staffActor(staff), "coupon.created", "coupon", nid, `Created coupon ${code}`);
  }
  return "Coupon saved.";
});

export const toggleCouponAction = studioAction("coupons.manage", async (staff, form) => {
  const id = f.str(form, "id");
  const [c] = await db.select().from(s.coupons).where(eq(s.coupons.id, id));
  if (!c) throw new AppError("Coupon not found.");
  if (f.str(form, "op") === "delete") {
    const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(s.couponRedemptions).where(eq(s.couponRedemptions.couponId, id));
    if (Number(n) > 0) throw new AppError("This code has been used, so it can't be deleted. Deactivate it instead.");
    await db.delete(s.coupons).where(eq(s.coupons.id, id));
    await audit(staffActor(staff), "coupon.deleted", "coupon", id, `Deleted coupon ${c.code}`);
    return "Coupon deleted.";
  }
  await db.update(s.coupons).set({ active: !c.active }).where(eq(s.coupons.id, id));
  await audit(staffActor(staff), "coupon.updated", "coupon", id, `${c.active ? "Deactivated" : "Activated"} coupon ${c.code}`, { active: { from: c.active, to: !c.active } });
  return c.active ? "Coupon deactivated." : "Coupon activated.";
});

/* ─────────────── Customers ─────────────── */

export const customerNoteAction = studioAction("customers.update", async (staff, form) => {
  const body = f.str(form, "body", 5000);
  if (!body) throw new AppError("Write a note first.");
  const userId = f.str(form, "userId");
  await db.insert(s.customerNotes).values({ id: newId("cnt"), userId, staffUserId: staff.id, kind: f.str(form, "kind") === "support" ? "support" : "note", body });
  await audit(staffActor(staff), "customer.note_added", "user", userId, "Added customer note");
  return "Note added.";
});

export const customerStatusAction = studioAction("customers.suspend", async (staff, form) => {
  const userId = f.str(form, "userId");
  const status = f.str(form, "status") as "active" | "suspended";
  if (!["active", "suspended"].includes(status)) throw new AppError("Unknown status.");
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId));
  if (!u) throw new AppError("Customer not found.");
  await db.update(s.users).set({ status }).where(eq(s.users.id, userId));
  if (status === "suspended") await revokeAllSessions("customer", userId);
  await audit(staffActor(staff), `customer.${status === "suspended" ? "suspended" : "reactivated"}`, "user", userId, `${status === "suspended" ? "Suspended" : "Reactivated"} ${u.email}`);
  return status === "suspended" ? "Account suspended and signed out." : "Account reactivated.";
});

/** Completes a deletion request: anonymises the profile; orders are kept (legal retention) without PII links. */
export const completeDeletionAction = studioAction("customers.suspend", async (staff, form) => {
  const id = f.str(form, "requestId");
  const [r] = await db.select().from(s.accountDeletionRequests).where(eq(s.accountDeletionRequests.id, id));
  if (!r || r.status !== "pending") throw new AppError("Request not found or already handled.");
  if (f.str(form, "op") === "reject") {
    await db.update(s.accountDeletionRequests).set({ status: "rejected", handledBy: staff.id }).where(eq(s.accountDeletionRequests.id, id));
    await audit(staffActor(staff), "customer.deletion_rejected", "user", r.userId, "Deletion request rejected");
    return "Request rejected.";
  }
  const [u] = await db.select().from(s.users).where(eq(s.users.id, r.userId));
  await db.transaction(async (tx) => {
    await tx.delete(s.customerAddresses).where(eq(s.customerAddresses.userId, r.userId));
    await tx.delete(s.wishlists).where(eq(s.wishlists.userId, r.userId));
    await tx.delete(s.carts).where(eq(s.carts.userId, r.userId));
    await tx.delete(s.recentlyViewedProducts).where(eq(s.recentlyViewedProducts.userId, r.userId));
    await tx.update(s.orders).set({ userId: null, marketingConsent: false }).where(eq(s.orders.userId, r.userId));
    if (u) await tx.delete(s.newsletterSubscribers).where(eq(s.newsletterSubscribers.email, u.email));
    await tx.update(s.users).set({ email: `deleted+${r.userId}@invalid.local`, firstName: "Deleted", lastName: "Customer", phone: null, passwordHash: null, status: "deactivated", marketingConsent: false }).where(eq(s.users.id, r.userId));
    await tx.update(s.accountDeletionRequests).set({ status: "completed", handledBy: staff.id }).where(eq(s.accountDeletionRequests.id, id));
  });
  await revokeAllSessions("customer", r.userId);
  await audit(staffActor(staff), "customer.deleted", "user", r.userId, "Customer account anonymised on request (orders retained)");
  return "Account anonymised. Order records are kept without the customer link.";
});

/* ─────────────── Shipping ─────────────── */

export const saveZoneAction = studioAction("shipping.manage", async (staff, form) => {
  const id = f.opt(form, "id");
  const countries = f.str(form, "countries").toUpperCase().split(/[,\s]+/).filter((c) => /^[A-Z]{2}$/.test(c));
  if (!countries.length) throw new AppError("Add at least one ISO country code (e.g. PK, GB).");
  const row = { name: f.str(form, "name", 80), marketId: f.str(form, "marketId"), countries, cities: f.str(form, "cities").split(",").map((x) => x.trim()).filter(Boolean), active: f.bool(form, "active"), sortOrder: f.int(form, "sortOrder") ?? 0 };
  if (!row.name || !row.marketId) throw new AppError("Name and market are required.");
  if (id) await db.update(s.shippingZones).set(row).where(eq(s.shippingZones.id, id));
  else await db.insert(s.shippingZones).values({ id: newId("zone"), ...row });
  await audit(staffActor(staff), "shipping.zone_saved", "shipping_zone", id, `Saved shipping zone ${row.name}`);
  invalidate("commerce");
  return "Zone saved.";
});

export const saveMethodAction = studioAction("shipping.manage", async (staff, form) => {
  const id = f.opt(form, "id");
  const zoneId = f.str(form, "zoneId");
  const [zone] = await db.select().from(s.shippingZones).where(eq(s.shippingZones.id, zoneId));
  if (!zone) throw new AppError("Choose a zone.");
  const [market] = await db.select().from(s.markets).where(eq(s.markets.id, zone.marketId));
  const rate = f.money(form, "rate");
  if (rate === null) throw new AppError("Set the delivery charge (0 for free).");
  const minDays = f.int(form, "minDays") ?? 1, maxDays = f.int(form, "maxDays") ?? minDays;
  if (maxDays < minDays) throw new AppError("Maximum days must be at least the minimum.");
  const tpl = f.opt(form, "trackingUrlTemplate", 255);
  if (tpl && !tpl.startsWith("https://")) throw new AppError("Tracking link templates must start with https://");
  const row = {
    zoneId, label: f.str(form, "label", 80), description: f.str(form, "description", 200), carrier: f.str(form, "carrier", 60), currency: market.currency, rate,
    freeOver: f.money(form, "freeOver"), codAvailable: f.bool(form, "codAvailable"), minDays, maxDays, cities: f.str(form, "cities").split(",").map((x) => x.trim()).filter(Boolean),
    trackingUrlTemplate: tpl, active: f.bool(form, "active"), sortOrder: f.int(form, "sortOrder") ?? 0,
  };
  if (!row.label) throw new AppError("Give the method a name.");
  if (id) await db.update(s.shippingMethods).set(row).where(eq(s.shippingMethods.id, id));
  else await db.insert(s.shippingMethods).values({ id: newId("shm"), ...row });
  await audit(staffActor(staff), "shipping.method_saved", "shipping_method", id, `Saved shipping method ${row.label} (${market.currency} ${rate / 100})`);
  invalidate("commerce");
  return "Delivery method saved.";
});

/* ─────────────── Payments ─────────────── */

export const savePaymentMethodAction = studioAction("payments.manage", async (staff, form) => {
  const id = f.str(form, "id");
  const [before] = await db.select().from(s.paymentMethods).where(eq(s.paymentMethods.id, id));
  if (!before) throw new AppError("Payment method not found.");
  const row = { label: f.str(form, "label", 80), description: f.str(form, "description", 255), marketIds: f.list(form, "marketIds"), enabled: f.bool(form, "enabled"), mode: (f.str(form, "mode") === "live" ? "live" : "test") as "live" | "test", limits: moneyMap(form, "limit"), sortOrder: f.int(form, "sortOrder") ?? before.sortOrder };
  if (row.enabled && before.provider === "test" && isProduction()) throw new AppError("The test gateway can't be enabled in production.");
  await db.update(s.paymentMethods).set(row).where(eq(s.paymentMethods.id, id));
  await audit(staffActor(staff), "payments.method_updated", "payment_method", id, `Updated payment method ${row.label}`, diff(before as never, row as never, ["enabled", "marketIds", "mode", "limits"]));
  invalidate("commerce");
  return "Payment method saved.";
});

/* ─────────────── Staff & roles ─────────────── */

export const inviteStaffAction = studioAction("staff.manage", async (staff, form) => {
  const email = normaliseEmail(f.str(form, "email", 254));
  const name = f.str(form, "name", 120);
  const roleIds = f.list(form, "roleIds");
  if (!/^\S+@\S+\.\S+$/.test(email) || !name) throw new AppError("Name and a valid email are required.");
  if (!roleIds.length) throw new AppError("Assign at least one role.");
  const [exists] = await db.select({ id: s.staffUsers.id }).from(s.staffUsers).where(eq(s.staffUsers.email, email));
  if (exists) throw new AppError("A staff account with this email already exists.");
  const id = newId("stf");
  const token = randomToken();
  const roles = await db.select().from(s.roles).where(inArray(s.roles.id, roleIds));
  if (roles.some((r) => r.key === "super_admin") && !staff.isSuperAdmin) throw new AppError("Only a Super Admin can grant Super Admin.");
  await db.transaction(async (tx) => {
    await tx.insert(s.staffUsers).values({ id, email, name, status: "invited", invitedBy: staff.id, isSuperAdmin: roles.some((r) => r.key === "super_admin") });
    await tx.insert(s.staffRoleAssignments).values(roles.map((r) => ({ staffUserId: id, roleId: r.id, assignedBy: staff.id })));
    await tx.insert(s.passwordResetTokens).values({ id: newId("prt"), tokenHash: sha256(token), subject: "staff", staffUserId: id, purpose: "invite", expiresAt: new Date(Date.now() + 72 * 3600_000) });
  });
  const link = siteUrl(`/admin/reset-password?invite=1&token=${token}`);
  const st = await sendEmail("staff_invite", email, { name, invitedBy: staff.name, role: roles.map((r) => r.name).join(", "), actionUrl: link, actionLabel: "Activate your account" });
  await audit(staffActor(staff), "staff.invited", "staff_user", id, `Invited ${email} as ${roles.map((r) => r.name).join(", ")}`);
  if (st === "sent") return `Invitation emailed to ${email}.`;
  return { ok: true, message: `Account created, but the invitation email was not sent (${st === "skipped" ? "no email provider configured" : "provider error"}). Share this one-time link securely — it expires in 72 hours: ${link}` };
});

export const updateStaffAction = studioAction("staff.manage", async (staff, form) => {
  const id = f.str(form, "id");
  const [u] = await db.select().from(s.staffUsers).where(eq(s.staffUsers.id, id));
  if (!u) throw new AppError("Staff member not found.");
  const op = f.str(form, "op");
  if (op === "roles") {
    const roleIds = f.list(form, "roleIds");
    const roles = await db.select().from(s.roles).where(inArray(s.roles.id, roleIds.length ? roleIds : ["__none__"]));
    const superAdmin = roles.some((r) => r.key === "super_admin");
    if (superAdmin !== u.isSuperAdmin && !staff.isSuperAdmin) throw new AppError("Only a Super Admin can grant or remove Super Admin.");
    if (u.id === staff.id && u.isSuperAdmin && !superAdmin) throw new AppError("You can't remove your own Super Admin role.");
    if (u.isSuperAdmin && !superAdmin) {
      const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(s.staffUsers).where(and(eq(s.staffUsers.isSuperAdmin, true), eq(s.staffUsers.status, "active"), ne(s.staffUsers.id, id)));
      if (Number(n) === 0) throw new AppError("At least one active Super Admin is required.");
    }
    const before = (await db.select({ roleId: s.staffRoleAssignments.roleId }).from(s.staffRoleAssignments).where(eq(s.staffRoleAssignments.staffUserId, id))).map((r) => r.roleId);
    await db.transaction(async (tx) => {
      await tx.delete(s.staffRoleAssignments).where(eq(s.staffRoleAssignments.staffUserId, id));
      if (roles.length) await tx.insert(s.staffRoleAssignments).values(roles.map((r) => ({ staffUserId: id, roleId: r.id, assignedBy: staff.id })));
      await tx.update(s.staffUsers).set({ isSuperAdmin: superAdmin }).where(eq(s.staffUsers.id, id));
    });
    await audit(staffActor(staff), "staff.roles_changed", "staff_user", id, `Roles for ${u.email}: ${roles.map((r) => r.name).join(", ") || "none"}`, { roles: { from: before, to: roles.map((r) => r.id) } });
    return "Roles updated.";
  }
  if (op === "deactivate" || op === "activate") {
    if (u.id === staff.id) throw new AppError("You can't change your own account status.");
    if (op === "deactivate" && u.isSuperAdmin) {
      const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(s.staffUsers).where(and(eq(s.staffUsers.isSuperAdmin, true), eq(s.staffUsers.status, "active"), ne(s.staffUsers.id, id)));
      if (Number(n) === 0) throw new AppError("At least one active Super Admin is required.");
    }
    if (op === "activate" && !u.passwordHash) throw new AppError("This person hasn't accepted their invitation yet. Use Reset access to send a new link.");
    await db.update(s.staffUsers).set({ status: op === "deactivate" ? "deactivated" : "active", failedLoginCount: 0, lockedUntil: null }).where(eq(s.staffUsers.id, id));
    if (op === "deactivate") await revokeAllSessions("staff", id);
    await audit(staffActor(staff), `staff.${op}d`, "staff_user", id, `${op === "deactivate" ? "Deactivated" : "Activated"} ${u.email}`);
    return op === "deactivate" ? "Account deactivated and signed out everywhere." : "Account activated.";
  }
  if (op === "reset") {
    const token = randomToken();
    await db.insert(s.passwordResetTokens).values({ id: newId("prt"), tokenHash: sha256(token), subject: "staff", staffUserId: id, purpose: u.passwordHash ? "reset" : "invite", expiresAt: new Date(Date.now() + 24 * 3600_000) });
    await revokeAllSessions("staff", id);
    await db.update(s.staffUsers).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(s.staffUsers.id, id));
    const link = siteUrl(`/admin/reset-password?${u.passwordHash ? "" : "invite=1&"}token=${token}`);
    const st = await sendEmail(u.passwordHash ? "password_reset" : "staff_invite", u.email, { name: u.name, invitedBy: staff.name, role: "", actionUrl: link, actionLabel: "Set your password" });
    await audit(staffActor(staff), "staff.access_reset", "staff_user", id, `Reset access for ${u.email} (sessions revoked)`);
    return st === "sent" ? `Reset link emailed to ${u.email}; all sessions signed out.` : { ok: true, message: `Sessions signed out. The email was not sent (${st}); share this one-time link securely (24 h): ${link}` };
  }
  throw new AppError("Unknown action.");
});

export const saveRoleAction = studioAction("staff.manage", async (staff, form) => {
  if (!staff.isSuperAdmin) throw new AppError("Only a Super Admin can edit role permissions.");
  const id = f.opt(form, "id");
  const perms = f.list(form, "permissions").filter((p) => (ALL_PERMISSIONS as string[]).includes(p));
  const name = f.str(form, "name", 80);
  if (!name) throw new AppError("Name the role.");
  let roleId = id;
  if (id) {
    const [r] = await db.select().from(s.roles).where(eq(s.roles.id, id));
    if (r?.key === "super_admin") throw new AppError("Super Admin always has every permission.");
    await db.update(s.roles).set({ name, description: f.str(form, "description", 300) }).where(eq(s.roles.id, id));
  } else {
    roleId = newId("role");
    await db.insert(s.roles).values({ id: roleId, key: `custom_${roleId.slice(-8).toLowerCase()}`, name, description: f.str(form, "description", 300), isSystem: false });
  }
  const before = (await db.select({ p: s.rolePermissions.permissionKey }).from(s.rolePermissions).where(eq(s.rolePermissions.roleId, roleId!))).map((r) => r.p);
  await db.transaction(async (tx) => {
    await tx.delete(s.rolePermissions).where(eq(s.rolePermissions.roleId, roleId!));
    if (perms.length) await tx.insert(s.rolePermissions).values(perms.map((p) => ({ roleId: roleId!, permissionKey: p })));
  });
  await audit(staffActor(staff), "staff.role_permissions_changed", "role", roleId, `Permissions for role ${name}: ${perms.length}`, { added: { from: null, to: perms.filter((p) => !before.includes(p)) }, removed: { from: before.filter((p) => !perms.includes(p)), to: null } });
  return "Role saved. Changes apply on the next request.";
});

/* ─────────────── Settings ─────────────── */

const href = (v: string) => (v && !/^(\/(?!\/)|https:\/\/)/.test(v) ? (() => { throw new AppError(`Links must start with / or https:// (“${v}”).`); })() : v);
const https = (v: string) => (v && !v.startsWith("https://") ? (() => { throw new AppError(`Social links must start with https:// (“${v}”).`); })() : v);

export const saveSettingsAction = studioAction("settings.manage", async (staff, form) => {
  const before = await getSettings();
  const group = f.str(form, "group");
  const patch: Partial<StoreSettingsValue> = {};
  if (group === "store") {
    Object.assign(patch, { storeName: f.str(form, "storeName", 120), legalName: f.str(form, "legalName", 200), supportEmail: f.str(form, "supportEmail", 254), supportPhone: f.str(form, "supportPhone", 40), whatsapp: f.str(form, "whatsapp", 40), address: f.str(form, "address", 500), logoMediaId: f.opt(form, "logoMediaId") });
    if (!/^\S+@\S+\.\S+$/.test(patch.supportEmail!)) throw new AppError("Enter a valid support email.");
    patch.social = { instagram: https(f.str(form, "instagram", 300)), facebook: https(f.str(form, "facebook", 300)), pinterest: https(f.str(form, "pinterest", 300)), tiktok: https(f.str(form, "tiktok", 300)) };
  } else if (group === "storefront") {
    patch.announcement = { enabled: f.bool(form, "announcementEnabled"), message: f.str(form, "announcementMessage", 300), href: href(f.str(form, "announcementHref", 300)) };
    patch.footer = { about: f.str(form, "footerAbout", 500), copyright: f.str(form, "footerCopyright", 120) };
    patch.paymentNote = f.str(form, "paymentNote", 200);
    patch.maintenance = { enabled: f.bool(form, "maintenanceEnabled"), message: f.str(form, "maintenanceMessage", 300) };
  } else if (group === "seo") {
    patch.seo = { title: f.str(form, "seoTitle", 160), description: f.str(form, "seoDescription", 320), ogImageId: f.opt(form, "ogImageId") };
  } else if (group === "commerce") {
    const market = f.str(form, "defaultMarketId");
    const [m] = await db.select().from(s.markets).where(eq(s.markets.id, market));
    if (!m) throw new AppError("Choose a market.");
    patch.defaultMarketId = market;
    patch.orderNumberPrefix = f.str(form, "orderNumberPrefix", 8).toUpperCase().replace(/[^A-Z0-9-]/g, "") || "NS-";
    patch.lowStockThreshold = Math.max(0, f.int(form, "lowStockThreshold") ?? 3);
    patch.checkout = { guestCheckout: f.bool(form, "guestCheckout"), reservationMinutes: Math.min(120, Math.max(10, f.int(form, "reservationMinutes") ?? 30)), maxQuantityPerLine: Math.min(50, Math.max(1, f.int(form, "maxQuantityPerLine") ?? 10)) };
  } else throw new AppError("Unknown settings group.");
  await saveSettings(patch, staff.id);
  await audit(staffActor(staff), "settings.updated", "settings", group, `Updated ${group} settings`, diff(before as never, patch as never, Object.keys(patch) as never));
  invalidate("content", "commerce");
  return "Settings saved.";
});

export const saveCurrencyAction = studioAction("settings.manage", async (staff, form) => {
  const code = f.str(form, "code");
  const rate = Number(f.str(form, "rate"));
  if (!(rate > 0)) throw new AppError("Rate must be a positive number (units per 1 PKR).");
  await db.update(s.currencies).set({ rateFromPkrMicros: Math.round(rate * 1_000_000), active: code === "PKR" ? true : f.bool(form, "active") }).where(eq(s.currencies.code, code));
  await audit(staffActor(staff), "settings.currency_updated", "currency", code, `Currency ${code}: rate ${rate}`);
  invalidate("catalog", "commerce");
  return "Currency saved.";
});

export const saveMarketAction = studioAction("settings.manage", async (staff, form) => {
  const id = f.str(form, "id");
  await db.update(s.markets).set({ name: f.str(form, "name", 80), active: f.bool(form, "active") }).where(eq(s.markets.id, id));
  for (const code of f.list(form, "countryCodes")) await db.update(s.countries).set({ active: f.bool(form, `country_${code}`) }).where(eq(s.countries.code, code));
  await audit(staffActor(staff), "settings.market_updated", "market", id, `Updated market ${id}`);
  invalidate("commerce");
  return "Market saved.";
});

export const saveTaxAction = studioAction("settings.manage", async (staff, form) => {
  const id = f.opt(form, "id");
  const country = f.str(form, "countryCode").toUpperCase();
  if (!/^([A-Z]{2}|\*)$/.test(country)) throw new AppError("Country must be an ISO code or * for the default.");
  const rate = Number(f.str(form, "rate"));
  if (!(rate >= 0 && rate <= 50)) throw new AppError("Rate must be between 0 and 50%.");
  const row = { countryCode: country, label: f.str(form, "label", 40) || "Tax", rateBps: Math.round(rate * 100), inclusive: f.bool(form, "inclusive"), dutiesOnDelivery: f.bool(form, "dutiesOnDelivery"), active: f.bool(form, "active") };
  const [dupe] = await db.select({ id: s.taxSettings.id }).from(s.taxSettings).where(eq(s.taxSettings.countryCode, country));
  if (dupe && dupe.id !== id) throw new AppError("A rule for this country already exists.");
  if (id) await db.update(s.taxSettings).set(row).where(eq(s.taxSettings.id, id));
  else await db.insert(s.taxSettings).values({ id: newId("tax"), ...row });
  await audit(staffActor(staff), "settings.tax_updated", "tax", country, `Tax ${country}: ${rate}% ${row.inclusive ? "included" : "added"}`);
  invalidate("commerce");
  return "Tax rule saved.";
});

export const saveTemplateAction = studioAction("notifications.manage", async (staff, form) => {
  const key = f.str(form, "key");
  const subject = f.str(form, "subject", 200), body = f.str(form, "body", 8000);
  if (!subject || !body) throw new AppError("Subject and body are required.");
  await db.update(s.notificationTemplates).set({ subject, body, enabled: f.bool(form, "enabled"), updatedBy: staff.id }).where(eq(s.notificationTemplates.key, key));
  await audit(staffActor(staff), "notifications.template_updated", "template", key, `Edited email template ${key}`);
  return "Template saved.";
});

export const sendTestEmailAction = studioAction("notifications.manage", async (staff, form) => {
  const key = f.str(form, "key");
  const st = await sendEmail(key, staff.email, { firstName: staff.name.split(" ")[0], name: staff.name, orderNumber: "NS-TEST", amount: "Rs 1,000", carrier: "TCS", trackingNumber: "TEST123", returnNumber: "R-TEST", returnStatus: "approved", message: "This is a test message.", subjectLine: "Test", reason: "", paymentNote: "", invitedBy: staff.name, role: "Test", actionUrl: siteUrl("/"), actionLabel: "Open the shop" });
  return st === "sent" ? `Test email sent to ${staff.email}.` : { ok: false, error: st === "skipped" ? "Not sent: no email provider configured (set RESEND_API_KEY and EMAIL_FROM)." : "The provider rejected the email — see the log below." };
});

/* ─────────────── Messages & notifications ─────────────── */

export const messageStatusAction = studioAction("notifications.manage", async (staff, form) => {
  const id = f.str(form, "id"), status = f.str(form, "status") as "new" | "open" | "closed";
  if (!["new", "open", "closed"].includes(status)) throw new AppError("Unknown status.");
  await db.update(s.contactMessages).set({ status }).where(eq(s.contactMessages.id, id));
  await audit(staffActor(staff), "message.status", "contact_message", id, `Message marked ${status}`);
  return "Updated.";
});

export const retryEmailsAction = studioAction("notifications.manage", async (staff, form) => {
  const ids = f.list(form, "ids");
  if (ids.length) await retryNotifications(ids);
  else await processEmailQueue(50);
  await audit(staffActor(staff), "notifications.retried", "notification", null, `Retried ${ids.length || "due"} email(s)`);
  return "Retry attempted — see the updated statuses.";
});
