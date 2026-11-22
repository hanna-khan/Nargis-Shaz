import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Nargis & Shaz identity (Theme 4 · European Couture).
 * All marks use `currentColor`, so the light variant is simply the mark on a dark ground
 * (text-offwhite) and the dark variant the mark on a light ground (text-chocolate).
 */

/**
 * NS monogram: a large Didone N with a bolder S laid across its right stem. The S "cuts" the N with a
 * transparent halo (SVG mask), so the interlock works on any background colour.
 */
export function Monogram({ className, title = "Nargis & Shaz monogram" }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const font = { fontFamily: "var(--font-serif)", fontVariationSettings: '"opsz" 11' } as const;
  return (
    <svg viewBox="0 0 80 68" className={cn("h-12 w-auto", className)} role="img" aria-label={title}>
      <defs>
        <mask id={`ns-cut-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="80" height="68">
          <rect width="80" height="68" fill="#fff" />
          <text x="50" y="59" textAnchor="middle" fontSize="66" fontWeight="700" style={font} fill="#000" stroke="#000" strokeWidth="3" strokeLinejoin="round">S</text>
        </mask>
      </defs>
      <text x="26" y="57" textAnchor="middle" fontSize="74" fontWeight="600" style={font} fill="currentColor" mask={`url(#ns-cut-${id})`}>N</text>
      <text x="50" y="59" textAnchor="middle" fontSize="66" fontWeight="700" style={font} fill="currentColor">S</text>
    </svg>
  );
}

/** NARGIS & SHAZ wordmark with optional DESIGNER LABEL subtitle. */
export function Wordmark({ className, subtitle = true, size = "md" }: { className?: string; subtitle?: boolean; size?: "sm" | "md" | "lg" }) {
  const main = { sm: "text-[17px] tracking-[0.24em]", md: "text-[22px] tracking-[0.28em]", lg: "text-[34px] tracking-[0.3em]" }[size];
  const sub = { sm: "text-[7.5px] tracking-[0.52em]", md: "text-[8.5px] tracking-[0.58em]", lg: "text-[10px] tracking-[0.62em]" }[size];
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", className)}>
      <span className={cn("font-serif whitespace-nowrap uppercase", main)} style={{ fontVariationSettings: '"opsz" 30' }}>
        Nargis<span className="mx-[0.3em]">&amp;</span>Shaz
      </span>
      {subtitle && <span className={cn("mt-[0.7em] pl-[0.58em] font-sans font-normal uppercase opacity-80", sub)}>Designer Label</span>}
    </span>
  );
}

/** Stacked lock-up: monogram above wordmark (footer, story page). */
export function Lockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-center gap-4", className)}>
      <Monogram className="h-16" />
      <Wordmark size="md" />
    </span>
  );
}
