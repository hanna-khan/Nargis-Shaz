import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { ALink, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";

export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const { staff, allowed } = await staffPage("categories.view");
  if (!allowed) return <NoAccess permission="categories.view" />;
  const [cols, counts] = await Promise.all([
    db.select().from(s.collections).orderBy(asc(s.collections.sortOrder)),
    db.select({ id: s.productCollections.collectionId, n: sql<number>`COUNT(*)` }).from(s.productCollections).groupBy(s.productCollections.collectionId),
  ]);
  return (
    <>
      <PageHeader title="Collections" description="Seasonal and editorial collections, and the occasion pages (Workwear, Everyday, Evening, Festive)." actions={staffCan(staff, "categories.manage") ? <ALink href="/admin/collections/new">New collection</ALink> : undefined} />
      <Table head={["Collection", "Type", "Status", "Products", "URL"]}>
        {cols.map((c) => (
          <tr key={c.id}>
            <td><Link href={`/admin/collections/${c.id}`} className="font-medium hover:underline">{c.name}</Link></td>
            <td className="text-charcoal/70">{c.occasion ? `Occasion: ${c.occasion}` : c.seasonal ? "Seasonal" : "Editorial"}</td>
            <td><Status value={c.status} /></td>
            <td>{Number(counts.find((x) => x.id === c.id)?.n ?? 0)}</td>
            <td className="text-charcoal/60">{c.occasion ? `/${c.occasion}` : `/collections/${c.slug}`}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
