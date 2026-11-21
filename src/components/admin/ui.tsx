"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAdmin } from "./admin-context";
import type { Permission } from "@/types";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && <Link href={back.href} className="mb-2 inline-block text-[12px] text-charcoal/55 hover:text-charcoal">← {back.label}</Link>}
        <h1 className="font-serif text-[36px] leading-tight font-normal">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-charcoal/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, padded = true }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-[3px] border border-line bg-white/70", className)}>
      {title && <header className="flex items-center justify-between border-b border-line px-5 py-3.5"><h2 className="text-[11px] font-normal tracking-[0.18em] uppercase">{title}</h2>{actions}</header>}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, delta, hint }: { label: string; value: string; delta?: number; hint?: string }) {
  return (
    <div className="rounded-[3px] border border-line bg-white/70 p-5">
      <p className="text-[10.5px] tracking-[0.18em] text-charcoal/55 uppercase">{label}</p>
      <p className="mt-2 font-serif text-[34px] leading-none">{value}</p>
      <p className="mt-2 text-[12px] text-charcoal/55">
        {delta !== undefined && <span className={delta >= 0 ? "text-success" : "text-danger"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% </span>}
        {hint}
      </p>
    </div>
  );
}

const TONES: Record<string, string> = {
  paid: "bg-[#e3eadc] text-success", delivered: "bg-[#e3eadc] text-success", active: "bg-[#e3eadc] text-success", published: "bg-[#e3eadc] text-success", live: "bg-[#e3eadc] text-success",
  pending: "bg-[#f3e6cf] text-warning", awaiting_cod: "bg-[#f3e6cf] text-warning", processing: "bg-[#f3e6cf] text-warning", unfulfilled: "bg-[#f3e6cf] text-warning", invited: "bg-[#f3e6cf] text-warning", draft: "bg-[#f3e6cf] text-warning", test: "bg-[#f3e6cf] text-warning", low: "bg-[#f3e6cf] text-warning",
  failed: "bg-[#f1dcd6] text-danger", cancelled: "bg-[#f1dcd6] text-danger", refunded: "bg-[#f1dcd6] text-danger", returned: "bg-[#f1dcd6] text-danger", suspended: "bg-[#f1dcd6] text-danger", out: "bg-[#f1dcd6] text-danger", archived: "bg-beige text-charcoal/60", inactive: "bg-beige text-charcoal/60",
  shipped: "bg-[#dfe5ea] text-[#3b5266]",
};
const ICON: Record<string, string> = { success: "●", warning: "◐", danger: "■" };

/** Status pill — always text + shape, never colour alone. */
export function Status({ value, label }: { value: string; label?: string }) {
  const tone = TONES[value] ?? "bg-beige text-charcoal";
  const shape = tone.includes("success") ? ICON.success : tone.includes("warning") ? ICON.warning : tone.includes("danger") ? ICON.danger : "○";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] whitespace-nowrap capitalize", tone)}><span aria-hidden className="text-[8px]">{shape}</span>{label ?? (value === "awaiting_cod" ? "Awaiting COD" : value.replace(/_/g, " "))}</span>;
}

export function AButton({ children, variant = "solid", className, ...p }: React.ComponentProps<"button"> & { variant?: "solid" | "outline" | "ghost" | "danger" }) {
  const v = { solid: "bg-charcoal text-ivory hover:bg-cocoa", outline: "border border-line bg-white hover:border-charcoal", ghost: "hover:bg-beige/60", danger: "border border-danger/30 text-danger hover:bg-[#f1dcd6]" }[variant];
  return <button className={cn("inline-flex items-center gap-2 rounded-[3px] px-4 py-2 text-[12.5px] transition-colors disabled:pointer-events-none disabled:opacity-40", v, className)} {...p}>{children}</button>;
}

export function ALink({ href, children, variant = "solid" }: { href: string; children: ReactNode; variant?: "solid" | "outline" }) {
  return <Link href={href} className={cn("inline-flex items-center gap-2 rounded-[3px] px-4 py-2 text-[12.5px] transition-colors", variant === "solid" ? "bg-charcoal text-ivory hover:bg-cocoa" : "border border-line bg-white hover:border-charcoal")}>{children}</Link>;
}

