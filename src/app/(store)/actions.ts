"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import * as accounts from "@/server/auth/accounts";
import { customerActor, requireCustomer } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { mergeGuestCart } from "@/server/commerce/cart";
import { mergeGuestWishlist } from "@/server/commerce/wishlist";
import { AppError, newId, rethrowIfNext, toFailure, type ActionResult } from "@/server/lib/core";
import { submitContact, subscribe } from "@/server/marketing";
import { addressSchema, findOrderForTracking, placeOrder, type CheckoutInput } from "@/server/orders/checkout";
import { orderView, type OrderView } from "@/server/orders/view";

const safeNext = (v: FormDataEntryValue | null, fallback = "/account") => {
  const p = typeof v === "string" ? v : "";
  return p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/admin") ? p : fallback;
};
const str = (f: FormData, k: string) => String(f.get(k) ?? "");

/* ───────────── Newsletter & contact ───────────── */

export async function subscribeNewsletter(form: FormData): Promise<ActionResult> {
  try {
    await subscribe(str(form, "email"), str(form, "source") || "footer", str(form, "cf-turnstile-response") || null);
    return { ok: true };
  } catch (e) {
    return toFailure(e);
  }
}

export async function contactAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await submitContact({ name: str(form, "name"), email: str(form, "email"), orderNumber: str(form, "orderNumber"), subject: str(form, "subject"), message: str(form, "message"), website: str(form, "website") }, str(form, "cf-turnstile-response") || null);
    return { ok: true, message: "Thank you — we've received your message and will reply within one working day." };
  } catch (e) {
    return toFailure(e);
  }
}

/* ───────────── Customer authentication ───────────── */

async function afterLogin(userId: string) {
  await mergeGuestCart(userId);
  await mergeGuestWishlist(userId);
}

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let next = "/account";
  try {
    const { id } = await accounts.loginCustomer(str(form, "email"), str(form, "password"));
    await afterLogin(id);
    next = safeNext(form.get("next"));
  } catch (e) {
    return toFailure(e);
  }
  redirect(next);
}

export async function registerAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let next = "/account";
  try {
    const { id } = await accounts.registerCustomer({ firstName: str(form, "firstName"), lastName: str(form, "lastName"), email: str(form, "email"), password: str(form, "password"), marketingConsent: form.get("marketingConsent") === "on" });
    await afterLogin(id);
    next = safeNext(form.get("next"));
  } catch (e) {
    return toFailure(e);
  }
  redirect(next);
}

export async function logoutAction() {
  await accounts.logoutCustomer();
  redirect("/");
}

export async function forgotPasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await accounts.requestPasswordReset("customer", str(form, "email"));
    return { ok: true, message: "If an account exists for this email, we've sent a link to reset your password. It expires in 60 minutes." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function resetPasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    if (str(form, "password") !== str(form, "confirm")) throw new AppError("The passwords don't match.");
    await accounts.resetPassword(str(form, "token"), str(form, "password"));
  } catch (e) {
    return toFailure(e);
  }
  redirect("/account/login?reset=1");
}

export async function resendVerificationAction(): Promise<ActionResult> {
  try {
    const c = await requireCustomer();
    if (c.emailVerified) return { ok: true, message: "Your email is already confirmed." };
    await accounts.sendVerification(c.id, c.email, c.firstName);
    return { ok: true, message: `We've sent a new confirmation link to ${c.email}.` };
  } catch (e) {
    return toFailure(e);
  }
}

/* ───────────── Customer account ───────────── */

const profileSchema = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), phone: z.string().trim().max(32).regex(/^[+()\d\s-]*$/, "Use digits, spaces and + only") });

