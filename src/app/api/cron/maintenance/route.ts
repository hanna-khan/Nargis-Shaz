import { lt } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { processEmailQueue } from "@/server/email";
import { safeEqual } from "@/server/lib/core";
import { expireUnpaidOrders } from "@/server/payments/service";
import { apiError, ok, route } from "@/server/http";

/**
 * POST /api/cron/maintenance — run every 5 minutes from Hostinger's cron (see DEPLOYMENT_GUIDE):
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://www.nargisandshaz.com/api/cron/maintenance
 * Expires unpaid online orders (releasing reserved stock), retries failed emails and prunes old rows.
 */
export const POST = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) return apiError(401, "unauthorized", "Invalid cron secret");
  const expired = await expireUnpaidOrders();
  const emails = await processEmailQueue(50);
  await db.delete(s.rateLimits).where(lt(s.rateLimits.windowStart, new Date(Date.now() - 86_400_000)));
  await db.delete(s.userSessions).where(lt(s.userSessions.expiresAt, new Date(Date.now() - 7 * 86_400_000)));
  return ok({ expiredOrders: expired, emails });
}, { csrf: false });
