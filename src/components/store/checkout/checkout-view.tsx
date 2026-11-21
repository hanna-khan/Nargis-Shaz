"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Radio } from "@/components/ui/form";
import { computeTotals, findTaxRule, shippingCost } from "@/lib/commerce/totals";
import { placeOrder, validateDiscount, type PlaceOrderResult } from "@/lib/payments/place-order";
import { useShop } from "../shop-context";
import { AddressFields } from "./address-fields";
import type { Address, Discount } from "@/types";

const empty = (countryCode: string): Address => ({ firstName: "", lastName: "", line1: "", line2: "", city: "", region: "", postalCode: "", countryCode, phone: "" });

export function CheckoutView() {
  const { cart, config, market, setMarket, format, currency, hydrated, clearCart } = useShop();
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<Address>(empty(market.defaultCountry));
  const [shipId, setShipId] = useState<string>("");
  const [payId, setPayId] = useState<string>("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [codeMsg, setCodeMsg] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Address | "email", string>>>({});
  const [result, setResult] = useState<PlaceOrderResult | null>(null);
  const [pending, start] = useTransition();

  // Country decides market → currency, shipping, tax and payment options.
  const onAddress = (a: Address) => {
    if (a.countryCode !== addr.countryCode) {
      const c = config.countries.find((x) => x.code === a.countryCode);
      if (c && c.marketId !== market.id) { setMarket(c.marketId); setShipId(""); setPayId(""); setDiscount(null); }
    }
    setAddress(a);
  };
  const countryInMarket = config.countries.find((c) => c.code === address.countryCode)?.marketId === market.id;
  // If the market changed elsewhere (header switcher), fall back to that market's default country.
  const addr: Address = countryInMarket ? address : { ...address, countryCode: market.defaultCountry };

  const methods = config.shipping.filter((s) => s.marketId === market.id);
  const payments = config.paymentMethods[market.id] ?? [];
  const ship = methods.find((m) => m.id === shipId) ?? methods[0];
  const pay = payments.find((p) => p.id === payId) ?? payments[0];
  const taxRule = findTaxRule(config.taxRules, addr.countryCode);

  const totals = computeTotals({ lines: cart.map((l) => ({ unitPrice: l.prices[currency], quantity: l.quantity })), currency, shippingMethod: ship, taxRule, discount: discount ?? undefined });

  const applyCode = () => start(async () => {
    const d = await validateDiscount(code, market.id);
    const min = d?.minimumSubtotal?.[currency];
    if (d && min && totals.subtotal < min) { setDiscount(null); setCodeMsg(`Spend ${format(min)} or more to use ${d.code}.`); return; }
    setDiscount(d);
    setCodeMsg(d ? `${d.code} applied — ${d.description.toLowerCase()}` : "This code isn't valid for your region.");
  });

  const submit = () => {
    const e: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
    (["firstName", "lastName", "line1", "city", "phone"] as const).forEach((k) => { if (!addr[k]?.trim()) e[k] = "Required"; });
    setErrors(e);
    if (Object.keys(e).length) { document.getElementById("checkout-form")?.scrollIntoView({ behavior: "smooth" }); return; }
    start(async () => {
      const r = await placeOrder({ email, marketId: market.id, address: addr, shippingMethodId: ship.id, paymentMethodId: pay.id, discountCode: discount?.code, lines: cart.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })) });
      setResult(r);
      if (r.ok) { clearCart(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    });
  };

  if (result?.ok) return <Confirmation result={result} />;
  if (hydrated && cart.length === 0) {
    return <section className="px-6 py-32 text-center"><h1 className="mb-4 font-serif text-[40px]">Your bag is empty</h1><ButtonLink href="/shop">Continue shopping</ButtonLink></section>;
  }

  return (
    <section className="grid items-start gap-[clamp(30px,5vw,80px)] px-[clamp(18px,3.2vw,48px)] pt-12 pb-28 lg:grid-cols-[1fr_440px]">
      <div id="checkout-form" className="max-w-[720px] scroll-mt-28">
        <h1 className="mb-10 font-serif text-[clamp(38px,4vw,56px)] font-light">Checkout</h1>

        <Step n={1} title="Contact">
          <Field label="Email" error={errors.email}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
          <Checkbox className="mt-4" label="Email me about new collections and private events" />
        </Step>

        <Step n={2} title="Delivery address">
          <AddressFields value={addr} onChange={onAddress} countries={config.countries} errors={errors} />
          <p className="mt-4 text-[12.5px] text-charcoal/55">Shipping to {market.name}. Prices are shown in {currency}.</p>
        </Step>

        <Step n={3} title="Delivery method">
          <div className="grid gap-2.5" role="radiogroup" aria-label="Delivery method">
            {methods.map((m) => (
              <Radio key={m.id} name="ship" checked={ship?.id === m.id} onChange={() => setShipId(m.id)}
                label={`${m.label} · ${m.estimatedDays[0]}–${m.estimatedDays[1]} working days`} description={m.description + (m.freeOver ? ` · free over ${format(m.freeOver)}` : "")}
                aside={shippingCost(m, totals.subtotal) === 0 ? "Free" : format(shippingCost(m, totals.subtotal))} />
            ))}
          </div>
        </Step>

        <Step n={4} title="Payment">
          <div className="grid gap-2.5" role="radiogroup" aria-label="Payment method">
            {payments.map((p) => <Radio key={p.id} name="pay" checked={pay?.id === p.id} onChange={() => setPayId(p.id)} label={p.label} description={p.description} />)}
          </div>
          <p className="mt-4 text-[12.5px] text-charcoal/55">
            {pay?.kind === "cod" ? "Our team will call to confirm your order before dispatch." : "You'll complete payment on our payment partner's secure page. Card details are never stored by Nargis & Shaz."}
          </p>
        </Step>

        {result && !result.ok && <p role="alert" className="mb-6 bg-[#f1dcd6] px-5 py-4 text-[14px] text-danger">{result.error}</p>}
        <Button onClick={submit} disabled={pending} full size="lg">{pending ? "Placing order…" : pay?.kind === "cod" ? `Place order · ${format(totals.total)}` : `Continue to payment · ${format(totals.total)}`}</Button>
        <p className="mt-4 text-center text-[12px] text-charcoal/55">By placing your order you agree to our terms of sale and privacy policy.</p>
      </div>

      <aside className="bg-paper p-8 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="mb-6 font-serif text-[26px]">Your order</h2>
        <ul className="mb-6 max-h-[340px] space-y-4 overflow-y-auto">
          {cart.map((l) => (
            <li key={l.variantId} className="grid grid-cols-[64px_1fr_auto] items-center gap-4">
              <div className="relative"><EditorialImage image={l.image} className="aspect-[4/5]" sizes="64px" /><span className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-mocha text-[10px] text-white">{l.quantity}</span></div>
              <div><p className="font-serif text-[17px] leading-tight">{l.name}</p><p className="text-[12px] text-charcoal/55">{l.colour} · {l.size}</p></div>
              <p className="text-[13.5px]">{format(l.prices[currency] * l.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="mb-6 flex gap-2">
          <label htmlFor="code" className="sr-only">Discount code</label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code" className="uppercase" />
          <Button variant="outline" size="sm" onClick={applyCode} disabled={!code || pending}>Apply</Button>
        </div>
        {codeMsg && <p className={`-mt-4 mb-5 text-[12.5px] ${discount ? "text-success" : "text-danger"}`}>{codeMsg}</p>}
        <dl className="space-y-2.5 border-t border-line pt-5 text-[14px]">
          <Row k="Subtotal" v={format(totals.subtotal)} />
          {totals.discount > 0 && <Row k="Discount" v={`− ${format(totals.discount)}`} />}
          <Row k="Delivery" v={totals.shipping === 0 ? "Complimentary" : format(totals.shipping)} />
          {totals.tax > 0 && <Row k={taxRule?.label ?? "Tax"} v={format(totals.tax)} />}
          <div className="flex justify-between border-t border-line pt-4 text-[17px]"><dt>Total</dt><dd>{format(totals.total)}</dd></div>
          {taxRule && totals.taxIncluded > 0 && <p className="text-[12px] text-charcoal/55">Includes {format(totals.taxIncluded)} {taxRule.label} ({Math.round(taxRule.rate * 100)}%)</p>}
          {taxRule?.dutiesCollectedOnDelivery && <p className="text-[12px] text-charcoal/55">Import duties and local taxes may be collected by the carrier on delivery.</p>}
        </dl>
        <p className="mt-6 text-[12px] text-charcoal/50">Final amounts are confirmed securely when your order is placed.</p>
      </aside>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-12 border-t border-line pt-7">
      <legend className="float-left mb-6 w-full font-serif text-[24px]"><span className="mr-3 text-[13px] font-sans text-charcoal/45">0{n}</span>{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><dt>{k}</dt><dd>{v}</dd></div>;

function Confirmation({ result }: { result: Extract<PlaceOrderResult, { ok: true }> }) {
  const { format } = useShop();
  const o = result.order;
  return (
    <section className="mx-auto max-w-[680px] px-6 py-28 text-center">
      <p className="eyebrow">{o.paymentKind === "cod" ? "Order received" : "One last step"}</p>
      <h1 className="mt-4 font-serif text-[clamp(40px,5vw,64px)] leading-tight font-light">Thank you</h1>
      <p className="mt-4 text-charcoal/70">
        Order <strong className="font-normal">{o.number}</strong> for {format(o.totals.total)}.{" "}
        {o.paymentKind === "cod"
          ? "We'll call you to confirm before dispatch. Please have the exact amount ready for the courier."
          : "Your order is reserved and will be confirmed as soon as our payment partner verifies your payment."}
      </p>
      <p className="mt-3 text-[13px] text-charcoal/55">A confirmation will be sent to {o.email}.</p>
      <div className="mt-10 flex justify-center gap-3"><ButtonLink href="/new-arrivals">Continue shopping</ButtonLink><Link href="/our-story" className="ulink self-center">Our story</Link></div>
    </section>
  );
}
