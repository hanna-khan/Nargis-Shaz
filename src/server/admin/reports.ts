import { sql, type SQL } from "drizzle-orm";
import { db } from "../db";

/**
 * Analytics and reports — every figure is computed from MySQL. Three money concepts are kept apart:
 *   order value  = totals of orders placed in the period (excluding cancelled / failed-payment orders)
 *   collected    = money actually received (verified online payments + recorded COD collections)
 *   refunded     = refunds issued in the period
 * Amounts are reported per currency; the chart also shows a PKR equivalent at the configured rates.
 */

const TZ_OFFSET_MIN = 5 * 60; // Asia/Karachi (no DST)

export interface Range { from: Date; to: Date; preset: string; label: string }

function pkDayStart(d: Date) {
  const local = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_MIN * 60_000);
}

export function parseRange(sp: Record<string, string | string[] | undefined>, fallback = "30d"): Range {
  const preset = typeof sp.range === "string" ? sp.range : fallback;
  const now = new Date();
  const today = pkDayStart(now);
  const day = 86_400_000;
  const local = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  const monthStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - TZ_OFFSET_MIN * 60_000);
  const prevMonthStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1) - TZ_OFFSET_MIN * 60_000);
  switch (preset) {
    case "today": return { from: today, to: now, preset, label: "Today" };
    case "yesterday": return { from: new Date(today.getTime() - day), to: today, preset, label: "Yesterday" };
    case "7d": return { from: new Date(today.getTime() - 6 * day), to: now, preset, label: "Last 7 days" };
    case "month": return { from: monthStart, to: now, preset, label: "This month" };
    case "prev_month": return { from: prevMonthStart, to: monthStart, preset, label: "Previous month" };
    case "custom": {
      const f = typeof sp.from === "string" ? new Date(`${sp.from}T00:00:00+05:00`) : null;
      const t = typeof sp.to === "string" ? new Date(`${sp.to}T00:00:00+05:00`) : null;
      if (f && t && !Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime()) && f <= t) return { from: f, to: new Date(t.getTime() + day), preset, label: `${sp.from} – ${sp.to}` };
      return { from: new Date(today.getTime() - 29 * day), to: now, preset: "30d", label: "Last 30 days" };
    }
    default: return { from: new Date(today.getTime() - 29 * day), to: now, preset: "30d", label: "Last 30 days" };
  }
}

type Row = Record<string, unknown>;
const run = async <T extends Row>(q: SQL) => ((await db.execute(q)) as unknown as [T[]])[0];
const N = (v: unknown) => Number(v ?? 0);
/** Orders that count as sales: not cancelled and not a failed online payment. */
const SALE = sql`o.status <> 'cancelled' AND o.payment_status NOT IN ('failed','voided')`;
const inRange = (col: SQL, r: Range) => sql`${col} >= ${r.from} AND ${col} < ${r.to}`;

