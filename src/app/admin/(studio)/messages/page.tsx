import { asc, desc, sql } from "drizzle-orm";
import { ActionButton, AdminForm, Check, Disclosure, Field, TextareaField } from "@/components/admin/client";
import { Card, fmtDateTime, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { emailDriver } from "@/server/email";
import { messageStatusAction, retryEmailsAction, saveTemplateAction, sendTestEmailAction } from "../../_actions/ops";

export const metadata = { title: "Messages & emails" };

export default async function MessagesPage() {
  const { staff, allowed } = await staffPage("notifications.view");
  if (!allowed) return <NoAccess permission="notifications.view" />;
  const [messages, notes, templates, subs] = await Promise.all([
    db.select().from(s.contactMessages).orderBy(desc(s.contactMessages.createdAt)).limit(60),
    db.select().from(s.notifications).orderBy(desc(s.notifications.createdAt)).limit(60),
    db.select().from(s.notificationTemplates).orderBy(asc(s.notificationTemplates.name)),
    db.select({ status: s.newsletterSubscribers.status, n: sql<number>`COUNT(*)` }).from(s.newsletterSubscribers).groupBy(s.newsletterSubscribers.status),
  ]);
  const can = staffCan(staff, "notifications.manage");
  const pii = staffCan(staff, "customers.view_pii");
  const failed = notes.filter((n) => n.status === "failed");
  return (
    <>
      <PageHeader title="Messages & emails" description={`Email provider: ${emailDriver() === "resend" ? "Resend" : "not configured — messages are recorded as “skipped” and not delivered"}. Failed sends retry automatically (1 min → 12 h) when the maintenance cron runs.`}
        actions={can ? <ActionButton action={retryEmailsAction} fields={{}} label={`Retry due emails${failed.length ? ` (${failed.length} failed)` : ""}`} /> : undefined} />
      <Card title="Contact form messages" className="mb-6" padded={false}>
        <Table head={["Received", "From", "Subject", "Message", "Status", ""]} className="border-0">
          {messages.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
              <td>{m.name}<span className="block text-[11.5px] text-charcoal/55">{pii ? <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="underline">{m.email}</a> : "hidden"}{m.orderNumber ? ` · ${m.orderNumber}` : ""}</span></td>
              <td>{m.subject}</td>
              <td className="max-w-[360px] text-[12.5px] whitespace-pre-line">{m.message}</td>
              <td><Status value={m.status} /></td>
              <td>{can && <div className="flex gap-1">{m.status !== "open" && <ActionButton action={messageStatusAction} fields={{ id: m.id, status: "open" }} label="Open" variant="ghost" />}{m.status !== "closed" && <ActionButton action={messageStatusAction} fields={{ id: m.id, status: "closed" }} label="Close" variant="ghost" />}</div>}</td>
            </tr>
          ))}
        </Table>
        {!messages.length && <p className="p-5 text-[13px] text-charcoal/55">No messages yet.</p>}
      </Card>

      <Card title="Email log" className="mb-6" padded={false}>
        <Table head={["Queued", "Template", "To", "Status", "Attempts", "Error", ""]} className="border-0">
          {notes.map((n) => (
            <tr key={n.id}>
              <td className="whitespace-nowrap">{fmtDateTime(n.createdAt)}</td>
              <td>{n.templateKey}</td>
              <td className="max-w-[200px] truncate">{pii ? n.recipient : n.recipient.replace(/^(.).*(@.*)$/, "$1•••$2")}</td>
              <td><Status value={n.status} /></td>
              <td>{n.attempts}</td>
              <td className="max-w-[280px] text-[11.5px] text-charcoal/60">{n.lastError}{n.nextAttemptAt && n.status === "failed" ? ` · next ${fmtDateTime(n.nextAttemptAt)}` : ""}</td>
              <td>{can && n.status === "failed" && <ActionButton action={retryEmailsAction} fields={{ ids: n.id }} label="Retry" variant="ghost" />}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Email templates" id="templates" className="mb-6">
        <p className="mb-4 text-[12.5px] text-charcoal/60">Plain text with placeholders such as {"{{firstName}}"} and {"{{orderNumber}}"}. Every email uses the branded layout; order emails add the item list and totals automatically.</p>
        <div className="grid gap-3">
          {templates.map((t) => (
            <Disclosure key={t.key} label={`${t.name}${t.enabled ? "" : " (disabled)"}`} variant="ghost">
              <AdminForm action={saveTemplateAction} submit="Save template" footer={can}>
                <input type="hidden" name="key" value={t.key} />
                <Field label="Subject" name="subject" defaultValue={t.subject} />
                <TextareaField label="Body" name="body" defaultValue={t.body} rows={6} />
                <Check name="enabled" label="Enabled" defaultChecked={t.enabled} />
              </AdminForm>
              {can && <div className="mt-2"><ActionButton action={sendTestEmailAction} fields={{ key: t.key }} label={`Send test to ${staff.email}`} variant="ghost" /></div>}
            </Disclosure>
          ))}
        </div>
      </Card>

      <Card title="Newsletter">
        <p className="text-[13px]">{subs.map((x) => `${x.status}: ${Number(x.n)}`).join(" · ") || "No subscribers yet."}</p>
        <p className="mt-1 text-[12px] text-charcoal/55">Double opt-in: addresses become “subscribed” only after clicking the confirmation email.</p>
      </Card>
    </>
  );
}

