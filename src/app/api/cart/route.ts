import { z } from "zod";
import { addToCart, changeCartVariant, getCartView, removeFromCart, setCartCoupon, setCartMarket, setCartQuantity } from "@/server/commerce/cart";
import { ok, readJson, route } from "@/server/http";

/** GET /api/cart — the shopper's cart, priced on the server in their market currency. */
export const GET = route(async () => ok(await getCartView()));

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), variantId: z.string().max(64), quantity: z.number().int().min(1).max(10).default(1) }),
  z.object({ action: z.literal("set"), variantId: z.string().max(64), quantity: z.number().int().min(0).max(10) }),
  z.object({ action: z.literal("remove"), variantId: z.string().max(64) }),
  z.object({ action: z.literal("change"), fromVariantId: z.string().max(64), toVariantId: z.string().max(64) }),
  z.object({ action: z.literal("coupon"), code: z.string().trim().max(40).nullable() }),
  z.object({ action: z.literal("market"), marketId: z.string().max(64) }),
]);

/** POST /api/cart — { action: add | set | remove | change | coupon | market, … } → updated cart. */
export const POST = route(async (req) => {
  const b = body.parse(await readJson(req));
  switch (b.action) {
    case "add": await addToCart(b.variantId, b.quantity); break;
    case "set": await setCartQuantity(b.variantId, b.quantity); break;
    case "remove": await removeFromCart(b.variantId); break;
    case "change": await changeCartVariant(b.fromVariantId, b.toVariantId); break;
    case "coupon": await setCartCoupon(b.code || null); break;
    case "market": await setCartMarket(b.marketId); break;
  }
  return ok(await getCartView());
});
