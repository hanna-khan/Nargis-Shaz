"use server";

export type SubscribeResult = { ok: true } | { ok: false; error: string };

/**
 * Newsletter sign-up. Validates on the server.
 * Phase 2: upsert into `newsletter_subscribers` (with consent timestamp + market) and
 * sync to the email platform. Nothing is stored in Phase 1.
 */
export async function subscribeNewsletter(formData: FormData): Promise<SubscribeResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const consent = formData.get("consent");
  if (!email) return { ok: false, error: "Please enter your email address." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return { ok: false, error: "That email address doesn't look quite right." };
  if (consent !== null && consent !== "on") return { ok: false, error: "Please confirm you'd like to receive our emails." };
  return { ok: true };
}
