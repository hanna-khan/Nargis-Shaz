import { NextResponse } from "next/server";
import { isAppError } from "./lib/core";
import { assertSameOrigin } from "./lib/request";

/** JSON error envelope used by every REST endpoint: { error: { code, message } }. */
export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}

/**
 * Centralised Route Handler wrapper: same-origin check for state-changing methods, AppError → 4xx,
 * validation errors → 422, everything else → 500 without leaking internals.
 */
export function route<C = unknown>(fn: (req: Request, ctx: C) => Promise<Response>, opts: { csrf?: boolean } = {}) {
  return async (req: Request, ctx: C) => {
    try {
      if (opts.csrf !== false && !["GET", "HEAD", "OPTIONS"].includes(req.method)) assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof Response) return e;
      if (isAppError(e)) return apiError(e.status, e.code, e.message);
      if (e && typeof e === "object" && "issues" in e) {
        const issues = (e as { issues: { path: (string | number)[]; message: string }[] }).issues;
        return NextResponse.json({ error: { code: "validation", message: issues[0]?.message ?? "Invalid request", fields: Object.fromEntries(issues.map((i) => [i.path.join("."), i.message])) } }, { status: 422 });
      }
      console.error(`[api] ${req.method} ${new URL(req.url).pathname}`, e);
      return apiError(500, "server_error", "Something went wrong. Please try again.");
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request, maxBytes = 64_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Response("Payload too large", { status: 413 });
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Response("Invalid JSON", { status: 400 });
  }
}