export async function dashboard(r: Range) {
  const today = parseRange({ range: "today" });
  const month = parseRange({ range: "month" });
  const [value, valueToday, valueMonth, collected, refunded, statusCounts, open, customers, newCustomers, best, low, out, recent, activity, series, methods, rates] = await Promise.all([
    run<{ currency: string; total: number; n: number }>(sql`SELECT o.currency, SUM(o.total) total, COUNT(*) n FROM orders o WHERE ${SALE} AND ${inRange(sql`o.placed_at`, r)} GROUP BY o.currency`),
    run<{ currency: string; total: number }>(sql`SELECT o.currency, SUM(o.total) total FROM orders o WHERE ${SALE} AND ${inRange(sql`o.placed_at`, today)} GROUP BY o.currency`),
    run<{ currency: string; total: number }>(sql`SELECT o.currency, SUM(o.total) total FROM orders o WHERE ${SALE} AND ${inRange(sql`o.placed_at`, month)} GROUP BY o.currency`),
    run<{ currency: string; total: number }>(sql`SELECT t.currency, SUM(t.amount) total FROM payment_transactions t WHERE t.type IN ('sale','cod_collection') AND t.status = 'succeeded' AND ${inRange(sql`t.created_at`, r)} GROUP BY t.currency`),
    run<{ currency: string; total: number }>(sql`SELECT currency, SUM(amount) total FROM refunds WHERE status = 'succeeded' AND ${inRange(sql`created_at`, r)} GROUP BY currency`),
    run<{ status: string; n: number }>(sql`SELECT status, COUNT(*) n FROM orders WHERE ${inRange(sql`placed_at`, r)} GROUP BY status`),
    run<{ status: string; n: number }>(sql`SELECT status, COUNT(*) n FROM orders WHERE status IN ('pending','confirmed','processing','shipped') GROUP BY status`),
    run<{ n: number }>(sql`SELECT COUNT(*) n FROM users`),
    run<{ n: number }>(sql`SELECT COUNT(*) n FROM users WHERE ${inRange(sql`created_at`, r)}`),
    run<{ id: string; name: string; units: number; revenue: number; currency: string }>(sql`SELECT oi.product_id id, MAX(oi.product_name) name, SUM(oi.quantity) units, SUM(oi.line_total) revenue, MIN(o.currency) currency FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE ${SALE} AND ${inRange(sql`o.placed_at`, r)} GROUP BY oi.product_id ORDER BY units DESC LIMIT 8`),
    run<{ variantId: string; sku: string; name: string; available: number; threshold: number }>(sql`SELECT v.id variantId, v.sku, p.name, i.on_hand - i.reserved available, COALESCE(i.low_stock_threshold, CAST(JSON_UNQUOTE(COALESCE((SELECT value FROM store_settings WHERE \`key\` = 'lowStockThreshold'), '3')) AS SIGNED)) threshold FROM inventory i JOIN product_variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL AND p.status IN ('active','scheduled') AND v.active = 1 AND i.on_hand - i.reserved > 0 HAVING available <= threshold ORDER BY available LIMIT 12`),
    run<{ n: number }>(sql`SELECT COUNT(*) n FROM inventory i JOIN product_variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL AND p.status IN ('active','scheduled') AND v.active = 1 AND i.on_hand - i.reserved <= 0`),
    run<{ id: string; number: string; email: string; total: number; currency: string; status: string; payment_status: string; placed_at: Date }>(sql`SELECT id, number, email, total, currency, status, payment_status, placed_at FROM orders ORDER BY placed_at DESC LIMIT 8`),
    run<{ id: string; actor_label: string; summary: string; created_at: Date }>(sql`SELECT id, actor_label, summary, created_at FROM audit_logs WHERE actor_type = 'staff' ORDER BY created_at DESC LIMIT 8`),
    run<{ d: string; currency: string; total: number; n: number }>(sql`SELECT DATE(CONVERT_TZ(o.placed_at, '+00:00', '+05:00')) d, o.currency, SUM(o.total) total, COUNT(*) n FROM orders o WHERE ${SALE} AND ${inRange(sql`o.placed_at`, r)} GROUP BY d, o.currency ORDER BY d`),
    run<{ method: string; label: string; n: number; total: number; currency: string }>(sql`SELECT o.payment_method method, COALESCE(pm.label, o.payment_method) label, COUNT(*) n, SUM(o.total) total, o.currency FROM orders o LEFT JOIN payment_methods pm ON pm.id = o.payment_method WHERE ${SALE} AND ${inRange(sql`o.placed_at`, r)} GROUP BY o.payment_method, pm.label, o.currency ORDER BY n DESC`),
    run<{ code: string; rate: number }>(sql`SELECT code, rate_from_pkr_micros rate FROM currencies`),
  ]);
  const rate = Object.fromEntries(rates.map((x) => [x.code, N(x.rate)]));
  const toPkr = (amount: number, cur: string) => (cur === "PKR" ? amount : rate[cur] ? Math.round((amount * 1_000_000) / rate[cur]) : 0);

  // Daily series filled with zero days.
  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let t = pkDayStart(r.from).getTime(); t < r.to.getTime(); t += 86_400_000) {
    const key = new Date(t + TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
    const rows = series.filter((x) => String(x.d).slice(0, 10) === key || (x.d as unknown as Date)?.toISOString?.().slice(0, 10) === key);
    days.push({ date: key, revenue: rows.reduce((a, x) => a + toPkr(N(x.total), x.currency), 0), orders: rows.reduce((a, x) => a + N(x.n), 0) });
    if (days.length > 400) break;
  }
  const orderCount = value.reduce((a, x) => a + N(x.n), 0);
  return {
    orderValue: value.map((x) => ({ currency: x.currency, total: N(x.total), orders: N(x.n), aov: N(x.n) ? Math.round(N(x.total) / N(x.n)) : 0 })),
    orderValueToday: valueToday.map((x) => ({ currency: x.currency, total: N(x.total) })),
    orderValueMonth: valueMonth.map((x) => ({ currency: x.currency, total: N(x.total) })),
    collected: collected.map((x) => ({ currency: x.currency, total: N(x.total) })),
    refunded: refunded.map((x) => ({ currency: x.currency, total: N(x.total) })),
    orderCount,
    statusCounts: Object.fromEntries(statusCounts.map((x) => [x.status, N(x.n)])) as Record<string, number>,
    open: Object.fromEntries(open.map((x) => [x.status, N(x.n)])) as Record<string, number>,
    customers: N(customers[0]?.n), newCustomers: N(newCustomers[0]?.n),
    bestsellers: best.map((b) => ({ id: b.id, name: b.name, units: N(b.units), revenue: N(b.revenue), currency: b.currency })),
    lowStock: low.map((x) => ({ ...x, available: N(x.available), threshold: N(x.threshold) })), outOfStock: N(out[0]?.n),
    recent, activity, series: days,
    methods: methods.map((m) => ({ ...m, n: N(m.n), total: N(m.total) })),
  };
}

