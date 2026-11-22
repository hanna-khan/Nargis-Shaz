import Link from "next/link";
import type { ReactNode } from "react";
import { formatMoney } from "@/lib/commerce/currency";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types";

/* Server-safe Studio primitives (no hooks). Interactive pieces live in ./client.tsx. */

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && <Link href={back.href} className="mb-2 inline-block text-[12px] text-charcoal/55 hover:text-charcoal">← {back.label}</Link>}
        <h1 className="font-serif text-[34px] leading-tight font-normal">{title}</h1>
        {description && <p className="mt-1 max-w-[720px] text-[13.5px] text-charcoal/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, padded = true, id }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean; id?: string }) {
  return (
    <section id={id} className={cn("rounded-[3px] border border-line bg-white/70", className)}>
      {title && <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5"><h2 className="text-[11px] font-normal tracking-[0.18em] uppercase">{title}</h2>{actions}</header>}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: string; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-[10.5px] tracking-[0.18em] text-charcoal/55 uppercase">{label}</p>
      <p className="mt-2 font-serif text-[30px] leading-none">{value}</p>
      {hint && <p className="mt-2 text-[12px] text-charcoal/55">{hint}</p>}
    </>
  );
  return href ? <Link href={href} className="block rounded-[3px] border border-line bg-white/70 p-5 hover:border-charcoal">{body}</Link> : <div className="rounded-[3px] border border-line bg-white/70 p-5">{body}</div>;
}

const TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  paid: "success", delivered: "success", active: "success", published: "success", live: "success", sent: "success", processed: "success", succeeded: "success", subscribed: "success", received: "info", resellable: "success", completed: "success", in_stock: "success",
  pending: "warning", awaiting_cod: "warning", processing: "warning", confirmed: "info", invited: "warning", draft: "warning", scheduled: "info", test: "warning", low: "warning", queued: "warning", requested: "warning", approved: "info", partially_refunded: "warning", new: "warning", open: "info",
  failed: "danger", cancelled: "danger", refunded: "danger", returned: "danger", suspended: "danger", deactivated: "danger", out: "danger", rejected: "danger", voided: "neutral", archived: "neutral", inactive: "neutral", skipped: "neutral", ignored: "neutral", closed: "neutral", unsubscribed: "neutral", damaged: "danger",
  shipped: "info", in_transit: "info", out_for_delivery: "info", label_created: "info",
};
const TONE_CLASS = { success: "bg-[#e3eadc] text-success", warning: "bg-[#f3e6cf] text-warning", danger: "bg-[#f1dcd6] text-danger", info: "bg-[#dfe5ea] text-[#3b5266]", neutral: "bg-beige text-charcoal/70" };
const SHAPE = { success: "●", warning: "◐", danger: "■", info: "◆", neutral: "○" };
const LABELS: Record<string, string> = { awaiting_cod: "Awaiting COD", partially_refunded: "Part refunded", in_transit: "In transit", out_for_delivery: "Out for delivery", label_created: "Label created" };

