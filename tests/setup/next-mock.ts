import { vi } from "vitest";

/** In-memory stand-in for next/headers so services can run outside a request (one "browser" at a time). */
type Jar = Map<string, string>;
const state: { jar: Jar; headers: Headers } = { jar: new Map(), headers: new Headers({ "user-agent": "vitest", "x-real-ip": "127.0.0.1" }) };

export const browser = {
  reset() { state.jar = new Map(); },
  use(jar: Jar) { state.jar = jar; },
  current() { return state.jar; },
  fresh(): Jar { const j = new Map(); state.jar = j; return j; },
};
(globalThis as Record<string, unknown>).__browser = browser;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { name, value: state.jar.get(name)! } : undefined),
    has: (name: string) => state.jar.has(name),
    set: (name: string, value: string, opts?: { maxAge?: number }) => { if (opts?.maxAge === 0 || value === "") state.jar.delete(name); else state.jar.set(name, value); },
    delete: (name: string) => state.jar.delete(name),
  }),
  headers: async () => state.headers,
}));
vi.mock("next/cache", () => ({ updateTag: () => {}, revalidateTag: () => {}, cacheTag: () => {}, cacheLife: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw Object.assign(new Error(`REDIRECT ${u}`), { digest: `NEXT_REDIRECT;${u}` }); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));
