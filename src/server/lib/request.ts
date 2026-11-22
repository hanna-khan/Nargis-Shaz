import { headers } from "next/headers";

export interface RequestMeta { ip: string | null; userAgent: string | null }

/** Client IP as seen by Cloudflare / Hostinger's proxy. Only trusted proxy headers are read. */
export async function requestMeta(): Promise<RequestMeta> {
  try {
    const h = await headers();
    const ip = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    return { ip, userAgent: h.get("user-agent")?.slice(0, 255) ?? null };
  } catch {
    return { ip: null, userAgent: null }; // outside a request (scripts/tests)
  }
}

/**
 * CSRF defence for Route Handlers that change state (Server Actions already enforce Origin checks).
 * Requires the Origin (or Referer) host to match the request host.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new Response("Forbidden", { status: 403 });
  try {
    if (new URL(origin).host !== host) throw new Error("cross-origin");
  } catch {
    throw new Response("Forbidden", { status: 403 });
  }
}

export function ipFromRequest(req: Request) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
