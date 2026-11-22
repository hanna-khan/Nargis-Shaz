"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/lib/core";
import { btn } from "./ui";

export type StudioAction = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

const ErrCtx = createContext<Record<string, string>>({});

/**
 * Studio form bound to a Server Action. Shows the server's success/error message, keeps field-level
 * validation errors in context for <Field>, and optionally resets after success.
 */
export function AdminForm({ action, children, className, submit = "Save", resetOnSuccess, confirm: confirmText, id, footer = true, danger }: {
  action: StudioAction; children: ReactNode; className?: string; submit?: string; resetOnSuccess?: boolean; confirm?: string; id?: string; footer?: boolean; danger?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const [key, setKey] = useState(0);
  const prev = useRef(state);
  useEffect(() => {
    if (state !== prev.current && state?.ok && resetOnSuccess) setKey((k) => k + 1);
    prev.current = state;
  }, [state, resetOnSuccess]);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <ErrCtx.Provider value={errors}>
      <form key={key} id={id} action={formAction} noValidate className={cn("grid gap-4", className)}
        onSubmit={(e) => { if (confirmText && !window.confirm(confirmText)) e.preventDefault(); }}>
        {state && <p role={state.ok ? "status" : "alert"} className={cn("rounded-[3px] px-3.5 py-2.5 text-[13px]", state.ok ? "bg-[#e3eadc] text-success" : "bg-[#f1dcd6] text-danger")}>{state.ok ? state.message ?? "Saved" : state.error}</p>}
        {children}
        {footer && <div><Submit label={submit} danger={danger} /></div>}
      </form>
    </ErrCtx.Provider>
  );
}

export function Submit({ label, danger, className, name, value }: { label: string; danger?: boolean; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" name={name} value={value} disabled={pending} className={cn(danger ? btn.danger : btn.solid, className)}>{pending ? "Working…" : label}</button>;
}

const control = "w-full rounded-[3px] border bg-white px-3 py-2 text-[13.5px] outline-none focus:border-charcoal";

export function Field({ label, name, hint, className, ...p }: React.ComponentProps<"input"> & { label: string; name: string; hint?: ReactNode }) {
  const err = useContext(ErrCtx)[name];
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11.5px] text-charcoal/65">{label}</span>
      <input name={name} aria-invalid={!!err} className={cn(control, err ? "border-danger" : "border-line", p.type === "checkbox" && "w-auto")} {...p} />
      {(err || hint) && <span className={cn("mt-1 block text-[11.5px]", err ? "text-danger" : "text-charcoal/50")}>{err ?? hint}</span>}
    </label>
  );
}

export function SelectField({ label, name, children, hint, className, ...p }: React.ComponentProps<"select"> & { label: string; name: string; hint?: ReactNode }) {
  const err = useContext(ErrCtx)[name];
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11.5px] text-charcoal/65">{label}</span>
      <select name={name} aria-invalid={!!err} className={cn(control, err ? "border-danger" : "border-line")} {...p}>{children}</select>
      {(err || hint) && <span className={cn("mt-1 block text-[11.5px]", err ? "text-danger" : "text-charcoal/50")}>{err ?? hint}</span>}
    </label>
  );
}

export function TextareaField({ label, name, hint, className, ...p }: React.ComponentProps<"textarea"> & { label: string; name: string; hint?: ReactNode }) {
  const err = useContext(ErrCtx)[name];
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11.5px] text-charcoal/65">{label}</span>
      <textarea name={name} aria-invalid={!!err} className={cn(control, "min-h-24", err ? "border-danger" : "border-line")} {...p} />
      {(err || hint) && <span className={cn("mt-1 block text-[11.5px]", err ? "text-danger" : "text-charcoal/50")}>{err ?? hint}</span>}
    </label>
  );
}

export function Check({ label, name, defaultChecked, value = "on", hint }: { label: ReactNode; name: string; defaultChecked?: boolean; value?: string; hint?: ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 text-[13.5px]">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-charcoal" />
      <span>{label}{hint && <span className="block text-[11.5px] text-charcoal/50">{hint}</span>}</span>
    </label>
  );
}

/**
 * One-click action button (with optional confirmation) for row actions such as publish, delete,
 * retry. Shows the result inline.
 */
export function ActionButton({ action, fields, label, confirm: confirmText, variant = "outline", className, bulkForm }: {
  action: StudioAction; fields: Record<string, string>; label: string; confirm?: string; variant?: keyof typeof btn; className?: string;
  /** Collect checked `ids` checkboxes that belong to this form id (bulk actions). */
  bulkForm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2" onSubmit={(e) => {
      if (confirmText && !window.confirm(confirmText)) { e.preventDefault(); return; }
      if (bulkForm) {
        const el = e.currentTarget;
        el.querySelectorAll("input[data-bulk]").forEach((n) => n.remove());
        document.querySelectorAll<HTMLInputElement>(`input[form="${bulkForm}"][name="ids"]:checked`).forEach((c) => {
          const h = document.createElement("input");
          h.type = "hidden"; h.name = "ids"; h.value = c.value; h.dataset.bulk = "1";
          el.appendChild(h);
        });
      }
    }}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" disabled={pending} className={cn(btn[variant], className)}>{pending ? "…" : label}</button>
      {state && !state.ok && <span role="alert" className="text-[12px] text-danger">{state.error}</span>}
      {state?.ok && state.message && <span role="status" className="text-[12px] text-success">{state.message}</span>}
    </form>
  );
}

/** Disclosure panel for secondary forms (add shipment, refund…). */
export function Disclosure({ label, children, defaultOpen, variant = "outline" }: { label: string; children: ReactNode; defaultOpen?: boolean; variant?: keyof typeof btn }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={btn[variant]}>{label}{open ? " ▴" : " ▾"}</button>
      {open && <div className="mt-3 rounded-[3px] border border-line bg-white p-4">{children}</div>}
    </div>
  );
}

/** Select-all checkbox for bulk-action tables. */
export function SelectAll({ form }: { form: string }) {
  return <input type="checkbox" aria-label="Select all rows" className="h-4 w-4 accent-charcoal" onChange={(e) => document.querySelectorAll<HTMLInputElement>(`input[form="${form}"][name="ids"]`).forEach((c) => (c.checked = e.target.checked))} />;
}

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className={cn(btn.solid, "print:hidden")}>Print / save as PDF</button>;
}
