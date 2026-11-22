import mysql from "mysql2/promise";

/** Clears local rate-limit counters so repeated runs from 127.0.0.1 are not throttled. Refuses non-local databases. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "mysql://ns:ns_dev_password@localhost:3306/nargis_shaz";
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) throw new Error("E2E refuses to run against a non-local database");
  const c = await mysql.createConnection(url);
  try { await c.query("DELETE FROM rate_limits WHERE `key` LIKE '%127.0.0.1%' OR `key` LIKE '%::1%' OR `key` LIKE 'login:email:%@example.test'"); } finally { await c.end(); }
}