/* ───────────────────────────── Reports (tables + CSV) ───────────────────────────── */

export const REPORTS = {
  sales: "Sales by day",
  orders: "Orders",
  products: "Product performance",
  inventory: "Inventory valuation",
  customers: "Customers",
  coupons: "Coupon performance",
  payments: "Payments & reconciliation",
  refunds: "Refunds",
  currency: "Revenue by currency",
  shipping: "Shipping methods",
} as const;
export type ReportKind = keyof typeof REPORTS;

export interface Report { columns: { key: string; label: string; money?: boolean }[]; rows: Row[] }

export async function report(kind: ReportKind, r: Range): Promise<Report> {
  switch (kind) {
    case "sales": return { columns: [{ key: "day", label: "Day" }, { key: "currency", label: "Currency" }, { key: "orders", label: "Orders" }, { key: "units", label: "Units" }, { key: "gross", label: "Order value", money: true }, { key: "discounts", label: "Discounts", money: true }, { key: "shipping", label: "Delivery", money: true }],
      rows: await run(sql`SELECT DATE(CONVERT_TZ(o.placed_at,'+00:00','+05:00')) day, o.currency, COUNT(*) orders, (SELECT COALESCE(SUM(quantity),0) FROM order_items oi JOIN orders o2 ON o2.id = oi.order_id WHERE DATE(CONVERT_TZ(o2.placed_at,'+00:00','+05:00')) = DATE(CONVERT_TZ(o.placed_at,'+00:00','+05:00')) AND o2.currency = o.currency AND o2.status <> 'cancelled' AND o2.payment_status NOT IN ('failed','voided')) units, SUM(o.total) gross, SUM(o.discount_total) discounts, SUM(o.shipping_total) shipping FROM orders o WHERE ${SALE} AND ${inRange(sql`o.placed_at`, r)} GROUP BY day, o.currency ORDER BY day DESC`) };
    case "orders": return { columns: [{ key: "number", label: "Order" }, { key: "placed", label: "Placed (UTC)" }, { key: "email", label: "Email" }, { key: "status", label: "Status" }, { key: "payment_status", label: "Payment" }, { key: "payment_method", label: "Method" }, { key: "currency", label: "Currency" }, { key: "total", label: "Total", money: true }, { key: "amount_paid", label: "Paid", money: true }, { key: "amount_refunded", label: "Refunded", money: true }],
      rows: await run(sql`SELECT number, DATE_FORMAT(placed_at, '%Y-%m-%d %H:%i') placed, email, status, payment_status, payment_method, currency, total, amount_paid, amount_refunded FROM orders WHERE ${inRange(sql`placed_at`, r)} ORDER BY placed_at DESC LIMIT 5000`) };
    case "products": return { columns: [{ key: "name", label: "Product" }, { key: "sku", label: "SKU" }, { key: "currency", label: "Currency" }, { key: "orders", label: "Orders" }, { key: "units", label: "Units" }, { key: "revenue", label: "Revenue", money: true }, { key: "returned", label: "Units returned" }],
      rows: await run(sql`SELECT MAX(oi.product_name) name, MAX(p.sku) sku, o.currency, COUNT(DISTINCT o.id) orders, SUM(oi.quantity) units, SUM(oi.line_total) revenue, SUM(oi.quantity_returned) returned FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id WHERE ${SALE} AND ${inRange(sql`o.placed_at`, r)} GROUP BY oi.product_id, o.currency ORDER BY units DESC`) };
    case "inventory": return { columns: [{ key: "sku", label: "SKU" }, { key: "name", label: "Product" }, { key: "on_hand", label: "On hand" }, { key: "reserved", label: "Reserved" }, { key: "available", label: "Available" }, { key: "damaged", label: "Damaged" }, { key: "cost_value", label: "Cost value (PKR)", money: true }],
      rows: await run(sql`SELECT v.sku, p.name, i.on_hand, i.reserved, i.on_hand - i.reserved available, i.damaged, i.on_hand * COALESCE(v.cost_price, 0) cost_value FROM inventory i JOIN product_variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL ORDER BY p.name, v.sort_order`) };
    case "customers": return { columns: [{ key: "email", label: "Email" }, { key: "name", label: "Name" }, { key: "registered", label: "Registered" }, { key: "orders", label: "Orders" }, { key: "currency", label: "Currency" }, { key: "spent", label: "Paid value", money: true }],
      rows: await run(sql`SELECT u.email, CONCAT(u.first_name,' ',u.last_name) name, DATE(u.created_at) registered, COUNT(o.id) orders, MIN(o.currency) currency, COALESCE(SUM(o.amount_paid - o.amount_refunded),0) spent FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status <> 'cancelled' GROUP BY u.id ORDER BY spent DESC LIMIT 5000`) };
    case "coupons": return { columns: [{ key: "code", label: "Code" }, { key: "currency", label: "Currency" }, { key: "uses", label: "Uses" }, { key: "discount", label: "Discount given", money: true }, { key: "order_value", label: "Order value", money: true }],
      rows: await run(sql`SELECT c.code, r.currency, COUNT(*) uses, SUM(r.amount) discount, SUM(o.total) order_value FROM coupon_redemptions r JOIN coupons c ON c.id = r.coupon_id JOIN orders o ON o.id = r.order_id WHERE r.voided_at IS NULL AND ${inRange(sql`r.created_at`, r)} GROUP BY c.code, r.currency ORDER BY uses DESC`) };
    case "payments": return { columns: [{ key: "provider", label: "Provider" }, { key: "currency", label: "Currency" }, { key: "payments", label: "Payments" }, { key: "expected", label: "Expected", money: true }, { key: "collected", label: "Collected", money: true }, { key: "refunded", label: "Refunded", money: true }, { key: "outstanding", label: "Outstanding", money: true }, { key: "failed", label: "Failed" }],
      rows: await run(sql`SELECT p.provider, p.currency, COUNT(*) payments, SUM(CASE WHEN p.status NOT IN ('failed','cancelled') THEN p.amount ELSE 0 END) expected, SUM(CASE WHEN p.status IN ('paid','refunded','partially_refunded') THEN p.amount ELSE 0 END) collected, SUM(p.amount_refunded) refunded, SUM(CASE WHEN p.status IN ('pending','awaiting_cod','authorized') THEN p.amount ELSE 0 END) outstanding, SUM(p.status = 'failed') failed FROM payments p WHERE ${inRange(sql`p.created_at`, r)} GROUP BY p.provider, p.currency`) };
    case "refunds": return { columns: [{ key: "created", label: "Date" }, { key: "number", label: "Order" }, { key: "method", label: "Method" }, { key: "status", label: "Status" }, { key: "currency", label: "Currency" }, { key: "amount", label: "Amount", money: true }, { key: "reason", label: "Reason" }],
      rows: await run(sql`SELECT DATE_FORMAT(r.created_at,'%Y-%m-%d %H:%i') created, o.number, r.method, r.status, r.currency, r.amount, r.reason FROM refunds r JOIN orders o ON o.id = r.order_id WHERE ${inRange(sql`r.created_at`, r)} ORDER BY r.created_at DESC`) };
    case "currency": return { columns: [{ key: "currency", label: "Currency" }, { key: "orders", label: "Orders" }, { key: "order_value", label: "Order value", money: true }, { key: "collected", label: "Collected", money: true }, { key: "refunded", label: "Refunded", money: true }],
      rows: await run(sql`SELECT c.code currency, (SELECT COUNT(*) FROM orders o WHERE o.currency = c.code AND ${SALE} AND ${inRange(sql`o.placed_at`, r)}) orders, (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.currency = c.code AND ${SALE} AND ${inRange(sql`o.placed_at`, r)}) order_value, (SELECT COALESCE(SUM(t.amount),0) FROM payment_transactions t WHERE t.currency = c.code AND t.type IN ('sale','cod_collection') AND t.status='succeeded' AND ${inRange(sql`t.created_at`, r)}) collected, (SELECT COALESCE(SUM(x.amount),0) FROM refunds x WHERE x.currency = c.code AND x.status='succeeded' AND ${inRange(sql`x.created_at`, r)}) refunded FROM currencies c ORDER BY c.sort_order`) };
    case "shipping": return { columns: [{ key: "label", label: "Method" }, { key: "currency", label: "Currency" }, { key: "orders", label: "Orders" }, { key: "charged", label: "Delivery charged", money: true }, { key: "shipped", label: "Shipped" }, { key: "delivered", label: "Delivered" }],
      rows: await run(sql`SELECT o.shipping_label label, o.currency, COUNT(*) orders, SUM(o.shipping_total) charged, SUM(o.status IN ('shipped','delivered','returned')) shipped, SUM(o.status = 'delivered') delivered FROM orders o WHERE ${SALE} AND ${inRange(sql`o.placed_at`, r)} GROUP BY o.shipping_label, o.currency ORDER BY orders DESC`) };
  }
}

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV with money columns in major units (two decimals). */
export function toCsv(rep: Report) {
  const head = rep.columns.map((c) => csvCell(c.label)).join(",");
  const body = rep.rows.map((row) => rep.columns.map((c) => csvCell(c.money ? (N(row[c.key]) / 100).toFixed(2) : row[c.key])).join(",")).join("\r\n");
  return `﻿${head}\r\n${body}\r\n`;
}
