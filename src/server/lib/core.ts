import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Prefixed, URL-safe, unguessable id: ord_3kq9X… */
export const newId = (prefix: string) => `${prefix}_${randomBytes(12).toString("base64url")}`;

/** 32-byte random token for cookies, reset links and order access links. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export const hmacHex = (algo: "sha256" | "sha512", secret: string, data: string | Buffer) => createHmac(algo, secret).update(data).digest("hex");

/** Constant-time comparison of two hex/ascii strings. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

/** Error with a message that is safe to show to the customer / staff member. */
export class AppError extends Error {
  constructor(message: string, public code: string = "invalid", public status = 400) {
    super(message);
    this.name = "AppError";
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Normalises any thrown value into an ActionResult; unexpected errors are logged but never leaked. */
export function toFailure(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (isAppError(e)) return { ok: false, error: e.message };
  if (e && typeof e === "object" && "issues" in e && Array.isArray((e as { issues: unknown[] }).issues)) {
    const issues = (e as { issues: { path: (string | number)[]; message: string }[] }).issues;
    const fieldErrors: Record<string, string> = {};
    for (const i of issues) fieldErrors[i.path.join(".") || "_"] ??= i.message;
    return { ok: false, error: issues[0]?.message ?? "Please check the form.", fieldErrors };
  }
  // Re-throw Next.js control-flow errors (redirect / notFound) — callers use `rethrowIfNext`.
  console.error("[ns] unexpected error", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Next.js redirect()/notFound() throw special errors that must propagate. */
export function rethrowIfNext(e: unknown) {
  const digest = (e as { digest?: string } | null)?.digest;
  if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND")) throw e;
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const normaliseEmail = (e: string) => e.trim().toLowerCase();

export const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

export function siteUrl(path = "") {
  const base = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

/**
 * Deployment environment. APP_ENV is set explicitly on each server (production | staging | development).
 * A production build without APP_ENV is treated as production, so test-only features stay off by default.
 */
export const appEnv = () => process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
export const isProduction = () => appEnv() === "production";
