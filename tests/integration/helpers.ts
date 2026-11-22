import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { loginStaff, registerCustomer } from "@/server/auth/accounts";
import { requireStaff } from "@/server/auth/session";
import { hashPassword } from "@/server/auth/password";
import { newId } from "@/server/lib/core";

type Jar = Map<string, string>;
export const browser = (globalThis as unknown as { __browser: { fresh(): Jar; use(j: Jar): void; current(): Jar } }).__browser;

export const address = (over: Record<string, string> = {}) => ({ firstName: "Ayesha", lastName: "Khan", line1: "12 Garden Road", line2: "", city: "Lahore", region: "Punjab", postalCode: "54000", countryCode: "PK", phone: "+92 300 1234567", ...over });

export async function staffBrowser(email = "owner@test.local", password = "Atelier-pass-2026!") {
  const jar = browser.fresh();
  await loginStaff(email, password);
  return { jar, staff: await requireStaff() };
}

export async function createStaff(roleKey: string, email: string) {
  const id = newId("stf");
  await db.insert(s.staffUsers).values({ id, email, name: `Test ${roleKey}`, passwordHash: await hashPassword("Staff-pass-2026!"), status: "active" });
  await db.insert(s.staffRoleAssignments).values({ staffUserId: id, roleId: `role-${roleKey}` });
  return id;
}

export async function newCustomer(email: string) {
  const jar = browser.fresh();
  const { id } = await registerCustomer({ firstName: "Test", lastName: "Customer", email, password: "Customer-2026!x", marketingConsent: false });
  return { jar, id };
}

/** A variant of an active product with at least `min` units available. */
export async function variantWithStock(min = 3, skip: string[] = []) {
  const rows = await db.select({ v: s.productVariants, inv: s.inventory, p: s.products }).from(s.productVariants)
    .innerJoin(s.inventory, eq(s.inventory.variantId, s.productVariants.id)).innerJoin(s.products, eq(s.products.id, s.productVariants.productId))
    .where(and(eq(s.products.status, "active"), eq(s.productVariants.active, true)));
  const r = rows.find((x) => x.inv.onHand - x.inv.reserved >= min && !skip.includes(x.v.id) && x.p.categoryId !== "cat-festive");
  if (!r) throw new Error("no stocked variant");
  return { variantId: r.v.id, productId: r.p.id, available: r.inv.onHand - r.inv.reserved };
}

export async function stockOf(variantId: string) {
  const [i] = await db.select().from(s.inventory).where(eq(s.inventory.variantId, variantId));
  return i;
}

export async function setStock(variantId: string, onHand: number) {
  await db.update(s.inventory).set({ onHand, reserved: 0 }).where(eq(s.inventory.variantId, variantId));
}

export const idem = () => `test-${newId("k")}`;
