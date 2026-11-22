"use client";

import { useActionState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/lib/core";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

/**
 * Progressive-enhancement form bound to a Server Action: shows pending state, the server's
 * success message or error, and field-level errors (via the `errors` render prop).
 */
export function ActionForm({ action, children, submitLabel, pendingLabel = "Saving…", className, resetOnSuccess, submitClassName }: {
  action: Action;
  children: ReactNode | ((state: { fieldErrors: Record<string, string>; pending: boolean }) => ReactNode);
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  submitClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={formAction} className={cn("grid gap-5", className)} key={resetOnSuccess && state?.ok ? "done" : "form"} noValidate>
      {state && <p role={state.ok ? "status" : "alert"} className={cn("px-4 py-3 text-[13.5px]", state.ok ? "bg-[#e3eadc] text-success" : "bg-[#f1dcd6] text-danger")}>{state.ok ? state.message : state.error}</p>}
      {typeof children === "function" ? children({ fieldErrors, pending }) : children}
      <button type="submit" disabled={pending} className={cn("min-h-12 bg-chocolate px-8 text-[11px] tracking-[0.22em] text-offwhite uppercase transition-colors hover:bg-espresso disabled:opacity-50", submitClassName)}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

export function TextField({ label, name, type = "text", error, hint, defaultValue, autoComplete, required, ...rest }: { label: string; name: string; type?: string; error?: string; hint?: string; defaultValue?: string; autoComplete?: string; required?: boolean } & Omit<React.ComponentProps<"input">, "name">) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[10.5px] tracking-[0.2em] uppercase">{label}</label>
      <input id={id} name={name} type={type} defaultValue={defaultValue} autoComplete={autoComplete} required={required} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-d` : undefined}
        className={cn("w-full border bg-paper px-4 py-3 text-[14px] outline-none transition-colors focus:border-charcoal", error ? "border-danger" : "border-line")} {...rest} />
      {(error || hint) && <p id={`${id}-d`} className={cn("mt-1.5 text-[12px]", error ? "text-danger" : "text-charcoal/55")}>{error ?? hint}</p>}
    </div>
  );
}
