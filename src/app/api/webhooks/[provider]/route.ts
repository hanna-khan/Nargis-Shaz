import { handleWebhook } from "@/server/payments/service";
import { route } from "@/server/http";

/**
 * POST /api/webhooks/:provider — payment provider notifications (safepay | stripe | test).
 * Signature-verified against the raw body; no CSRF check (server-to-server), idempotent per event id.
 */
export const POST = route<{ params: Promise<{ provider: string }> }>(async (req, { params }) => {
  const { provider } = await params;
  const raw = await req.text();
  if (raw.length > 256_000) return new Response("too large", { status: 413 });
  const r = await handleWebhook(provider, raw, req.headers);
  return new Response(r.body, { status: r.status, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}, { csrf: false });
