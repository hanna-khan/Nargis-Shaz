"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { placeOrderAction } from "@/app/(store)/actions";
import { shippingFor } from "@/server/commerce/pricing";
import { CouponForm } from "../cart-lines";
import { useShop } from "../shop-context";
import { AddressFields } from "./address-fields";
import type { Address } from "@/types";

export interface SavedAddress extends Address { id: string; label: string; isDefault: boolean }

const empty = (countryCode: string): Address => ({ firstName: "", lastName: "", line1: "", line2: "", city: "", region: "", postalCode: "", countryCode, phone: "" });
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

type Errors = Partial<Record<keyof Address | "email" | "shipping" | "payment", string>>;

/**
 * Checkout: contact → address → delivery → payment → review. Totals shown here are a preview;
 * the order is priced, validated and stock-checked again on the server when it is placed.
 */
export function CheckoutView({ email: initialEmail, addresses, guestAllowed }: { email: string | null; addresses: SavedAddress[]; guestAllowed: boolean }) {
  const { cart, cartView, config, market, setMarket, format, hydrated, customer } = useShop();
  const def = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [email, setEmail] = useState(initialEmail ?? "");
  const [savedId, setSavedId] = useState<string>(def?.id ?? "new");
  const [address, setAddress] = useState<Address>(def ? { ...def } : empty(market.defaultCountry));
  const [shipId, setShipId] = useState("");
  const [payId, setPayId] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [idempotencyKey] = useState(newKey);
  const [pending, start] = useTransition();

  const addr: Address = config.countries.find((c) => c.code === address.countryCode)?.marketId === market.id ? address : { ...address, countryCode: market.defaultCountry };
  const onAddress = async (a: Address) => {
    setAddress(a);
    setSavedId("new");
    const c = config.countries.find((x) => x.code === a.countryCode);
    if (c && c.marketId !== market.id) { setShipId(""); setPayId(""); await setMarket(c.marketId); }
  };
  const pickSaved = async (id: string) => {
    setSavedId(id);
    const a = addresses.find((x) => x.id === id);
    if (!a) { setAddress(empty(market.defaultCountry)); return; }
    setAddress({ ...a });
    const c = config.countries.find((x) => x.code === a.countryCode);
    if (c && c.marketId !== market.id) { setShipId(""); setPayId(""); await setMarket(c.marketId); }
  };

  const city = addr.city.trim().toLowerCase();
  const methods = config.shipping.filter((m) => m.countries.includes(addr.countryCode) && (!m.cities.length || (city && m.cities.some((x) => x.toLowerCase() === city))));
  const restricted = config.shipping.filter((m) => m.countries.includes(addr.countryCode) && m.cities.length && !methods.includes(m));
  const ship = methods.find((m) => m.id === shipId) ?? methods[0];
  const payments = (config.paymentMethods[market.id] ?? []).filter((p) => p.kind !== "cod" || ship?.codAvailable);
  const pay = payments.find((p) => p.id === payId) ?? payments[0];

  const t = cartView?.totals;
  const discounted = t ? t.subtotal - t.discount : 0;
  const shipping = ship ? shippingFor({ rate: ship.rate, freeOver: ship.freeOver }, discounted, cartView?.coupon?.freeShipping) : 0;
  const tax = config.taxRules.find((r) => r.countryCode === addr.countryCode) ?? config.taxRules.find((r) => r.countryCode === "*");
  const added = tax && !tax.inclusive ? Math.round(discounted * tax.rate) : 0;
  const included = tax && tax.inclusive && tax.rate ? Math.round(discounted - discounted / (1 + tax.rate)) : 0;
  const total = discounted + shipping + added;

  const submit = () => {
    const e: Errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
    (["firstName", "lastName", "line1", "city", "phone"] as const).forEach((k) => { if (!addr[k]?.trim()) e[k] = "Required"; });
    if (addr.countryCode === "PK" && !addr.region) e.region = "Choose a province";
    if (!ship) e.shipping = "We can't deliver to this address yet";
    if (!pay) e.payment = "No payment method is available for this destination yet";
    setErrors(e);
    setFormError("");
    if (Object.keys(e).length) { document.getElementById("checkout-form")?.scrollIntoView({ behavior: "smooth" }); return; }
    start(async () => {
      const r = await placeOrderAction({ email, address: { ...addr, line2: addr.line2 ?? "", region: addr.region ?? "", postalCode: addr.postalCode ?? "" }, shippingMethodId: ship!.id, paymentMethodId: pay!.id, note, marketingConsent: consent, idempotencyKey });
      if (r.ok) { window.location.assign(r.url); return; }
      const fe = r.fieldErrors ?? {};
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k.replace(/^address\./, ""), v])) as Errors);
      setFormError(r.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (hydrated && cart.length === 0) {
    return <section className="px-6 py-32 text-center"><h1 className="mb-4 font-serif text-[40px]">Your bag is empty</h1><ButtonLink href="/shop">Continue shopping</ButtonLink></section>;
  }
  if (!guestAllowed && !customer) {
    return <section className="px-6 py-32 text-center"><h1 className="mb-4 font-serif text-[40px]">Sign in to check out</h1><ButtonLink href="/account/login?next=/checkout">Sign in</ButtonLink></section>;
  }

  return (
    <section className="grid items-start gap-[clamp(30px,5vw,80px)] px-[clamp(18px,3.2vw,48px)] pt-12 pb-28 lg:grid-cols-[1fr_440px]">
      <div id="checkout-form" className="max-w-[720px] scroll-mt-28">
        <h1 className="mb-10 font-serif text-[clamp(38px,4vw,56px)] font-light">Checkout</h1>
        {formError && <p role="alert" className="mb-8 bg-[#f1dcd6] px-5 py-4 text-[14px] text-danger">{formError} {formError.includes("bag") && <Link href="/cart" className="underline">Review your bag</Link>}</p>}
        {cartView?.hasIssues && <p role="alert" className="mb-8 bg-[#f3e6cf] px-5 py-4 text-[14px]">Some items in your bag have changed availability. <Link href="/cart" className="underline">Review your bag</Link> before placing your order.</p>}

        <Step n={1} title="Contact">
          {customer ? (
            <p className="text-[14px]">Signed in as <strong className="font-normal">{customer.email}</strong>. Order updates will be sent here.</p>
          ) : (
            <>
              <Field label="Email" error={errors.email}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
              <p className="mt-3 text-[13px] text-taupe">Have an account? <Link href="/account/login?next=/checkout" className="ulink !text-[11px]">Sign in</Link> for faster checkout — or continue as a guest.</p>
            </>
          )}
          <Checkbox className="mt-4" label="Email me about new collections and private events" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        </Step>

        <Step n={2} title="Delivery address">
          {addresses.length > 0 && (
            <div className="mb-6 grid gap-2.5" role="radiogroup" aria-label="Saved addresses">
              {addresses.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-start gap-4 border border-line p-4 has-[:checked]:border-charcoal has-[:checked]:bg-ivory">
                  <input type="radio" name="saved" checked={savedId === a.id} onChange={() => pickSaved(a.id)} className="mt-1 h-4 w-4 accent-charcoal" />
                  <span className="text-[13.5px]"><span className="label">{a.label}</span><br />{a.firstName} {a.lastName}, {a.line1}, {a.city}, {config.countries.find((c) => c.code === a.countryCode)?.name}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-4 border border-line p-4 has-[:checked]:border-charcoal has-[:checked]:bg-ivory">
                <input type="radio" name="saved" checked={savedId === "new"} onChange={() => pickSaved("new")} className="h-4 w-4 accent-charcoal" />
                <span className="text-[13.5px]">Use a different address</span>
              </label>
            </div>
          )}
          {savedId === "new" && <AddressFields value={addr} onChange={onAddress} countries={config.countries} errors={errors} />}
          <p className="mt-4 text-[12.5px] text-charcoal/55">Shipping to {market.name}. Prices are shown in {market.currency}.</p>
        </Step>

        <Step n={3} title="Delivery method">
          {methods.length ? (
            <div className="grid gap-2.5" role="radiogroup" aria-label="Delivery method">
              {methods.map((m) => {
                const cost = shippingFor({ rate: m.rate, freeOver: m.freeOver }, discounted, cartView?.coupon?.freeShipping);
                return <RadioRow key={m.id} name="ship" checked={ship?.id === m.id} onChange={() => setShipId(m.id)} label={`${m.label} · ${m.estimatedDays[0]}–${m.estimatedDays[1]} working days`} description={m.description + (m.freeOver ? ` · free over ${format(m.freeOver)}` : "")} aside={cost === 0 ? "Free" : format(cost)} />;
              })}
            </div>
          ) : <p className="text-[14px] text-danger">{errors.shipping ?? "We don't deliver to this address yet. Please contact client care."}</p>}
          {restricted.length > 0 && <p className="mt-3 text-[12.5px] text-taupe">{restricted.map((m) => m.label).join(", ")} available in {restricted[0].cities.join(", ")} only.</p>}
        </Step>

        <Step n={4} title="Payment">
          {payments.length ? (
            <div className="grid gap-2.5" role="radiogroup" aria-label="Payment method">
              {payments.map((p) => <RadioRow key={p.id} name="pay" checked={pay?.id === p.id} onChange={() => setPayId(p.id)} label={p.label} description={p.description} />)}
            </div>
          ) : (
            <p className="text-[14px]" role="alert">Online payment for {market.name} isn&apos;t available yet. Please <Link href="/customer-care#contact" className="underline">contact client care</Link> and we&apos;ll arrange your order personally.</p>
          )}
          {pay && <p className="mt-4 text-[12.5px] text-charcoal/55">{pay.kind === "cod" ? "Pay the courier in cash on delivery. Our team may call to confirm your order before dispatch." : "You'll complete payment on our payment partner's secure page. Card details are never seen or stored by Nargis & Shaz. Your order is confirmed once the payment is verified."}</p>}
        </Step>

        <Step n={5} title="Review & place order">
          <Field label="Order note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} placeholder="Delivery instructions, gift message…" /></Field>
          {addr.line1 && ship && <p className="mt-5 text-[13.5px] text-charcoal/75">Delivering to {addr.firstName} {addr.lastName}, {addr.line1}, {addr.city} by {ship.label.toLowerCase()}{pay ? `, paying by ${pay.label.toLowerCase()}` : ""}.</p>}
        </Step>

        <Button onClick={submit} disabled={pending || !pay || !ship || !!cartView?.hasIssues || !hydrated} full size="lg">
          {pending ? "Placing order…" : pay?.kind === "cod" ? `Place order · ${format(total)}` : `Continue to secure payment · ${format(total)}`}
        </Button>
        <p className="mt-4 text-center text-[12px] text-charcoal/55">By placing your order you agree to our <Link href="/legal/terms" className="underline">terms of sale</Link> and <Link href="/legal/privacy" className="underline">privacy policy</Link>.</p>
      </div>

      <aside className="bg-paper p-8 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="mb-6 font-serif text-[26px]">Your order</h2>
        <ul className="mb-6 max-h-[340px] space-y-4 overflow-y-auto">
          {cart.map((l) => (
            <li key={l.variantId} className="grid grid-cols-[64px_1fr_auto] items-center gap-4">
              <div className="relative"><EditorialImage image={l.image} className="aspect-[3/4]" sizes="64px" /><span className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-mocha text-[10px] text-white">{l.quantity}</span></div>
              <div><p className="font-serif text-[17px] leading-tight">{l.name}</p><p className="text-[12px] text-charcoal/55">{l.colour} · {l.size}</p>{l.issue && <p className="text-[12px] text-danger">Check availability</p>}</div>
              <p className="text-[13.5px]">{format(l.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="mb-6"><CouponForm /></div>
        {t && (
          <dl className="space-y-2.5 border-t border-line pt-5 text-[14px]">
            <Row k="Subtotal" v={format(t.subtotal)} />
            {t.discount > 0 && <Row k={`Discount (${cartView?.coupon?.code})`} v={`− ${format(t.discount)}`} />}
            <Row k="Delivery" v={!ship ? "—" : shipping === 0 ? "Complimentary" : format(shipping)} />
            {added > 0 && <Row k={tax?.label ?? "Tax"} v={format(added)} />}
            <div className="flex justify-between border-t border-line pt-4 text-[17px]"><dt>Total</dt><dd>{format(total)}</dd></div>
            {included > 0 && <p className="text-[12px] text-charcoal/55">Includes {format(included)} {tax?.label} ({Math.round((tax?.rate ?? 0) * 100)}%)</p>}
            {tax?.dutiesCollectedOnDelivery && <p className="text-[12px] text-charcoal/55">Import duties and local taxes may be collected by the carrier on delivery.</p>}
          </dl>
        )}
        <p className="mt-6 text-[12px] text-charcoal/50">Prices, stock and discounts are confirmed securely when your order is placed.</p>
      </aside>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-12 border-t border-line pt-7">
      <legend className="float-left mb-6 w-full font-serif text-[24px]"><span className="mr-3 font-sans text-[13px] text-charcoal/45">0{n}</span>{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function RadioRow({ label, description, aside, ...p }: React.ComponentProps<"input"> & { label: string; description?: string; aside?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-4 border border-line p-4 transition-colors has-[:checked]:border-charcoal has-[:checked]:bg-ivory">
      <input type="radio" className="mt-1 h-4 w-4 accent-charcoal" {...p} />
      <span className="flex-1"><span className="block text-[14px]">{label}</span>{description && <span className="block text-[12.5px] text-charcoal/60">{description}</span>}</span>
      {aside && <span className="text-[13.5px]">{aside}</span>}
    </label>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><dt>{k}</dt><dd>{v}</dd></div>;
