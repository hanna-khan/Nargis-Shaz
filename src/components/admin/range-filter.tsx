import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Range } from "@/server/admin/reports";
import { btn } from "./ui";

const PRESETS: [string, string][] = [["today", "Today"], ["yesterday", "Yesterday"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["month", "This month"], ["prev_month", "Previous month"]];

/** Date range presets + custom range (GET form, shareable URL). */
export function RangeFilter({ path, range, extra = {} }: { path: string; range: Range; extra?: Record<string, string> }) {
  const q = (p: string) => `${path}?${new URLSearchParams({ ...extra, range: p })}`;
  const iso = (d: Date) => new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 10);
  return (
    <div className="mb-6 flex flex-wrap items-end gap-2">
      {PRESETS.map(([id, label]) => (
        <Link key={id} href={q(id)} aria-current={range.preset === id ? "true" : undefined} className={cn(btn.outline, "!py-1.5", range.preset === id && "!border-charcoal !bg-charcoal !text-ivory")}>{label}</Link>
      ))}
      <form method="get" action={path} className="flex items-end gap-2">
        {Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input type="hidden" name="range" value="custom" />
        <label className="text-[11px] text-charcoal/60">From<input type="date" name="from" defaultValue={iso(range.from)} className="mt-1 block rounded-[3px] border border-line bg-white px-2 py-1 text-[12.5px]" /></label>
        <label className="text-[11px] text-charcoal/60">To<input type="date" name="to" defaultValue={iso(new Date(range.to.getTime() - 1))} className="mt-1 block rounded-[3px] border border-line bg-white px-2 py-1 text-[12.5px]" /></label>
        <button className={cn(btn.outline, "!py-1.5", range.preset === "custom" && "!border-charcoal")}>Apply</button>
      </form>
    </div>
  );
}
