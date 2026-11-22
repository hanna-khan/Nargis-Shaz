import { asc } from "drizzle-orm";
import { AdminForm, Disclosure, Field, TextareaField } from "@/components/admin/client";
import { Card, fmtDateTime, NoAccess, PageHeader } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { staffCan, staffPage } from "@/server/admin/guard";
import { saveNavigationAction, savePolicyAction } from "../../_actions/content";

export const metadata = { title: "Pages & navigation" };

const PANELS = [["none", "Plain link"], ["shop", "Shop mega menu"], ["occasion:workwear", "Workwear menu"], ["occasion:everyday", "Everyday menu"], ["occasion:evening", "Evening menu"], ["occasion:festive", "Festive menu"], ["collections", "Collections menu"]];

export default async function ContentPage() {
  const { staff, allowed } = await staffPage("content.view");
  if (!allowed) return <NoAccess permission="content.view" />;
  const [policies, menus, items] = await Promise.all([
    db.select().from(s.policyPages).orderBy(asc(s.policyPages.slug)),
    db.select().from(s.navigationMenus).orderBy(asc(s.navigationMenus.key)),
    db.select().from(s.navigationItems).orderBy(asc(s.navigationItems.sortOrder)),
  ]);
  const can = staffCan(staff, "content.publish");
  return (
    <>
      <PageHeader title="Pages & navigation" description="Policy pages, FAQs and the header and footer menus. Saving publishes immediately." />
      <h2 className="mb-3 text-[11px] tracking-[0.18em] uppercase">Navigation</h2>
      <div className="mb-10 grid gap-4 xl:grid-cols-2">
        {menus.map((m) => (
          <Card key={m.id} title={m.name}>
            <AdminForm action={saveNavigationAction} submit="Publish menu" footer={can}>
              <input type="hidden" name="menuId" value={m.id} />
              {items.filter((i) => i.menuId === m.id).map((i) => (
                <div key={i.id} className="grid grid-cols-[1fr_1.3fr_60px_auto] items-end gap-2">
                  <input type="hidden" name="itemId" value={i.id} />
                  <Field label="Label" name={`label_${i.id}`} defaultValue={i.label} />
                  <Field label="Link" name={`href_${i.id}`} defaultValue={i.href} />
                  <Field label="Order" name={`sort_${i.id}`} type="number" defaultValue={String(i.sortOrder)} />
                  <div className="flex gap-3 pb-2 text-[12px]">
                    <label className="flex items-center gap-1"><input type="checkbox" name={`enabled_${i.id}`} defaultChecked={i.enabled} className="accent-charcoal" />On</label>
                    <label className="flex items-center gap-1"><input type="checkbox" name={`delete_${i.id}`} className="accent-danger" />Delete</label>
                  </div>
                  {m.key === "header" && <label className="col-span-4 -mt-1 text-[11.5px] text-charcoal/60">Menu panel <select name={`panel_${i.id}`} defaultValue={i.panel} className="ml-2 rounded-[3px] border border-line px-2 py-1">{PANELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
                <Field label="New link label" name="newLabel" />
                <Field label="New link URL" name="newHref" placeholder="/shop/dresses" />
                {m.key === "header" && <label className="text-[11.5px] text-charcoal/60">Panel <select name="newPanel" className="ml-2 rounded-[3px] border border-line px-2 py-1">{PANELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>}
              </div>
            </AdminForm>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-[11px] tracking-[0.18em] uppercase">Policies & FAQs</h2>
      <div className="grid gap-4">
        {policies.map((p) => (
          <Card key={p.slug} title={`${p.title} · /${p.slug === "faqs" ? "customer-care#faqs" : `legal/${p.slug}`}`} actions={<span className="text-[11.5px] text-charcoal/50">Updated {fmtDateTime(p.updatedAt)}</span>}>
            <Disclosure label="Edit">
              <AdminForm action={savePolicyAction} submit="Publish page" footer={can}>
                <input type="hidden" name="slug" value={p.slug} />
                <Field label="Title" name="title" defaultValue={p.title} />
                <TextareaField label="Introduction" name="intro" defaultValue={p.intro} rows={2} />
                {p.sections.map((sec, i) => (
                  <div key={i} className="grid gap-2 rounded-[3px] bg-beige/40 p-3">
                    <Field label={p.slug === "faqs" ? "Question" : "Heading"} name="heading" defaultValue={sec.heading} hint="Clear the heading to remove this section." />
                    <TextareaField label={p.slug === "faqs" ? "Answer" : "Text (blank line = new paragraph)"} name="sectionBody" defaultValue={sec.body.join("\n\n")} rows={4} />
                  </div>
                ))}
                <div className="grid gap-2 rounded-[3px] border border-dashed border-line p-3">
                  <Field label={p.slug === "faqs" ? "New question" : "New section heading"} name="newHeading" />
                  <TextareaField label="Text" name="newBody" rows={3} />
                </div>
                {p.slug !== "faqs" && <p className="text-[11.5px] text-warning">Policy wording should be reviewed by a lawyer for each market you sell in.</p>}
              </AdminForm>
            </Disclosure>
          </Card>
        ))}
      </div>
    </>
  );
}
