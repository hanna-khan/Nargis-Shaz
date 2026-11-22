"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import {
  changePasswordAction, contactAction, deleteAddressAction, forgotPasswordAction, loginAction, notificationPrefsAction, registerAction,
  requestDeletionAction, resendVerificationAction, resetPasswordAction, saveAddressAction, trackOrderAction, updateProfileAction,
} from "@/app/(store)/actions";
import { AddressFields } from "../checkout/address-fields";
import { OrderDetail } from "./order-detail";
import { ActionForm, TextField } from "./action-form";
import type { Address, Country } from "@/types";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  return (
    <>
      {notice && <p role="status" className="mb-5 bg-[#e3eadc] px-4 py-3 text-[13.5px] text-success">{notice}</p>}
      <ActionForm action={loginAction} submitLabel="Sign in" pendingLabel="Signing in…">
        <input type="hidden" name="next" value={next} />
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
        <Link href="/account/forgot-password" className="ulink -mt-2 justify-self-start">Forgotten your password?</Link>
      </ActionForm>
      <p className="mt-8 text-center text-[14px] text-taupe">New to Nargis &amp; Shaz? <Link href={`/account/register${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline underline-offset-4">Create an account</Link></p>
    </>
  );
}

export function RegisterForm({ next }: { next: string }) {
  return (
    <>
      <ActionForm action={registerAction} submitLabel="Create account" pendingLabel="Creating account…">
        {({ fieldErrors }) => (
          <>
            <input type="hidden" name="next" value={next} />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="First name" name="firstName" autoComplete="given-name" error={fieldErrors.firstName} required />
              <TextField label="Last name" name="lastName" autoComplete="family-name" error={fieldErrors.lastName} required />
            </div>
            <TextField label="Email" name="email" type="email" autoComplete="email" error={fieldErrors.email} required />
            <TextField label="Password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters, with letters and numbers or symbols." error={fieldErrors.password} required minLength={10} />
            <label className="flex items-start gap-3 text-[13.5px]"><input type="checkbox" name="marketingConsent" className="mt-1 h-4 w-4 accent-charcoal" /> Send me news about new collections and private events.</label>
            <p className="text-[12px] text-taupe">By creating an account you agree to our <Link href="/legal/terms" className="underline">terms</Link> and <Link href="/legal/privacy" className="underline">privacy policy</Link>.</p>
          </>
        )}
      </ActionForm>
      <p className="mt-8 text-center text-[14px] text-taupe">Already have an account? <Link href="/account/login" className="underline underline-offset-4">Sign in</Link></p>
    </>
  );
}

export function ForgotForm() {
  return (
    <ActionForm action={forgotPasswordAction} submitLabel="Send reset link" pendingLabel="Sending…" resetOnSuccess>
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
    </ActionForm>
  );
}

export function ResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPasswordAction} submitLabel="Set new password">
      <input type="hidden" name="token" value={token} />
      <TextField label="New password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters, with letters and numbers or symbols." required minLength={10} />
      <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
    </ActionForm>
  );
}

export function ResendVerification() {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <span>
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await resendVerificationAction(); setMsg(r.ok ? r.message ?? "" : r.error); })} className="ulink">{pending ? "Sending…" : "Resend confirmation email"}</button>
      {msg && <span role="status" className="ml-3 text-[13px]">{msg}</span>}
    </span>
  );
}

export function ProfileForm({ firstName, lastName, phone, email }: { firstName: string; lastName: string; phone: string; email: string }) {
  return (
    <ActionForm action={updateProfileAction} submitLabel="Save details" className="max-w-[560px]">
      {({ fieldErrors }) => (
        <>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="First name" name="firstName" defaultValue={firstName} autoComplete="given-name" error={fieldErrors.firstName} />
            <TextField label="Last name" name="lastName" defaultValue={lastName} autoComplete="family-name" error={fieldErrors.lastName} />
          </div>
          <TextField label="Phone" name="phone" defaultValue={phone} autoComplete="tel" inputMode="tel" error={fieldErrors.phone} />
          <TextField label="Email" name="email-readonly" defaultValue={email} readOnly hint="To change your email address, please contact client care." />
        </>
      )}
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} submitLabel="Change password" className="max-w-[460px]" resetOnSuccess>
      <TextField label="Current password" name="current" type="password" autoComplete="current-password" />
      <TextField label="New password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters, with letters and numbers or symbols." minLength={10} />
      <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" />
    </ActionForm>
  );
}

export function AddressBook({ addresses, countries, defaultCountry }: { addresses: (Address & { id: string; label: string; isDefault: boolean })[]; countries: Country[]; defaultCountry: string }) {
  const [editing, setEditing] = useState<string | null>(addresses.length ? null : "new");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="grid gap-8">
      {msg && <p role="status" className="text-[13.5px] text-success">{msg}</p>}
      {addresses.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="border border-line p-5 text-[14px]">
              <p className="label mb-2">{a.label}{a.isDefault && <span className="ml-2 text-[10px] tracking-[0.2em] text-bronze">Default</span>}</p>
              <p>{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}{a.region ? `, ${a.region}` : ""} {a.postalCode}<br />{countries.find((c) => c.code === a.countryCode)?.name}<br />{a.phone}</p>
              <div className="mt-4 flex gap-5">
                <button className="ulink" onClick={() => setEditing(a.id)}>Edit</button>
                <button className="ulink" disabled={pending} onClick={() => { if (confirm(`Remove the address “${a.label}”?`)) start(async () => { const r = await deleteAddressAction(a.id); setMsg(r.ok ? r.message ?? "" : r.error); }); }}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? <AddressEditor key={editing} address={addresses.find((a) => a.id === editing)} countries={countries} defaultCountry={defaultCountry} onDone={() => setEditing(null)} />
        : <button className="justify-self-start border border-chocolate px-6 py-3 text-[11px] tracking-[0.22em] uppercase" onClick={() => setEditing("new")}>Add an address</button>}
    </div>
  );
}

function AddressEditor({ address, countries, defaultCountry, onDone }: { address?: Address & { id: string; label: string; isDefault: boolean }; countries: Country[]; defaultCountry: string; onDone: () => void }) {
  const [value, setValue] = useState<Address>(address ?? { firstName: "", lastName: "", line1: "", line2: "", city: "", region: "", postalCode: "", countryCode: defaultCountry, phone: "" });
  const [state, formAction, pending] = useActionState(async (p: unknown, f: FormData) => { const r = await saveAddressAction(null, f); if (r.ok) onDone(); return r; }, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={formAction} className="grid max-w-[680px] gap-5 border border-line p-6" noValidate>
      <h2 className="font-serif text-[24px]">{address ? "Edit address" : "New address"}</h2>
      {state && !state.ok && <p role="alert" className="bg-[#f1dcd6] px-4 py-3 text-[13.5px] text-danger">{state.error}</p>}
      <input type="hidden" name="id" value={address?.id ?? ""} />
      {(Object.keys(value) as (keyof Address)[]).map((k) => <input key={k} type="hidden" name={k} value={value[k] ?? ""} />)}
      <TextField label="Label" name="label" defaultValue={address?.label ?? "Home"} maxLength={40} />
      <AddressFields value={value} onChange={setValue} countries={countries} errors={errors} />
      <label className="flex items-center gap-3 text-[13.5px]"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="h-4 w-4 accent-charcoal" /> Use as my default address</label>
      <div className="flex gap-4">
        <button type="submit" disabled={pending} className="min-h-12 bg-chocolate px-8 text-[11px] tracking-[0.22em] text-offwhite uppercase disabled:opacity-50">{pending ? "Saving…" : "Save address"}</button>
        <button type="button" onClick={onDone} className="ulink">Cancel</button>
      </div>
    </form>
  );
}

export function PrefsForm({ newsletter, backInStock }: { newsletter: boolean; backInStock: boolean }) {
  return (
    <ActionForm action={notificationPrefsAction} submitLabel="Save preferences" className="max-w-[560px]">
      <label className="flex items-start gap-3 text-[14px]"><input type="checkbox" checked disabled className="mt-1 h-4 w-4 accent-charcoal" /> <span>Order updates by email<span className="block text-[12.5px] text-taupe">Confirmation, dispatch and delivery emails are always sent.</span></span></label>
      <label className="flex items-start gap-3 text-[14px]"><input type="checkbox" name="newsletter" defaultChecked={newsletter} className="mt-1 h-4 w-4 accent-charcoal" /> <span>The Nargis &amp; Shaz letter<span className="block text-[12.5px] text-taupe">New collections and private events, no more than twice a month.</span></span></label>
      <label className="flex items-start gap-3 text-[14px]"><input type="checkbox" name="backInStock" defaultChecked={backInStock} className="mt-1 h-4 w-4 accent-charcoal" /> <span>Wishlist reminders<span className="block text-[12.5px] text-taupe">Occasional notes about pieces saved in your wishlist.</span></span></label>
    </ActionForm>
  );
}

export function DeleteForm() {
  return (
    <ActionForm action={requestDeletionAction} submitLabel="Request account deletion" className="max-w-[560px]" submitClassName="bg-danger hover:bg-danger/85">
      <label className="block"><span className="mb-2 block text-[10.5px] tracking-[0.2em] uppercase">Reason (optional)</span><textarea name="reason" maxLength={500} className="min-h-24 w-full border border-line bg-paper px-4 py-3 text-[14px]" /></label>
      <TextField label="Type DELETE to confirm" name="confirm" autoComplete="off" />
    </ActionForm>
  );
}

export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  return (
    <ActionForm action={contactAction} submitLabel="Send message" pendingLabel="Sending…" resetOnSuccess className="max-w-[640px]">
      {({ fieldErrors }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" name="name" autoComplete="name" error={fieldErrors.name} />
            <TextField label="Email" name="email" type="email" autoComplete="email" error={fieldErrors.email} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Order number (optional)" name="orderNumber" error={fieldErrors.orderNumber} />
            <TextField label="Subject" name="subject" error={fieldErrors.subject} />
          </div>
          <label className="block"><span className="mb-2 block text-[10.5px] tracking-[0.2em] uppercase">Message</span><textarea name="message" maxLength={5000} aria-invalid={!!fieldErrors.message} className="min-h-36 w-full border border-line bg-paper px-4 py-3 text-[14px]" />{fieldErrors.message && <span className="mt-1.5 block text-[12px] text-danger">{fieldErrors.message}</span>}</label>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          {turnstileSiteKey && <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />}
        </>
      )}
    </ActionForm>
  );
}

export function TrackForm() {
  const [state, formAction, pending] = useActionState(trackOrderAction, null);
  return (
    <>
      <form action={formAction} className="grid max-w-[560px] gap-5" noValidate>
        {state && !state.ok && <p role="alert" className="bg-[#f1dcd6] px-4 py-3 text-[13.5px] text-danger">{state.error}</p>}
        <TextField label="Order number" name="number" placeholder="NS-10001" autoComplete="off" />
        <TextField label="Email used at checkout" name="email" type="email" autoComplete="email" />
        <button type="submit" disabled={pending} className="min-h-12 bg-chocolate px-8 text-[11px] tracking-[0.22em] text-offwhite uppercase disabled:opacity-50">{pending ? "Looking up…" : "Track order"}</button>
      </form>
      {state?.ok && state.data && <div className="mt-14"><OrderDetail order={state.data} /></div>}
    </>
  );
}
