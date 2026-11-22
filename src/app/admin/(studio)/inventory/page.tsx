import Link from "next/link";
import { and, asc, desc, eq, inArray, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { AdminForm, Disclosure, Field, SelectField } from "@/components/admin/client";
import { ALink, Card, FilterBar, FInput, FSelect, fmtDateTime, NoAccess, PageHeader, Pagination, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { getSettings } from "@/server/settings";
import { adjustStockAction } from "../../_actions/catalog";

export const metadata = { title: "Inventory" };
const PAGE = 40;

export default async function InventoryPage(props: PageProps<"/admin/inventory">) {
  const { staff, allowed } = await staffPage("inventory.view");
  if (!allowed) return <NoAccess permission="inventory.view" />;
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const settings = await getSettings();
  const avail = sql`(${s.inventory.onHand} - ${s.inventory.reserved})`;
  const threshold = sql`COALESCE(${s.inventory.lowStockThreshold}, ${settings.lowStockThreshold})`;
  const where: SQL[] = [isNull(s.products.deletedAt)];
  if (str("q")) { const L = `%${str("q").replace(/[\\%_]/g, (c) => `\\${c}`)}%`; where.push(or(like(s.products.name, L), like(s.productVariants.sku, L), like(s.products.sku, L))!); }
  if (str("stock") === "out") where.push(sql`${avail} <= 0`);
  if (str("stock") === "low") where.push(sql`${avail} > 0 AND ${avail} <= ${threshold}`);
  if (str("stock") === "reserved") where.push(sql`${s.inventory.reserved} > 0`);
  const cond = and(...where);
  const base = () => db.select({ v: s.productVariants, inv: s.inventory, name: s.products.name, status: s.products.status, productId: s.products.id }).from(s.inventory)
    .innerJoin(s.productVariants, eq(s.productVariants.id, s.inventory.variantId)).innerJoin(s.products, eq(s.products.id, s.productVariants.productId));
  const [rows, [{ n }]] = await Promise.all([
    base().where(cond).orderBy(asc(s.products.name), asc(s.productVariants.sortOrder)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.inventory).innerJoin(s.productVariants, eq(s.productVariants.id, s.inventory.variantId)).innerJoin(s.products, eq(s.products.id, s.productVariants.productId)).where(cond),
  ]);
  const vids = rows.map((r) => r.v.id);
  const [attrs, history, staffRows, reservations] = await Promise.all([
    db.select().from(s.productAttributeValues),
    vids.length ? db.select().from(s.inventoryMovements).where(inArray(s.inventoryMovements.variantId, str("variant") ? [str("variant")] : vids)).orderBy(desc(s.inventoryMovements.createdAt)).limit(str("variant") ? 200 : 25) : [],
    db.select({ id: s.staffUsers.id, name: s.staffUsers.name }).from(s.staffUsers),
    db.select({ r: s.stockReservations, sku: s.productVariants.sku, number: s.orders.number, orderId: s.orders.id }).from(s.stockReservations).innerJoin(s.productVariants, eq(s.productVariants.id, s.stockReservations.variantId)).leftJoin(s.orders, eq(s.orders.id, s.stockReservations.orderId)).where(eq(s.stockReservations.status, "active")).orderBy(asc(s.stockReservations.expiresAt)).limit(50),
  ]);
  const label = (id: string | null) => attrs.find((a) => a.id === id)?.label ?? "—";
  const sku = (vid: string) => rows.find((r) => r.v.id === vid)?.v.sku ?? vid;
  const can = staffCan(staff, "inventory.adjust");

  return (
    <>
      <PageHeader title="Inventory" description={`Stock is tracked per variant. Available = on hand − reserved for pending online payments. Default low-stock threshold: ${settings.lowStockThreshold}.`}
        actions={staffCan(staff, "reports.export") ? <ALink href="/admin/api/export/inventory" variant="outline">Export CSV</ALink> : undefined} />
      <FilterBar path="/admin/inventory">
        <FInput label="Search" name="q" defaultValue={str("q")} placeholder="Product or SKU" className="min-w-[220px]" />
        <FSelect label="Stock" name="stock" defaultValue={str("stock")}><option value="">All</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="reserved">Has reservations</option></FSelect>
      </FilterBar>
      <Table head={["Variant", "On hand", "Reserved", "Available", "Damaged", "Threshold", ""]}>
        {rows.map(({ v, inv, name, productId }) => {
          const a = inv.onHand - inv.reserved;
          const t = inv.lowStockThreshold ?? settings.lowStockThreshold;
          return (
            <tr key={v.id}>
              <td><Link href={`/admin/products/${productId}`} className="hover:underline">{name}</Link><span className="block text-[11.5px] text-charcoal/50">{v.sku} · {label(v.colourValueId)} · {label(v.sizeValueId)}{!v.active ? " · inactive" : ""}</span></td>
              <td>{inv.onHand}</td>
              <td>{inv.reserved}</td>
              <td><Status value={a <= 0 ? "out" : a <= t ? "low" : "in_stock"} label={String(a)} /></td>
              <td>{inv.damaged}</td>
              <td>{inv.lowStockThreshold ?? <span className="text-charcoal/45">{settings.lowStockThreshold} (default)</span>}</td>
              <td className="min-w-[200px]">
                <div className="flex flex-wrap items-start gap-2">
                  {can && (
                    <Disclosure label="Adjust" variant="ghost">
                      <AdminForm action={adjustStockAction} submit="Apply" className="w-[280px]">
                        <input type="hidden" name="variantId" value={v.id} />
                        <SelectField label="Change" name="mode"><option value="add">Add / remove (+/−)</option><option value="set">Set on-hand count</option></SelectField>
                        <Field label="Quantity" name="quantity" type="number" required />
                        <SelectField label="Reason" name="reason"><option value="received">Stock received</option><option value="count">Stock take</option><option value="correction">Correction</option><option value="damaged">Damaged (removes)</option><option value="returned">Returned to stock</option><option value="transfer">Transfer</option></SelectField>
                        <Field label="Low-stock threshold (empty = default)" name="threshold" type="number" defaultValue={inv.lowStockThreshold?.toString() ?? ""} />
                        <Field label="Note" name="note" />
                      </AdminForm>
                    </Disclosure>
                  )}
                  <Link href={`/admin/inventory?${new URLSearchParams({ ...(str("q") ? { q: str("q") } : {}), variant: v.id })}#history`} className="text-[12px] underline">History</Link>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={page} pages={Math.ceil(Number(n) / PAGE)} params={sp} path="/admin/inventory" />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card title={str("variant") ? `Movement history · ${sku(str("variant"))}` : "Recent movements"} id="history" padded={false}>
          <Table head={["When", "Variant", "Type", "Change", "On hand after", "By / note"]} className="border-0">
            {history.map((m) => <tr key={m.id}><td className="whitespace-nowrap">{fmtDateTime(m.createdAt)}</td><td>{sku(m.variantId)}</td><td>{m.type.replace(/_/g, " ")}</td><td>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}{m.reservedDelta ? ` (reserved ${m.reservedDelta > 0 ? "+" : ""}${m.reservedDelta})` : ""}</td><td>{m.onHandAfter}</td><td className="text-charcoal/65">{staffRows.find((x) => x.id === m.staffUserId)?.name ?? (m.orderId ? "Order" : "System")}{m.note ? ` — ${m.note}` : ""}</td></tr>)}
          </Table>
        </Card>
        <Card title="Active reservations (pending online payments)" padded={false}>
          {reservations.length ? (
            <Table head={["Order", "SKU", "Qty", "Expires"]} className="border-0">
              {reservations.map(({ r, sku: k, number, orderId }) => <tr key={r.id}><td>{number ? <Link href={`/admin/orders/${orderId}`} className="underline">{number}</Link> : r.orderId}</td><td>{k}</td><td>{r.quantity}</td><td>{fmtDateTime(r.expiresAt)}</td></tr>)}
            </Table>
          ) : <p className="p-5 text-[13px] text-charcoal/55">No stock is reserved right now.</p>}
        </Card>
      </div>
    </>
  );
}
