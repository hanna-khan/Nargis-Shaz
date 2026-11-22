import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export type DB = MySql2Database<typeof schema>;
/** Transaction handle — same query API as DB. */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

declare global {
  var __nsPool: mysql.Pool | undefined;
  var __nsDb: DB | undefined;
}

function create(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure MySQL.");
  const pool = mysql.createPool({
    uri: url,
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 8),
    waitForConnections: true,
    timezone: "Z",
    dateStrings: false,
    supportBigNumbers: true,
    // Prevents multi-statement SQL injection even if a raw query is ever built incorrectly.
    multipleStatements: false,
  });
  globalThis.__nsPool = pool;
  return drizzle(pool, { schema, mode: "default" });
}

/** Lazily created singleton (survives dev hot reloads). */
export function getDb(): DB {
  return (globalThis.__nsDb ??= create());
}

export const db: DB = new Proxy({} as DB, { get: (_t, p) => Reflect.get(getDb(), p) });

export async function closeDb() {
  await globalThis.__nsPool?.end();
  globalThis.__nsPool = undefined;
  globalThis.__nsDb = undefined;
}

export { schema };
