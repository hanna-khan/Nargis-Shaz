import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import * as s from "./db/schema";
import { limit } from "./auth/rate-limit";
import { sendEmail } from "./email";
import { AppError, newId, normaliseEmail, randomToken, sha256, siteUrl } from "./lib/core";
import { requestMeta } from "./lib/request";
import { verifyTurnstile } from "./lib/turnstile";

/** Double opt-in newsletter subscription. Responds identically for new and existing addresses. */
export async function subscribe(emailRaw: string, source = "footer", turnstileToken?: string | null) {
  const email = z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254).parse(emailRaw);
  const meta = await requestMeta();
  await limit(`newsletter:${meta.ip}`, 8, 3600);
  if (!(await verifyTurnstile(turnstileToken, meta.ip))) throw new AppError("Please complete the verification and try again.");
  const [existing] = await db.select().from(s.newsletterSubscribers).where(eq(s.newsletterSubscribers.email, email));
  if (existing?.status === "subscribed") return;
  const token = randomToken();
  if (existing) await db.update(s.newsletterSubscribers).set({ status: "pending", tokenHash: sha256(token), source }).where(eq(s.newsletterSubscribers.id, existing.id));
  else await db.insert(s.newsletterSubscribers).values({ id: newId("nls"), email, status: "pending", tokenHash: sha256(token), source });
  await sendEmail("newsletter_confirmation", email, { actionUrl: siteUrl(`/newsletter/confirm?token=${token}`), actionLabel: "Confirm subscription" });
}

export async function confirmSubscription(token: string) {
  const [row] = await db.select().from(s.newsletterSubscribers).where(and(eq(s.newsletterSubscribers.tokenHash, sha256(token)), eq(s.newsletterSubscribers.status, "pending")));
  if (!row) return false;
  await db.update(s.newsletterSubscribers).set({ status: "subscribed", confirmedAt: new Date(), tokenHash: null }).where(eq(s.newsletterSubscribers.id, row.id));
  return true;
}

export async function unsubscribe(emailRaw: string) {
  await db.update(s.newsletterSubscribers).set({ status: "unsubscribed", unsubscribedAt: new Date() }).where(eq(s.newsletterSubscribers.email, normaliseEmail(emailRaw)));
}

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  orderNumber: z.string().trim().max(24).optional().default(""),
  subject: z.string().trim().min(3, "Add a subject").max(160),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(5000),
  website: z.string().max(0, "").optional(), // honeypot — must stay empty
});

export async function submitContact(raw: z.input<typeof contactSchema>, turnstileToken?: string | null) {
  const data = contactSchema.parse(raw);
  const meta = await requestMeta();
  await limit(`contact:${meta.ip}`, 5, 3600, "You've sent several messages recently. Please wait a little before sending another.");
  if (!(await verifyTurnstile(turnstileToken, meta.ip))) throw new AppError("Please complete the verification and try again.");
  await db.insert(s.contactMessages).values({ id: newId("msg"), name: data.name, email: data.email, orderNumber: data.orderNumber || null, subject: data.subject, message: data.message, ip: meta.ip });
  await sendEmail("contact_acknowledgement", data.email, { name: data.name.split(" ")[0], subjectLine: data.subject });
}

export async function pendingNewsletterCount() {
  const rows = await db.select({ id: s.newsletterSubscribers.id }).from(s.newsletterSubscribers).where(and(eq(s.newsletterSubscribers.status, "pending"), gt(s.newsletterSubscribers.createdAt, new Date(Date.now() - 7 * 86400_000)), isNull(s.newsletterSubscribers.confirmedAt)));
  return rows.length;
}
