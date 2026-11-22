/**
 * Transactional email templates. Defaults are seeded into `notification_templates` and can be edited
 * in Studio → Emails. Template bodies are plain text with {{placeholders}}; all values are HTML-escaped
 * and rendered into one branded, responsive layout (table-based for email clients).
 */

export interface TemplateDefault { key: string; name: string; subject: string; body: string }

export const TEMPLATE_DEFAULTS: TemplateDefault[] = [
  { key: "welcome", name: "Welcome", subject: "Welcome to Nargis & Shaz", body: "Dear {{firstName}},\n\nThank you for creating an account with Nargis & Shaz. You can now save addresses, follow your orders and keep a wishlist.\n\nWith warm regards,\nThe Nargis & Shaz atelier" },
  { key: "email_verification", name: "Email verification", subject: "Confirm your email address", body: "Dear {{firstName}},\n\nPlease confirm your email address to finish setting up your account. This link expires in 24 hours.\n\nIf you didn't create an account, you can ignore this email." },
  { key: "password_reset", name: "Password reset", subject: "Reset your password", body: "Hello,\n\nWe received a request to reset the password for this email address. The link below expires in 60 minutes and can be used once.\n\nIf you didn't ask for this, you can ignore this email — your password won't change." },
  { key: "staff_invite", name: "Staff invitation", subject: "You've been invited to Nargis & Shaz Studio", body: "Hello {{name}},\n\n{{invitedBy}} has invited you to Nargis & Shaz Studio as {{role}}. Set your password to activate your account. The link expires in 72 hours." },
  { key: "order_confirmation", name: "Order confirmation", subject: "Your order {{orderNumber}} is confirmed", body: "Dear {{firstName}},\n\nThank you for your order. We've received it and will let you know as soon as it ships.\n\n{{paymentNote}}" },
  { key: "payment_confirmation", name: "Payment confirmation", subject: "Payment received for {{orderNumber}}", body: "Dear {{firstName}},\n\nWe've received your payment of {{amount}} for order {{orderNumber}}. Thank you." },
  { key: "payment_failed", name: "Payment failure", subject: "Payment for {{orderNumber}} didn't go through", body: "Dear {{firstName}},\n\nYour payment for order {{orderNumber}} was not completed, so the order hasn't been confirmed and no money was taken. You can try again or choose another payment method." },
  { key: "order_processing", name: "Order processing", subject: "We're preparing order {{orderNumber}}", body: "Dear {{firstName}},\n\nYour order is being prepared and pressed in our atelier. We'll email you the tracking details when it's dispatched." },
  { key: "order_shipped", name: "Order shipped", subject: "Order {{orderNumber}} is on its way", body: "Dear {{firstName}},\n\nYour order has been dispatched with {{carrier}}. Tracking number: {{trackingNumber}}." },
  { key: "order_delivered", name: "Order delivered", subject: "Order {{orderNumber}} has been delivered", body: "Dear {{firstName}},\n\nOur courier reports that your order has been delivered. We hope you love it. If anything isn't right, reply to this email within 14 days." },
  { key: "order_cancelled", name: "Order cancelled", subject: "Order {{orderNumber}} has been cancelled", body: "Dear {{firstName}},\n\nYour order {{orderNumber}} has been cancelled. {{reason}}\n\nIf a payment was taken, it will be refunded to the original payment method." },
  { key: "refund_confirmation", name: "Refund confirmation", subject: "Refund issued for {{orderNumber}}", body: "Dear {{firstName}},\n\nWe've issued a refund of {{amount}} for order {{orderNumber}}. Depending on your bank it can take 5–10 working days to appear." },
  { key: "return_update", name: "Return update", subject: "Update on your return {{returnNumber}}", body: "Dear {{firstName}},\n\nYour return {{returnNumber}} for order {{orderNumber}} is now: {{returnStatus}}." },
  { key: "order_note", name: "Message about your order", subject: "A message about order {{orderNumber}}", body: "Dear {{firstName}},\n\n{{message}}" },
  { key: "contact_acknowledgement", name: "Contact form acknowledgement", subject: "We've received your message", body: "Dear {{name}},\n\nThank you for writing to us. A member of our client care team will reply within one working day.\n\nYour message: \"{{subjectLine}}\"" },
  { key: "newsletter_confirmation", name: "Newsletter confirmation", subject: "Please confirm your subscription", body: "Hello,\n\nPlease confirm that you'd like to receive letters from Nargis & Shaz about new collections and private events. You can unsubscribe at any time." },
];

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function interpolate(tpl: string, vars: Record<string, unknown>, escape = true) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = vars[k];
    const s = v === undefined || v === null ? "" : String(v);
    return escape ? escapeHtml(s) : s;
  });
}

