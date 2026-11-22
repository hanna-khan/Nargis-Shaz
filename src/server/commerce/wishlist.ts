import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "../db";
import * as s from "../db/schema";
import { getCustomer } from "../auth/session";
import { newId, randomToken, sha256 } from "../lib/core";

export const WISH_COOKIE = "ns_wish";
const secure = () => process.env.NODE_ENV === "production" && !process.env.APP_URL?.startsWith("http://");

async function findWishlist() {
  const customer = await getCustomer();
  if (customer) {
    const [w] = await db.select().from(s.wishlists).where(eq(s.wishlists.userId, customer.id)).limit(1);
    return w ?? null;
  }
  const token = (await cookies()).get(WISH_COOKIE)?.value;
  if (!token) return null;
  const [w] = await db.select().from(s.wishlists).where(eq(s.wishlists.tokenHash, sha256(token))).limit(1);
  return w ?? null;
}

async function getOrCreate() {
  const found = await findWishlist();
  if (found) return found;
  const customer = await getCustomer();
  const id = newId("wsh");
  if (customer) await db.insert(s.wishlists).values({ id, userId: customer.id });
  else {
    const token = randomToken();
    await db.insert(s.wishlists).values({ id, tokenHash: sha256(token) });
    (await cookies()).set(WISH_COOKIE, token, { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 });
  }
  return (await db.select().from(s.wishlists).where(eq(s.wishlists.id, id)))[0];
}

export async function wishlistProductIds(): Promise<string[]> {
  const w = await findWishlist();
  if (!w) return [];
  const rows = await db.select({ productId: s.wishlistItems.productId }).from(s.wishlistItems).where(eq(s.wishlistItems.wishlistId, w.id)).orderBy(desc(s.wishlistItems.createdAt));
  return rows.map((r) => r.productId);
}

export async function setWished(productId: string, wished: boolean) {
  const [p] = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.id, productId)).limit(1);
  if (!p) return;
  const w = await getOrCreate();
  if (wished) await db.insert(s.wishlistItems).values({ wishlistId: w.id, productId }).onDuplicateKeyUpdate({ set: { productId } });
  else await db.delete(s.wishlistItems).where(and(eq(s.wishlistItems.wishlistId, w.id), eq(s.wishlistItems.productId, productId)));
}

export async function mergeGuestWishlist(userId: string) {
  const jar = await cookies();
  const token = jar.get(WISH_COOKIE)?.value;
  if (!token) return;
  jar.set(WISH_COOKIE, "", { path: "/", maxAge: 0 });
  const [guest] = await db.select().from(s.wishlists).where(eq(s.wishlists.tokenHash, sha256(token)));
  if (!guest) return;
  const [mine] = await db.select().from(s.wishlists).where(eq(s.wishlists.userId, userId));
  if (!mine) {
    await db.update(s.wishlists).set({ userId, tokenHash: null }).where(eq(s.wishlists.id, guest.id));
    return;
  }
  const items = await db.select().from(s.wishlistItems).where(eq(s.wishlistItems.wishlistId, guest.id));
  for (const it of items) await db.insert(s.wishlistItems).values({ wishlistId: mine.id, productId: it.productId }).onDuplicateKeyUpdate({ set: { productId: it.productId } });
  await db.delete(s.wishlists).where(eq(s.wishlists.id, guest.id));
}

export async function trackRecentlyViewed(productId: string) {
  const c = await getCustomer();
  if (!c) return;
  await db.insert(s.recentlyViewedProducts).values({ userId: c.id, productId, viewedAt: new Date() }).onDuplicateKeyUpdate({ set: { viewedAt: new Date() } });
}

export async function recentlyViewedIds(limit = 12) {
  const c = await getCustomer();
  if (!c) return [];
  const rows = await db.select({ id: s.recentlyViewedProducts.productId }).from(s.recentlyViewedProducts).where(eq(s.recentlyViewedProducts.userId, c.id)).orderBy(desc(s.recentlyViewedProducts.viewedAt)).limit(limit);
  return rows.map((r) => r.id);
}
