import { z } from "zod";
import { trackRecentlyViewed } from "@/server/commerce/wishlist";
import { ok, readJson, route } from "@/server/http";

/** POST /api/recently-viewed — { productId } (stored for signed-in customers; guests keep it in the browser). */
export const POST = route(async (req) => {
  const { productId } = z.object({ productId: z.string().max(64) }).parse(await readJson(req));
  await trackRecentlyViewed(productId);
  return ok({ ok: true });
});