export async function updateProfileAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const c = await requireCustomer();
    const d = profileSchema.parse({ firstName: str(form, "firstName"), lastName: str(form, "lastName"), phone: str(form, "phone") });
    await db.update(s.users).set({ firstName: d.firstName, lastName: d.lastName, phone: d.phone || null }).where(eq(s.users.id, c.id));
    return { ok: true, message: "Your details have been saved." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function changePasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const c = await requireCustomer();
    if (str(form, "password") !== str(form, "confirm")) throw new AppError("The new passwords don't match.");
    await accounts.changeCustomerPassword(c.id, str(form, "current"), str(form, "password"));
    await audit(customerActor(c), "customer.password_changed", "user", c.id, "Password changed; other sessions signed out");
    return { ok: true, message: "Password changed. You've been signed out on other devices." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function saveAddressAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const c = await requireCustomer();
    const a = addressSchema.parse({ firstName: str(form, "firstName"), lastName: str(form, "lastName"), line1: str(form, "line1"), line2: str(form, "line2"), city: str(form, "city"), region: str(form, "region"), postalCode: str(form, "postalCode"), countryCode: str(form, "countryCode"), phone: str(form, "phone") });
    const id = str(form, "id");
    const label = str(form, "label").trim().slice(0, 40) || "Home";
    const makeDefault = form.get("isDefault") === "on";
    await db.transaction(async (tx) => {
      if (makeDefault) await tx.update(s.customerAddresses).set({ isDefault: false }).where(eq(s.customerAddresses.userId, c.id));
      const values = { label, firstName: a.firstName, lastName: a.lastName, line1: a.line1, line2: a.line2 || null, city: a.city, region: a.region || null, postalCode: a.postalCode || null, countryCode: a.countryCode, phone: a.phone, ...(makeDefault ? { isDefault: true } : {}) };
      if (id) {
        const r = await tx.update(s.customerAddresses).set(values).where(and(eq(s.customerAddresses.id, id), eq(s.customerAddresses.userId, c.id)));
        if (!(r as unknown as [{ affectedRows: number }])[0].affectedRows) throw new AppError("Address not found.");
      } else {
        const existing = await tx.select({ id: s.customerAddresses.id }).from(s.customerAddresses).where(eq(s.customerAddresses.userId, c.id));
        if (existing.length >= 10) throw new AppError("You can save up to 10 addresses.");
        await tx.insert(s.customerAddresses).values({ id: newId("cad"), userId: c.id, ...values, isDefault: makeDefault || existing.length === 0 });
      }
    });
    return { ok: true, message: "Address saved." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  try {
    const c = await requireCustomer();
    await db.delete(s.customerAddresses).where(and(eq(s.customerAddresses.id, id), eq(s.customerAddresses.userId, c.id)));
    return { ok: true, message: "Address removed." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function notificationPrefsAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const c = await requireCustomer();
    const prefs = { orderUpdates: true, newsletter: form.get("newsletter") === "on", backInStock: form.get("backInStock") === "on" };
    await db.insert(s.customerProfiles).values({ userId: c.id, notificationPrefs: prefs, tags: [] }).onDuplicateKeyUpdate({ set: { notificationPrefs: prefs } });
    await db.update(s.users).set({ marketingConsent: prefs.newsletter }).where(eq(s.users.id, c.id));
    if (prefs.newsletter) await subscribe(c.email, "account").catch(() => undefined);
    else await db.update(s.newsletterSubscribers).set({ status: "unsubscribed", unsubscribedAt: new Date() }).where(eq(s.newsletterSubscribers.email, c.email));
    return { ok: true, message: prefs.newsletter ? "Preferences saved. Check your inbox to confirm the newsletter." : "Preferences saved." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function requestDeletionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const c = await requireCustomer();
    if (str(form, "confirm") !== "DELETE") throw new AppError("Type DELETE to confirm.");
    const [pending] = await db.select({ id: s.accountDeletionRequests.id }).from(s.accountDeletionRequests).where(and(eq(s.accountDeletionRequests.userId, c.id), eq(s.accountDeletionRequests.status, "pending")));
    if (pending) return { ok: true, message: "Your request is already with our team." };
    await db.insert(s.accountDeletionRequests).values({ id: newId("del"), userId: c.id, reason: str(form, "reason").slice(0, 500) });
    await audit(customerActor(c), "customer.deletion_requested", "user", c.id, `Account deletion requested by ${c.email}`);
    return { ok: true, message: "We've received your request. Our team will confirm by email within 30 days; order records required by law are kept." };
  } catch (e) {
    return toFailure(e);
  }
}

/* ───────────── Checkout ───────────── */

export async function placeOrderAction(input: CheckoutInput): Promise<{ ok: true; url: string } | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: string }> {
  try {
    const r = await placeOrder(input);
    return { ok: true, url: r.url };
  } catch (e) {
    rethrowIfNext(e);
    const f = toFailure(e);
    return { ...f, code: (e as AppError)?.code };
  }
}

export async function trackOrderAction(_prev: unknown, form: FormData): Promise<ActionResult<OrderView>> {
  try {
    const o = await findOrderForTracking(str(form, "number"), str(form, "email"));
    if (!o) throw new AppError("We couldn't find an order with these details. Check the order number and the email used at checkout.");
    const view = await orderView(o.id);
    return { ok: true, data: view! };
  } catch (e) {
    rethrowIfNext(e);
    return toFailure(e);
  }
}
