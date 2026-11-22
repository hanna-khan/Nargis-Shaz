import { and, eq, lte, lt, or, isNull, inArray } from "drizzle-orm";
import { db } from "../db";
import { emailLogs, notificationTemplates, notifications } from "../db/schema";
import { newId } from "../lib/core";
import { getSettings } from "../settings";
import { renderEmail, TEMPLATE_DEFAULTS, type EmailPayload } from "./templates";

/**
 * Notification pipeline: enqueue → render → deliver → log. A provider rejection is recorded as
 * "failed" with the provider's error and retried with backoff (1m, 5m, 30m, 2h, 12h). Without a
 * configured provider, messages are recorded as "skipped" — never reported as sent.
 */

type Delivery = { ok: true; id: string | null } | { ok: false; error: string; retryable: boolean };

export function emailDriver(): "resend" | "log" {
  if (process.env.RESEND_API_KEY) return "resend";
  return "log";
}

async function deliverResend(msg: { to: string; subject: string; html: string; text: string }): Promise<Delivery> {
  const from = process.env.EMAIL_FROM;
  if (!from) return { ok: false, error: "EMAIL_FROM is not configured", retryable: false };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, reply_to: process.env.EMAIL_REPLY_TO || undefined }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (res.ok && body.id) return { ok: true, id: body.id };
    return { ok: false, error: `Resend ${res.status}: ${body.message ?? body.name ?? "rejected"}`.slice(0, 500), retryable: res.status === 429 || res.status >= 500 };
  } catch (e) {
    return { ok: false, error: `Network error: ${(e as Error).message}`.slice(0, 500), retryable: true };
  }
}

const BACKOFF_MIN = [1, 5, 30, 120, 720];
const MAX_ATTEMPTS = BACKOFF_MIN.length + 1;

async function templateFor(key: string) {
  const [row] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.key, key)).limit(1);
  if (row) return row;
  const d = TEMPLATE_DEFAULTS.find((t) => t.key === key);
  if (!d) throw new Error(`Unknown email template ${key}`);
  return { ...d, enabled: true };
}

async function attempt(notificationId: string) {
  const [n] = await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
  if (!n || n.status === "sent") return n?.status ?? "missing";
  const tpl = await templateFor(n.templateKey);
  const settings = await getSettings();
  const rendered = renderEmail(tpl, { supportEmail: settings.supportEmail, ...(n.payload as EmailPayload) }, settings.storeName);
  const attempts = n.attempts + 1;

  if (!tpl.enabled) {
    await db.update(notifications).set({ status: "skipped", attempts, lastError: "Template disabled in Studio" }).where(eq(notifications.id, n.id));
    await db.insert(emailLogs).values({ id: newId("eml"), notificationId: n.id, provider: "none", to: n.recipient, subject: rendered.subject, status: "skipped", error: "Template disabled" });
    return "skipped";
  }

  const driver = emailDriver();
  if (driver === "log") {
    await db.update(notifications).set({ status: "skipped", attempts, lastError: "No email provider configured (RESEND_API_KEY missing) — not sent" }).where(eq(notifications.id, n.id));
    await db.insert(emailLogs).values({ id: newId("eml"), notificationId: n.id, provider: "log", to: n.recipient, subject: rendered.subject, status: "skipped", error: "Email provider not configured" });
    if (process.env.NODE_ENV !== "production" && process.env.EMAIL_LOG_TO_CONSOLE === "1") console.info(`[email:log] → ${n.recipient} · ${rendered.subject}\n${rendered.text}`);
    return "skipped";
  }

  const r = await deliverResend({ to: n.recipient, ...rendered });
  if (r.ok) {
    await db.update(notifications).set({ status: "sent", attempts, lastError: null, nextAttemptAt: null }).where(eq(notifications.id, n.id));
    await db.insert(emailLogs).values({ id: newId("eml"), notificationId: n.id, provider: "resend", providerMessageId: r.id, to: n.recipient, subject: rendered.subject, status: "sent" });
    return "sent";
  }
  const retry = r.retryable && attempts < MAX_ATTEMPTS;
  await db.update(notifications).set({
    status: "failed", attempts, lastError: r.error,
    nextAttemptAt: retry ? new Date(Date.now() + BACKOFF_MIN[attempts - 1] * 60_000) : null,
  }).where(eq(notifications.id, n.id));
  await db.insert(emailLogs).values({ id: newId("eml"), notificationId: n.id, provider: "resend", to: n.recipient, subject: rendered.subject, status: "failed", error: r.error });
  console.error(`[email] delivery failed for ${n.templateKey} → ${n.recipient}: ${r.error}`);
  return "failed";
}

/** Queue and attempt immediately. Never throws into the business operation that triggered it. */
export async function sendEmail(templateKey: string, to: string, payload: EmailPayload, opts: { orderId?: string } = {}) {
  const id = newId("ntf");
  try {
    await db.insert(notifications).values({ id, templateKey, recipient: to, payload, status: "queued", orderId: opts.orderId ?? null });
    return await attempt(id);
  } catch (e) {
    console.error("[email] enqueue/attempt error", e);
    return "failed";
  }
}

/** Retries failed messages whose backoff has elapsed. Called by /api/cron/notifications and Studio. */
export async function processEmailQueue(limit = 25) {
  const due = await db.select({ id: notifications.id }).from(notifications)
    .where(or(eq(notifications.status, "queued"), and(eq(notifications.status, "failed"), lt(notifications.attempts, MAX_ATTEMPTS), lte(notifications.nextAttemptAt, new Date()))))
    .limit(limit);
  const results: Record<string, number> = {};
  for (const d of due) {
    const s = await attempt(d.id);
    results[s] = (results[s] ?? 0) + 1;
  }
  return { processed: due.length, results };
}

export async function retryNotifications(ids: string[]) {
  if (!ids.length) return;
  await db.update(notifications).set({ nextAttemptAt: new Date() }).where(and(inArray(notifications.id, ids), or(eq(notifications.status, "failed"), isNull(notifications.nextAttemptAt))));
  for (const id of ids) await attempt(id);
}
