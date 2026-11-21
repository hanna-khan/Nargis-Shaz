import "server-only";
import { localRepositories } from "./local";
import type { Repositories } from "./types";

/**
 * Single switch between data sources. Phase 1 uses local structured data.
 * Phase 2: add `supabaseRepositories` and select it with DATA_SOURCE=supabase.
 */
function resolve(): Repositories {
  switch (process.env.DATA_SOURCE) {
    // case "supabase": return supabaseRepositories;
    default:
      return localRepositories;
  }
}

export const repositories = resolve();
export const { catalog, commerce, content, operations } = repositories;
export type * from "./types";
