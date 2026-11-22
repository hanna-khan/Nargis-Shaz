import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { rateLimits } from "../db/schema";
import { AppError } from "../lib/core";

/**
 * Fixed-window limiter backed by MySQL so limits survive restarts and work across processes.
 * Returns the number of hits in the current window.
 */
export async function hit(key: string, windowSeconds: number): Promise<number> {
  const k = key.slice(0, 191);
  await db.execute(sql`
    INSERT INTO rate_limits (\`key\`, \`count\`, window_start) VALUES (${k}, 1, UTC_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE
      \`count\` = IF(window_start < UTC_TIMESTAMP(3) - INTERVAL ${windowSeconds} SECOND, 1, \`count\` + 1),
      window_start = IF(window_start < UTC_TIMESTAMP(3) - INTERVAL ${windowSeconds} SECOND, UTC_TIMESTAMP(3), window_start)
  `);
  const [row] = await db.select({ count: rateLimits.count }).from(rateLimits).where(eq(rateLimits.key, k));
  return row?.count ?? 1;
}

/** Throws a friendly error when the limit is exceeded. */
export async function limit(key: string, max: number, windowSeconds: number, message = "Too many attempts. Please wait a few minutes and try again.") {
  if (process.env.RATE_LIMIT_DISABLED === "1" && process.env.NODE_ENV !== "production") return;
  const n = await hit(key, windowSeconds);
  if (n > max) throw new AppError(message, "rate_limited", 429);
}

export async function resetLimit(key: string) {
  await db.delete(rateLimits).where(eq(rateLimits.key, key.slice(0, 191)));
}
