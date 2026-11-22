import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db, type Executor, type Tx } from "./db";
import * as s from "./db/schema";
import { AppError, newId } from "./lib/core";

/**
 * Stock is tracked per variant in `inventory` (on_hand, reserved). Every change goes through one of
 * these functions, which use guarded atomic UPDATEs (… WHERE on_hand - reserved >= qty) so two
 * concurrent checkouts can never oversell, and writes an `inventory_movements` row for the history.
 */

type Affected = { affectedRows?: number }[] | { affectedRows?: number };
const affected = (r: unknown) => {
  const x = r as Affected;
  return (Array.isArray(x) ? x[0]?.affectedRows : x.affectedRows) ?? 0;
};

async function onHand(tx: Executor, variantId: string) {
  const [row] = await tx.select({ onHand: s.inventory.onHand }).from(s.inventory).where(eq(s.inventory.variantId, variantId));
  return row?.onHand ?? 0;
}

export interface StockLine { variantId: string; quantity: number; label: string }

/** Reserves stock for an order awaiting online payment. Throws if any line is short. */
export async function reserveStock(tx: Tx, orderId: string, lines: StockLine[], minutes: number) {
  const expiresAt = new Date(Date.now() + minutes * 60_000);
  for (const l of lines) {
    const r = await tx.execute(sql`UPDATE inventory SET reserved = reserved + ${l.quantity} WHERE variant_id = ${l.variantId} AND on_hand - reserved >= ${l.quantity}`);
    if (affected(r) !== 1) throw new AppError(`Sorry — ${l.label} has just sold out in the quantity you chose. Please update your bag.`, "out_of_stock", 409);
    await tx.insert(s.stockReservations).values({ id: newId("rsv"), variantId: l.variantId, orderId, quantity: l.quantity, status: "active", expiresAt });
    await tx.insert(s.inventoryMovements).values({ id: newId("mov"), variantId: l.variantId, type: "reserve", quantity: 0, reservedDelta: l.quantity, onHandAfter: await onHand(tx, l.variantId), orderId, note: "Reserved during checkout" });
  }
}

/** Deducts stock immediately (COD orders, or a confirmed payment without a prior reservation). */
export async function deductStock(tx: Tx, orderId: string, lines: StockLine[]) {
  for (const l of lines) {
    const r = await tx.execute(sql`UPDATE inventory SET on_hand = on_hand - ${l.quantity} WHERE variant_id = ${l.variantId} AND on_hand - reserved >= ${l.quantity}`);
    if (affected(r) !== 1) throw new AppError(`Sorry — ${l.label} has just sold out in the quantity you chose. Please update your bag.`, "out_of_stock", 409);
    await tx.insert(s.inventoryMovements).values({ id: newId("mov"), variantId: l.variantId, type: "sale", quantity: -l.quantity, onHandAfter: await onHand(tx, l.variantId), orderId, note: "Sold" });
  }
}

/** Converts an order's active reservations into a sale (payment confirmed). Idempotent. */
export async function commitReservations(tx: Tx, orderId: string) {
  const rows = await tx.select().from(s.stockReservations).where(and(eq(s.stockReservations.orderId, orderId), eq(s.stockReservations.status, "active"))).for("update");
  for (const r of rows) {
    await tx.execute(sql`UPDATE inventory SET on_hand = on_hand - ${r.quantity}, reserved = reserved - ${r.quantity} WHERE variant_id = ${r.variantId}`);
    await tx.update(s.stockReservations).set({ status: "committed" }).where(eq(s.stockReservations.id, r.id));
    await tx.insert(s.inventoryMovements).values({ id: newId("mov"), variantId: r.variantId, type: "sale", quantity: -r.quantity, reservedDelta: -r.quantity, onHandAfter: await onHand(tx, r.variantId), orderId, note: "Payment confirmed" });
  }
  return rows.length;
}

