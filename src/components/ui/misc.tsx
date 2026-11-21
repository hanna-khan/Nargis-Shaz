import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "dark" | "accent"; className?: string }) {
  const tones = {
    neutral: "bg-beige text-charcoal",
    success: "bg-[#e3eadc] text-success",
    warning: "bg-[#f3e6cf] text-warning",
    danger: "bg-[#f1dcd6] text-danger",
    dark: "bg-charcoal text-ivory",
    accent: "bg-paper text-charcoal",
  };
  return <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-normal tracking-[0.16em] uppercase whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

export function Accordion({ items, defaultOpen = 0 }: { items: { title: string; content: ReactNode }[]; defaultOpen?: number }) {
  return (
    <div className="border-t border-line">
      {items.map((it, i) => (
        <details key={it.title} open={i === defaultOpen} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[11px] tracking-[0.22em] uppercase [&::-webkit-details-marker]:hidden">
            {it.title}
            <span className="text-lg font-extralight transition-transform duration-300 group-open:rotate-45">+</span>
          </summary>
          <div className="pb-6 text-[14px] text-charcoal/75">{it.content}</div>
        </details>
      ))}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[10.5px] tracking-[0.2em] uppercase text-charcoal/60">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, i) => (
          <li key={it.name} className="flex items-center gap-2">
            {it.href ? <Link href={it.href} className="hover:text-charcoal">{it.name}</Link> : <span aria-current="page" className="text-charcoal/80">{it.name}</span>}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
