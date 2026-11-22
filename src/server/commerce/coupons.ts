import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db, type Executor } from "../db";
import * as s from "../db/schema";
import { normaliseEmail } from "../lib/core";
import { evaluateCoupon, type CouponOutcome, type CouponRule, type PricedLine } from "./pricing";

export const normaliseCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);

export function toRule(c: typeof s.coupons.$inferSelect): CouponRule {
  return {
    code: c.code, type: c.type, percentBps: c.percentBps, fixedAmounts: c.fixedAmounts, minimumSubtotals: c.minimumSubtotals, maximumDiscounts: c.maximumDiscounts,
    marketIds: c.marketIds, appliesTo: c.appliesTo, productIds: c.productIds, categoryIds: c.categoryIds, firstOrderOnly: c.firstOrderOnly,
    usageLimit: c.usageLimit, perCustomerLimit: c.perCustomerLimit, usageCount: c.usageCount, startsAt: c.startsAt, endsAt: c.endsAt, active: c.active,
  };
}

/** Counts prior non-cancelled orders and prior (non-voided) redemptions for the customer/email. */
export async function customerHistory(exec: Executor, couponId: string | null, who: { userId?: string | null; email?: string | null }) {
  const email = who.email ? normaliseEmail(who.email) : null;
  const whoOrder = or(who.userId ? eq(s.orders.userId, who.userId) : sql`FALSE`, email ? eq(s.orders.email, email) : sql`FALSE`);
  const [{ n: previousOrders }] = await exec.select({ n: sql<number>`COUNT(*)` }).from(s.orders).where(and(whoOrder, ne(s.orders.status, "cancelled")));
  let customerRedemptions = 0;
  if (couponId) {
    const whoRed = or(who.userId ? eq(s.couponRedemptions.userId, who.userId) : sql`FALSE`, email ? eq(s.couponRedemptions.email, email) : sql`FALSE`);
    const [{ n }] = await exec.select({ n: sql<number>`COUNT(*)` }).from(s.couponRedemptions).where(and(eq(s.couponRedemptions.couponId, couponId), isNull(s.couponRedemptions.voidedAt), whoRed));
    customerRedemptions = Number(n);
  }
  return { previousOrders: Number(previousOrders), customerRedemptions };
}

export async function findCoupon(code: string, exec: Executor = db, forUpdate = false) {
  const q = exec.select().from(s.coupons).where(eq(s.coupons.code, normaliseCode(code))).limit(1);
  const [row] = forUpdate ? await q.for("update") : await q;
  return row ?? null;
}

export async function checkCoupon(args: {
  code: string; currency: string; marketId: string; lines: PricedLine[]; userId?: string | null; email?: string | null; format?: (n: number) => string; exec?: Executor; forUpdate?: boolean;
}): Promise<{ coupon: typeof s.coupons.$inferSelect | null; outcome: CouponOutcome }> {
  const exec = args.exec ?? db;
  const coupon = await findCoupon(args.code, exec, args.forUpdate);
  if (!coupon) return { coupon: null, outcome: { ok: false, reason: "We don't recognise this code." } };
  const hist = await customerHistory(exec, coupon.id, { userId: args.userId, email: args.email });
  return {
    coupon,
    outcome: evaluateCoupon(toRule(coupon), { currency: args.currency, marketId: args.marketId, now: new Date(), lines: args.lines, ...hist }, args.format),
  };
}