/** Releases an order's active reservations (payment failed / cancelled / expired). Idempotent. */
export async function releaseReservations(tx: Tx, orderId: string, note = "Reservation released") {
  const rows = await tx.select().from(s.stockReservations).where(and(eq(s.stockReservations.orderId, orderId), eq(s.stockReservations.status, "active"))).for("update");
  for (const r of rows) {
    await tx.execute(sql`UPDATE inventory SET reserved = GREATEST(reserved - ${r.quantity}, 0) WHERE variant_id = ${r.variantId}`);
    await tx.update(s.stockReservations).set({ status: "released" }).where(eq(s.stockReservations.id, r.id));
    await tx.insert(s.inventoryMovements).values({ id: newId("mov"), variantId: r.variantId, type: "release", quantity: 0, reservedDelta: -r.quantity, onHandAfter: await onHand(tx, r.variantId), orderId, note });
  }
  return rows.length;
}

/** Puts sold units back on hand (cancelled after deduction, or resellable return). */
export async function restock(tx: Tx, variantId: string, quantity: number, type: "cancel_restock" | "return", ref: { orderId?: string; staffUserId?: string; note?: string }) {
  if (quantity <= 0) return;
  await tx.execute(sql`UPDATE inventory SET on_hand = on_hand + ${quantity} WHERE variant_id = ${variantId}`);
  await tx.insert(s.inventoryMovements).values({ id: newId("mov"), variantId, type, quantity, onHandAfter: await onHand(tx, variantId), orderId: ref.orderId ?? null, staffUserId: ref.staffUserId ?? null, note: ref.note ?? "" });
}

export type AdjustReason = (typeof s.stockAdjustments.$inferInsert)["reason"];

/**
 * Manual stock adjustment by staff. `mode: "add"` adds/subtracts `quantity`; `mode: "set"` sets the
 * on-hand count (stock take). Damaged stock is moved out of on_hand into `damaged`.
 * On-hand can never go below what is currently reserved for pending payments.
 */
export async function adjustStock(args: { variantId: string; mode: "add" | "set"; quantity: number; reason: AdjustReason; note: string; staffUserId: string; lowStockThreshold?: number | null }) {
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(s.inventory).where(eq(s.inventory.variantId, args.variantId)).for("update");
    if (!inv) throw new AppError("This variant has no inventory record.");
    let delta = args.mode === "set" ? args.quantity - inv.onHand : args.quantity;
    if (args.reason === "damaged") delta = -Math.abs(delta);
    const next = inv.onHand + delta;
    if (next < 0) throw new AppError("Stock can't be negative.");
    if (next < inv.reserved) throw new AppError(`On-hand stock can't go below the ${inv.reserved} unit(s) reserved for pending payments.`);
    const adjustmentId = newId("adj");
    await tx.insert(s.stockAdjustments).values({ id: adjustmentId, reason: args.reason, note: args.note.slice(0, 500), staffUserId: args.staffUserId });
    await tx.update(s.inventory).set({
      onHand: next,
      damaged: args.reason === "damaged" ? inv.damaged + Math.abs(delta) : inv.damaged,
      ...(args.lowStockThreshold !== undefined ? { lowStockThreshold: args.lowStockThreshold } : {}),
    }).where(eq(s.inventory.variantId, args.variantId));
    if (delta !== 0) {
      const type = args.reason === "damaged" ? "damage" : args.reason === "received" ? "receipt" : args.reason === "returned" ? "return" : args.reason === "transfer" ? "transfer" : "adjustment";
      await tx.insert(s.inventoryMovements).values({ id: newId("mov"), variantId: args.variantId, type, quantity: delta, onHandAfter: next, adjustmentId, staffUserId: args.staffUserId, note: args.note.slice(0, 500) });
    }
    return { before: inv.onHand, after: next, delta };
  });
}

/** Releases reservations whose payment window has expired and cancels those orders. Run by cron. */
export async function expireReservations() {
  const due = await db.selectDistinct({ orderId: s.stockReservations.orderId }).from(s.stockReservations)
    .where(and(eq(s.stockReservations.status, "active"), lt(s.stockReservations.expiresAt, new Date()))).limit(100);
  return due.map((d) => d.orderId);
}

export async function movementsFor(variantIds: string[], limit = 100) {
  if (!variantIds.length) return [];
  return db.select().from(s.inventoryMovements).where(inArray(s.inventoryMovements.variantId, variantIds)).orderBy(desc(s.inventoryMovements.createdAt)).limit(limit);
}
