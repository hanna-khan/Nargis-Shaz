import { cn } from "@/lib/utils";

/**
 * Nargis & Shaz identity (Theme 4 · European Couture).
 * All marks use `currentColor`, so the light variant is simply the mark on a dark ground
 * (text-offwhite) and the dark variant the mark on a light ground (text-chocolate).
 */

/** NS monogram — interlaced Didone N and italic S inside a hairline ring. */
export function Monogram({ className, title = "Nargis & Shaz monogram" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} role="img" aria-label={title}>
      <circle cx="32" cy="32" r="30.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="32" cy="32" r="27.5" fill="none" stroke="currentColor" strokeWidth="0.35" opacity="0.6" />
      <text x="25.5" y="42" textAnchor="middle" fontFamily="var(--font-serif)" fontSize="27" fill="currentColor" style={{ fontVariationSettings: '"opsz" 28' }}>N</text>
      <text x="38.5" y="44.5" textAnchor="middle" fontFamily="var(--font-serif)" fontStyle="italic" fontSize="27" fill="currentColor" style={{ fontVariationSettings: '"opsz" 28' }}>S</text>
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
        Nargis<span className="mx-[0.28em] italic tracking-normal normal-case">&amp;</span>Shaz
      </span>
      {subtitle && <span className={cn("mt-[0.7em] pl-[0.58em] font-sans font-normal uppercase opacity-80", sub)}>Designer Label</span>}
    </span>
  );
}

/** Stacked lock-up: monogram above wordmark (footer, story page). */
export function Lockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-center gap-4", className)}>
      <Monogram className="h-14 w-14" />
      <Wordmark size="md" />
    </span>
  );
}
