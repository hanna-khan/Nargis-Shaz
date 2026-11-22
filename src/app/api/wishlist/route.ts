import { z } from "zod";
import { loadProducts } from "@/server/catalog/products";
import { setWished, wishlistProductIds } from "@/server/commerce/wishlist";
import { ok, readJson, route } from "@/server/http";

async function items() {
  const ids = await wishlistProductIds();
  const products = await loadProducts(ids);
  return {
    items: products.filter((p) => p.status !== "archived" && p.status !== "draft").map((p) => ({
      productId: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, image: p.colours[0]?.images[0], prices: p.prices,
      sizes: p.variants.filter((v) => v.colourId === p.colours[0]?.id).map((v) => ({ variantId: v.id, size: v.size, stock: v.stock })),
    })),
  };
}

/** GET /api/wishlist — saved products (guest cookie or customer account). */
export const GET = route(async () => ok(await items()));

const body = z.object({ productId: z.string().max(64), wished: z.boolean() });

/** POST /api/wishlist — { productId, wished } */
export const POST = route(async (req) => {
  const b = body.parse(await readJson(req));
  await setWished(b.productId, b.wished);
  return ok(await items());
});
