import Image from "next/image";
import { and, desc, eq, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { ActionButton, AdminForm, Disclosure, Field, SelectField } from "@/components/admin/client";
import { Card, FilterBar, FInput, FSelect, NoAccess, PageHeader, Pagination } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { mediaUsage } from "@/server/admin/catalog";
import { staffCan, staffPage } from "@/server/admin/guard";
import { mediaDriver, r2Missing } from "@/server/media/storage";
import { deleteMediaAction, updateMediaAction, uploadImagesAction } from "../../_actions/catalog";

export const metadata = { title: "Media library" };
const PAGE = 36;
const FOLDERS = ["products", "campaigns", "editorial", "brand"];

export default async function MediaPage(props: PageProps<"/admin/media">) {
  const { staff, allowed } = await staffPage("media.view");
  if (!allowed) return <NoAccess permission="media.view" />;
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const where: SQL[] = [isNull(s.mediaAssets.deletedAt)];
  if (str("q")) { const L = `%${str("q").replace(/[\\%_]/g, (c) => `\\${c}`)}%`; where.push(or(like(s.mediaAssets.alt, L), like(s.mediaAssets.filename, L))!); }
  if (str("folder")) where.push(eq(s.mediaAssets.folder, str("folder")));
  if (str("source") === "sample") where.push(eq(s.mediaAssets.driver, "remote"));
  if (str("source") === "uploaded") where.push(sql`${s.mediaAssets.driver} <> 'remote'`);
  const cond = and(...where);
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(s.mediaAssets).where(cond).orderBy(desc(s.mediaAssets.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: sql<number>`COUNT(*)` }).from(s.mediaAssets).where(cond),
  ]);
  const usage = await mediaUsage(rows.map((r) => r.id));
  const driver = mediaDriver();
  const missing = driver === "r2" ? r2Missing() : [];

  return (
    <>
      <PageHeader title="Media library" description={<>Images are stored in {driver === "r2" ? "Cloudflare R2" : "the local uploads folder (development)"}; only their details are kept in the database. {missing.length > 0 && <span className="text-danger">Storage is not configured: missing {missing.join(", ")}.</span>}</>} />
      {staffCan(staff, "media.upload") && (
        <Card title="Upload" className="mb-6">
          <AdminForm action={uploadImagesAction} submit="Upload" resetOnSuccess className="md:grid-cols-3">
            <Field label="Images (JPEG, PNG, WebP, AVIF · max 12 MB · min 300 px)" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="md:col-span-3" />
            <SelectField label="Folder" name="folder">{FOLDERS.map((x) => <option key={x}>{x}</option>)}</SelectField>
            <Field label="Alt text (describe what is in the photo)" name="alt" className="md:col-span-2" />
          </AdminForm>
        </Card>
      )}
      <FilterBar path="/admin/media">
        <FInput label="Search" name="q" defaultValue={str("q")} placeholder="Alt text or file name" />
        <FSelect label="Folder" name="folder" defaultValue={str("folder")}><option value="">All</option>{FOLDERS.map((x) => <option key={x}>{x}</option>)}</FSelect>
        <FSelect label="Source" name="source" defaultValue={str("source")}><option value="">All</option><option value="uploaded">Uploaded</option><option value="sample">Sample photography (replace before launch)</option></FSelect>
      </FilterBar>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rows.map((m) => {
          const used = usage.get(m.id) ?? [];
          return (
            <li key={m.id} className="rounded-[3px] border border-line bg-white p-2 text-[12px]">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square overflow-hidden bg-beige"><Image src={m.url} alt={m.alt} fill sizes="200px" className="object-cover" /></a>
              <p className="mt-2 line-clamp-2 min-h-8">{m.alt || <span className="text-danger">No alt text</span>}</p>
              <p className="text-[11px] text-charcoal/50">{m.folder} · {m.width}×{m.height}{m.driver === "remote" ? " · sample" : ""}</p>
              <p className="text-[11px] text-charcoal/50" title={used.join("\n")}>{used.length ? `Used in ${used.length} place${used.length > 1 ? "s" : ""}` : "Unused"}</p>
              {m.credit && m.driver === "remote" && <p className="text-[10.5px] text-charcoal/40">{m.credit.photographer} · {m.credit.source}</p>}
              {staffCan(staff, "media.upload") && (
                <div className="mt-2"><Disclosure label="Edit" variant="ghost">
                  <AdminForm action={updateMediaAction} submit="Save" className="gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <Field label="Alt text" name="alt" defaultValue={m.alt} />
                    <SelectField label="Folder" name="folder" defaultValue={m.folder}>{FOLDERS.map((x) => <option key={x}>{x}</option>)}</SelectField>
                    <Field label="Replace file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
                    {used.length > 0 && <p className="text-[11px] text-charcoal/55">{used.join("; ")}</p>}
                  </AdminForm>
                </Disclosure></div>
              )}
              {staffCan(staff, "media.delete") && !used.length && <ActionButton action={deleteMediaAction} fields={{ id: m.id }} label="Delete" variant="ghost" confirm="Delete this image permanently?" />}
            </li>
          );
        })}
      </ul>
      <Pagination page={page} pages={Math.ceil(Number(n) / PAGE)} params={sp} path="/admin/media" />
    </>
  );
}
