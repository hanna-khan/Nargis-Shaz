import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "light" | "ghost-light" | "link";
type Size = "md" | "sm" | "lg";

const base = "inline-flex items-center justify-center gap-3 uppercase font-normal tracking-[0.22em] transition-colors duration-500 ease-[var(--ease-editorial)] disabled:opacity-40 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  solid: "bg-charcoal text-ivory border border-charcoal hover:bg-transparent hover:text-charcoal",
  outline: "border border-charcoal text-charcoal hover:bg-charcoal hover:text-ivory",
  light: "border border-ivory text-ivory hover:bg-ivory hover:text-charcoal",
  "ghost-light": "text-ivory underline underline-offset-[6px] hover:opacity-70",
  link: "ulink !px-0 !py-0",
};
const sizes: Record<Size, string> = { sm: "text-[10px] px-5 py-3", md: "text-[11px] px-8 py-4", lg: "text-[11px] px-10 py-5" };

export function buttonClass(variant: Variant = "solid", size: Size = "md", full?: boolean) {
  return cn(base, variants[variant], sizes[size], full && "w-full");
}

export function Button({ variant, size, full, className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size; full?: boolean }) {
  return <button className={cn(buttonClass(variant, size, full), className)} {...rest} />;
}

export function ButtonLink({ href, variant, size, full, className, children }: { href: string; variant?: Variant; size?: Size; full?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn(buttonClass(variant, size, full), className)}>
      {children}
    </Link>
  );
}
