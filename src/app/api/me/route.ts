import { getCustomer } from "@/server/auth/session";
import { ok, route } from "@/server/http";

/** GET /api/me — the signed-in customer (no sensitive fields) or null. */
export const GET = route(async () => {
  const c = await getCustomer();
  return ok({ customer: c ? { firstName: c.firstName, lastName: c.lastName, email: c.email, emailVerified: c.emailVerified } : null });
});
