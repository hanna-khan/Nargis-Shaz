/**
 * Applies pending SQL migrations from drizzle/migrations (forward-only, idempotent).
 * Safe for production: it never drops data on its own; each migration is reviewed SQL in git.
 *   npm run db:migrate
 */
import { migrate } from "drizzle-orm/mysql2/migrator";
import { closeDb, getDb } from "../src/server/db";

try { process.loadEnvFile(".env"); } catch { /* host-provided env */ }

async function main() {
  const started = Date.now();
  await migrate(getDb(), { migrationsFolder: "./drizzle/migrations" });
  console.log(`✓ Migrations applied in ${Date.now() - started} ms`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(closeDb);
