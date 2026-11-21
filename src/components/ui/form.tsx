import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("block", className)}>
      <label className="block">
        <span className="mb-2 block text-[10.5px] tracking-[0.2em] uppercase">{label}</span>
        {children}
      </label>
      {error ? <span className="mt-1.5 block text-[12px] text-danger" role="alert">{error}</span> : hint ? <span className="mt-1.5 block text-[12px] text-charcoal/55">{hint}</span> : null}
    </div>
  );
}

const control = "w-full border border-line bg-paper px-4 py-3 text-[14px] text-charcoal outline-none transition-colors placeholder:text-charcoal/40 focus:border-charcoal";

export const Input = ({ className, ...p }: ComponentProps<"input">) => <input className={cn(control, className)} {...p} />;
export const Textarea = ({ className, ...p }: ComponentProps<"textarea">) => <textarea className={cn(control, "min-h-28", className)} {...p} />;
export const Select = ({ className, children, ...p }: ComponentProps<"select">) => (
  <select className={cn(control, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 fill=%22none%22 stroke=%22%23292722%22/></svg>')] bg-[position:right_14px_center] bg-no-repeat pr-10", className)} {...p}>
    {children}
  </select>
);

export function Checkbox({ label, className, ...p }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-[13.5px]", className)}>
      <input type="checkbox" className="mt-1 h-4 w-4 accent-charcoal" {...p} />
      <span>{label}</span>
    </label>
  );
}

export function Radio({ label, description, aside, className, ...p }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode; aside?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-4 border border-line p-4 transition-colors has-[:checked]:border-charcoal has-[:checked]:bg-ivory", className)}>
      <input type="radio" className="mt-1 h-4 w-4 accent-charcoal" {...p} />
      <span className="flex-1">
        <span className="block text-[14px] font-normal">{label}</span>
        {description && <span className="block text-[12.5px] text-charcoal/60">{description}</span>}
      </span>
      {aside && <span className="text-[13.5px]">{aside}</span>}
    </label>
  );
}
