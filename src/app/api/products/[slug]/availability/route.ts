import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { visibleProduct } from "@/server/catalog/products";
import { apiError, ok, route } from "@/server/http";

/** GET /api/products/:slug/availability — live per-variant stock (never cached). */
export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params;
  const [p] = await db.select({ id: s.products.id }).from(s.products).where(and(eq(s.products.slug, slug), visibleProduct())).limit(1);
  if (!p) return apiError(404, "not_found", "Product not found");
  const rows = await db.select({ variantId: s.productVariants.id, onHand: s.inventory.onHand, reserved: s.inventory.reserved })
    .from(s.productVariants).leftJoin(s.inventory, eq(s.inventory.variantId, s.productVariants.id))
    .where(and(eq(s.productVariants.productId, p.id), eq(s.productVariants.active, true)));
  return ok({ variants: Object.fromEntries(rows.map((r) => [r.variantId, Math.max(0, (r.onHand ?? 0) - (r.reserved ?? 0))])) });
});