export interface EmailLine { name: string; detail: string; quantity: number; total: string }
export interface EmailPayload extends Record<string, unknown> {
  actionUrl?: string;
  actionLabel?: string;
  lines?: EmailLine[];
  totals?: { label: string; value: string }[];
}

const C = { paper: "#F4F1EA", ink: "#2E1F1A", bronze: "#9E7B56", line: "#E2DACB", muted: "#6E5F57" };

/** Renders subject + responsive branded HTML + plain-text alternative. */
export function renderEmail(tpl: { subject: string; body: string }, payload: EmailPayload, storeName = "Nargis & Shaz") {
  const subject = interpolate(tpl.subject, payload, false).replace(/[\r\n]+/g, " ").slice(0, 200);
  const text = interpolate(tpl.body, payload, false);
  const paragraphs = interpolate(tpl.body, payload).split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px;line-height:1.65">${p.replace(/\n/g, "<br>")}</p>`).join("");
  const safeUrl = payload.actionUrl && /^https?:\/\//.test(payload.actionUrl) ? escapeHtml(payload.actionUrl) : null;
  const button = safeUrl
    ? `<p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:${C.ink};color:${C.paper};text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:2px;text-transform:uppercase">${escapeHtml(payload.actionLabel ?? "Open")}</a></p><p style="font-size:12px;color:${C.muted};word-break:break-all">Or paste this link into your browser: ${safeUrl}</p>`
    : "";
  const lines = payload.lines?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};margin:8px 0 0">${payload.lines.map((l) => `<tr><td style="padding:12px 0;border-bottom:1px solid ${C.line}"><strong style="font-weight:normal;font-family:Georgia,serif;font-size:16px">${escapeHtml(l.name)}</strong><br><span style="font-size:12px;color:${C.muted}">${escapeHtml(l.detail)} · Qty ${l.quantity}</span></td><td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font-size:14px;white-space:nowrap">${escapeHtml(l.total)}</td></tr>`).join("")}</table>`
    : "";
  const totals = payload.totals?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 8px">${payload.totals.map((t, i) => `<tr><td style="padding:4px 0;font-size:${i === payload.totals!.length - 1 ? 16 : 13}px">${escapeHtml(t.label)}</td><td align="right" style="padding:4px 0;font-size:${i === payload.totals!.length - 1 ? 16 : 13}px">${escapeHtml(t.value)}</td></tr>`).join("")}</table>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:${C.paper};color:${C.ink};font-family:'Helvetica Neue',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.line}">
<tr><td align="center" style="padding:28px 24px 20px;border-bottom:1px solid ${C.line}"><div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:5px">NARGIS &amp; SHAZ</div><div style="font-size:9px;letter-spacing:4px;color:${C.bronze};margin-top:6px">DESIGNER LABEL</div></td></tr>
<tr><td style="padding:32px 32px 16px;font-size:14px">${paragraphs}${lines}${totals}${button}</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid ${C.line};font-size:11px;color:${C.muted};line-height:1.6">${escapeHtml(storeName)} · ${escapeHtml(String(payload.supportEmail ?? "care@nargisandshaz.com"))}<br>You're receiving this email because of activity on your account or order.</td></tr>
</table></td></tr></table></body></html>`;
  const textAlt = `${text}${payload.lines?.length ? "\n\n" + payload.lines.map((l) => `${l.name} (${l.detail}) ×${l.quantity} — ${l.total}`).join("\n") : ""}${payload.totals?.length ? "\n" + payload.totals.map((t) => `${t.label}: ${t.value}`).join("\n") : ""}${payload.actionUrl ? `\n\n${payload.actionLabel ?? "Link"}: ${payload.actionUrl}` : ""}`;
  return { subject, html, text: textAlt };
}