/** Status pill — always text + shape, never colour alone. */
export function Status({ value, label }: { value: string; label?: string }) {
  const tone = TONE[value] ?? "neutral";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] whitespace-nowrap", TONE_CLASS[tone])}>
      <span aria-hidden className="text-[8px]">{SHAPE[tone]}</span>{label ?? LABELS[value] ?? value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export const btn = {
  solid: "inline-flex items-center justify-center gap-2 rounded-[3px] bg-charcoal px-4 py-2 text-[12.5px] text-ivory transition-colors hover:bg-cocoa disabled:pointer-events-none disabled:opacity-40",
  outline: "inline-flex items-center justify-center gap-2 rounded-[3px] border border-line bg-white px-4 py-2 text-[12.5px] transition-colors hover:border-charcoal disabled:pointer-events-none disabled:opacity-40",
  danger: "inline-flex items-center justify-center gap-2 rounded-[3px] border border-danger/30 bg-white px-4 py-2 text-[12.5px] text-danger transition-colors hover:bg-[#f1dcd6] disabled:pointer-events-none disabled:opacity-40",
  ghost: "inline-flex items-center gap-2 rounded-[3px] px-2.5 py-1.5 text-[12.5px] text-charcoal/70 hover:bg-beige/60 hover:text-charcoal disabled:opacity-40",
};

export function ALink({ href, children, variant = "solid", className }: { href: string; children: ReactNode; variant?: keyof typeof btn; className?: string }) {
  return <Link href={href} className={cn(btn[variant], className)}>{children}</Link>;
}

export const Money = ({ amount, currency }: { amount: number; currency: string }) => <>{formatMoney(amount, currency as CurrencyCode)}</>;

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[3px] border border-dashed border-line p-10 text-center">
      <p className="font-serif text-[22px]">{title}</p>
      {children && <div className="mt-2 text-[13px] text-charcoal/60">{children}</div>}
    </div>
  );
}

export function NoAccess({ permission }: { permission: string }) {
  return <Empty title="You don't have access to this area">Your role doesn&apos;t include <code className="rounded bg-beige px-1.5">{permission}</code>. Ask a Super Admin to update your role.</Empty>;
}

/** Simple server-rendered table. */
export function Table({ head, children, empty, className }: { head: (string | { label: string; className?: string })[]; children: ReactNode; empty?: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-[3px] border border-line bg-white/70", className)}>
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[10.5px] tracking-[0.14em] text-charcoal/55 uppercase">
            {head.map((h, i) => { const x = typeof h === "string" ? { label: h } : h; return <th key={i} scope="col" className={cn("px-4 py-2.5 font-normal whitespace-nowrap", x.className)}>{x.label}</th>; })}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line/70 [&>tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

/** Link-based pagination that preserves the other search params. */
export function Pagination({ page, pages, params, path }: { page: number; pages: number; params: Record<string, string | string[] | undefined>; path: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    return `${path}${q.toString() ? `?${q}` : ""}`;
  };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2 text-[12px]">
      {page > 1 ? <Link href={href(page - 1)} className={btn.outline}>Previous</Link> : <span className={cn(btn.outline, "opacity-40")}>Previous</span>}
      <span>Page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className={btn.outline}>Next</Link> : <span className={cn(btn.outline, "opacity-40")}>Next</span>}
    </nav>
  );
}

/** GET filter bar — plain form so filters are shareable URLs and work without JavaScript. */
export function FilterBar({ children, path, reset = true }: { children: ReactNode; path: string; reset?: boolean }) {
  return (
    <form method="get" action={path} className="mb-4 flex flex-wrap items-end gap-3 rounded-[3px] border border-line bg-white/70 p-3">
      {children}
      <button className={btn.outline} type="submit">Apply</button>
      {reset && <Link href={path} className={btn.ghost}>Reset</Link>}
    </form>
  );
}

const control = "w-full rounded-[3px] border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-charcoal";
export function FInput({ label, className, ...p }: React.ComponentProps<"input"> & { label: string }) {
  return <label className={cn("block min-w-[140px]", className)}><span className="mb-1 block text-[11px] text-charcoal/60">{label}</span><input className={control} {...p} /></label>;
}
export function FSelect({ label, className, children, ...p }: React.ComponentProps<"select"> & { label: string }) {
  return <label className={cn("block min-w-[140px]", className)}><span className="mb-1 block text-[11px] text-charcoal/60">{label}</span><select className={control} {...p}>{children}</select></label>;
}

export function DL({ items }: { items: [string, ReactNode][] }) {
  return <dl className="grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-[160px_1fr]">{items.map(([k, v]) => <div key={k} className="contents"><dt className="text-charcoal/55">{k}</dt><dd>{v}</dd></div>)}</dl>;
}

export const fmtDateTime = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }) : "—");
export const fmtDate = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" }) : "—");
