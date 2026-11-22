import { execSync } from "node:child_process";
import mysql from "mysql2/promise";

/** Recreates the dedicated test database, applies migrations and seeds reference data + catalogue. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "mysql://ns:ns_dev_password@localhost:3306/nargis_shaz_test";
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) throw new Error(`Refusing to reset a database that isn't a *_test database: ${name}`);
  const admin = await mysql.createConnection(url.replace(`/${name}`, "/"));
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();
  const env = { ...process.env, DATABASE_URL: url, SEED_OWNER_EMAIL: "owner@test.local", SEED_OWNER_PASSWORD: "Atelier-pass-2026!", SEED_OWNER_NAME: "Test Owner" };
  execSync("npx tsx scripts/db-migrate.ts", { env, stdio: "inherit" });
  execSync("npx tsx scripts/db-seed.ts", { env, stdio: "inherit" });
}