/** Renders children only when the previewed role has the permission (UI convenience, not security). */
export function Gate({ perm, children, fallback = null }: { perm: Permission; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAdmin();
  return <>{can(perm) ? children : fallback}</>;
}

export function NoAccess({ perm }: { perm: Permission }) {
  const { me } = useAdmin();
  return (
    <div className="rounded-[3px] border border-dashed border-line p-12 text-center">
      <p className="font-serif text-[24px]">You don&apos;t have access to this area</p>
      <p className="mt-2 text-[13px] text-charcoal/60">{me.name}&apos;s role doesn&apos;t include <code className="rounded bg-beige px-1.5">{perm}</code>. Ask an owner or administrator.</p>
    </div>
  );
}

export function AInput({ label, className, ...p }: React.ComponentProps<"input"> & { label?: string }) {
  const input = <input className={cn("w-full rounded-[3px] border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-charcoal", className)} {...p} />;
  return label ? <label className="block"><span className="mb-1.5 block text-[11.5px] text-charcoal/65">{label}</span>{input}</label> : input;
}
export function ASelect({ label, className, children, ...p }: React.ComponentProps<"select"> & { label?: string }) {
  const sel = <select className={cn("w-full rounded-[3px] border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-charcoal", className)} {...p}>{children}</select>;
  return label ? <label className="block"><span className="mb-1.5 block text-[11.5px] text-charcoal/65">{label}</span>{sel}</label> : sel;
}
export function ATextarea({ label, className, ...p }: React.ComponentProps<"textarea"> & { label?: string }) {
  return <label className="block">{label && <span className="mb-1.5 block text-[11.5px] text-charcoal/65">{label}</span>}<textarea className={cn("min-h-24 w-full rounded-[3px] border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-charcoal", className)} {...p} /></label>;
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40", checked ? "bg-cocoa" : "bg-camel/60")}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("-mb-px border-b-2 px-3.5 py-2.5 text-[12.5px] whitespace-nowrap", value === t.id ? "border-charcoal" : "border-transparent text-charcoal/55 hover:text-charcoal")}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 text-charcoal/45">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export interface Column<T> { key: string; header: string; cell: (row: T) => ReactNode; sort?: (row: T) => string | number; className?: string; }

/** Reusable sortable, searchable, paginated table. */
export function DataTable<T>({ rows, columns, getId, search, onRowHref, empty = "Nothing here yet.", pageSize = 12, toolbar }: { rows: T[]; columns: Column<T>[]; getId: (r: T) => string; search?: (r: T) => string; onRowHref?: (r: T) => string; empty?: string; pageSize?: number; toolbar?: ReactNode }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    let r = search && q ? rows.filter((x) => search(x).toLowerCase().includes(q.toLowerCase())) : rows;
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sort) r = [...r].sort((a, b) => { const A = col.sort!(a), B = col.sort!(b); return (A > B ? 1 : A < B ? -1 : 0) * sort!.dir; });
    return r;
  }, [rows, q, sort, columns, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="rounded-[3px] border border-line bg-white/70">
      {(search || toolbar) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          {search && <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search…" aria-label="Search table" className="w-full max-w-[280px] rounded-[3px] border border-line bg-white px-3 py-1.5 text-[13px] outline-none focus:border-charcoal" />}
          {toolbar}
          <span className="ml-auto text-[12px] text-charcoal/50">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[10.5px] tracking-[0.14em] text-charcoal/55 uppercase">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-2.5 font-normal whitespace-nowrap", c.className)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  {c.sort ? <button onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 }))} className="uppercase hover:text-charcoal">{c.header}{sort?.key === c.key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</button> : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={getId(r)} className={cn("border-b border-line/70 last:border-0", onRowHref && "cursor-pointer hover:bg-ivory/70")} onClick={onRowHref ? (e) => { if (!(e.target as HTMLElement).closest("a,button,input,select")) router.push(onRowHref(r)); } : undefined}>
                {columns.map((c) => <td key={c.key} className={cn("px-4 py-3 align-middle", c.key === "n" && "whitespace-nowrap", c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {view.length === 0 && <p className="p-10 text-center text-[13px] text-charcoal/55">{empty}</p>}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-line p-3 text-[12px]">
          <AButton variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</AButton>
          <span>{page + 1} / {pages}</span>
          <AButton variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</AButton>
        </div>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-charcoal/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="relative w-full max-w-[520px] rounded-[4px] bg-paper shadow-2xl" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3 }}>
            <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="font-serif text-[22px]">{title}</h2><button onClick={onClose} aria-label="Close" className="text-2xl leading-none font-extralight">×</button></div>
            <div className="space-y-4 p-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
