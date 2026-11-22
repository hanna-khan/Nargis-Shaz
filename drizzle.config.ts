try { process.loadEnvFile(".env"); } catch { /* env provided by host */ }
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "mysql://localhost/nargis_shaz" },
  strict: true,
  verbose: true,
});
