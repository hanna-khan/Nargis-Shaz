"use client";

import Link from "next/link";
import { useState } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { useShop, type CartLineView } from "./shop-context";

export function QuantityStepper({ value, onChange, label, max = 10, disabled }: { value: number; onChange: (n: number) => void; label: string; max?: number; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center border border-line" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className="h-8 w-8 text-base disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="Decrease quantity">−</button>
      <span className="w-8 text-center text-[13px]" aria-live="polite">{value}</span>
      <button type="button" className="h-8 w-8 text-base disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">+</button>
    </div>
  );
}

const ISSUE: Record<NonNullable<CartLineView["issue"]>, (l: CartLineView) => string> = {
  out_of_stock: () => "Sold out — please remove or choose another size",
  insufficient: (l) => `Only ${l.available} left — please reduce the quantity`,
  unavailable: () => "No longer available",
};

function Line({ l, size, onNavigate }: { l: CartLineView; size: "sm" | "lg"; onNavigate?: () => void }) {
  const { updateQuantity, removeFromCart, changeVariant, format, busy } = useShop();
  const [error, setError] = useState("");
  const sizes = l.options.filter((o) => o.colour === l.colour);
  const run = async (p: Promise<{ ok: boolean; error?: string }>) => { setError(""); const r = await p; if (!r.ok) setError(r.error ?? ""); };
  return (
    <li className={size === "lg" ? "grid grid-cols-[120px_1fr_auto] gap-6 border-b border-line py-7 max-sm:grid-cols-[92px_1fr]" : "grid grid-cols-[92px_1fr] gap-5 border-b border-line py-5"}>
      <Link href={`/products/${l.slug}`} onClick={onNavigate}><EditorialImage image={l.image} className="aspect-[3/4]" sizes="120px" /></Link>
      <div>
        <Link href={`/products/${l.slug}`} onClick={onNavigate} className="font-serif text-[21px] leading-tight">{l.name}</Link>
        <p className="mt-1 text-[12.5px] text-charcoal/60">{l.colour}</p>
        {sizes.length > 1 ? (
          <label className="mt-1 inline-flex items-center gap-2 text-[12.5px] text-charcoal/60">
            Size
            <select value={l.variantId} disabled={busy} onChange={(e) => run(changeVariant(l.variantId, e.target.value))} className="border-b border-line bg-transparent py-0.5 text-charcoal outline-none">
              {sizes.map((o) => <option key={o.variantId} value={o.variantId} disabled={o.available < 1 && o.variantId !== l.variantId}>{o.size}{o.available < 1 ? " — sold out" : ""}</option>)}
            </select>
          </label>
        ) : <p className="text-[12.5px] text-charcoal/60">Size {l.size}</p>}
        {size === "sm" && <p className="mt-0.5 text-[13px]">{l.compareAtPrice && <s className="mr-2 text-taupe">{format(l.compareAtPrice * l.quantity)}</s>}{format(l.lineTotal)}</p>}
        <div className="mt-3 flex items-center gap-4">
          <QuantityStepper value={l.quantity} max={Math.min(10, Math.max(l.quantity, l.available))} disabled={busy} onChange={(n) => run(updateQuantity(l.variantId, n))} label={l.name} />
          <button type="button" disabled={busy} onClick={() => run(removeFromCart(l.variantId))} className="text-[10.5px] tracking-[0.18em] text-charcoal/60 uppercase underline underline-offset-4 hover:text-charcoal">Remove</button>
        </div>
        {(l.issue || error) && <p role="alert" className="mt-2 text-[12.5px] text-danger">{error || ISSUE[l.issue!](l)}</p>}
      </div>
      {size === "lg" && <p className="text-[14px] max-sm:col-start-2">{l.compareAtPrice && <s className="mr-2 text-taupe">{format(l.compareAtPrice * l.quantity)}</s>}{format(l.lineTotal)}</p>}
    </li>
  );
}

export function CartLines({ size = "sm", onNavigate }: { size?: "sm" | "lg"; onNavigate?: () => void }) {
  const { cart } = useShop();
  return <ul>{cart.map((l) => <Line key={l.variantId} l={l} size={size} onNavigate={onNavigate} />)}</ul>;
}

export function FreeShippingMeter() {
  const { cartView, format } = useShop();
  const est = cartView?.shippingEstimate;
  if (!cartView || !est?.freeOver) return null;
  const sub = cartView.totals.subtotal - cartView.totals.discount;
  const left = Math.max(0, est.freeOver - sub);
  return (
    <div className="bg-ivory px-7 py-4 text-[12.5px] tracking-[0.04em]">
      {left > 0 ? <>You are <strong className="font-normal">{format(left)}</strong> away from complimentary delivery</> : <>Your order qualifies for complimentary delivery</>}
      <div className="relative mt-2.5 h-[2px] bg-line"><div className="absolute inset-y-0 left-0 bg-clay transition-[width] duration-700" style={{ width: `${Math.min(100, (sub / est.freeOver) * 100)}%` }} /></div>
    </div>
  );
}

export function CouponForm() {
  const { cartView, applyCoupon, busy } = useShop();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const applied = cartView?.coupon?.applied ? cartView.coupon : null;
  if (applied) {
    return (
      <div className="flex items-center justify-between border border-line px-3.5 py-2.5 text-[13px]">
        <span><span className="label mr-2">{applied.code}</span><span className="text-success">{applied.message}</span></span>
        <button type="button" className="ulink" disabled={busy} onClick={async () => { await applyCoupon(null); setMsg(null); }}>Remove</button>
      </div>
    );
  }
  return (
    <form className="grid gap-2" onSubmit={async (e) => { e.preventDefault(); if (!code.trim()) return; const r = await applyCoupon(code.trim()); setMsg(r.ok ? { ok: true, text: "Code applied" } : { ok: false, text: r.error }); }}>
      <div className="flex gap-2">
        <label htmlFor="coupon" className="sr-only">Discount code</label>
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code" autoComplete="off" className="min-h-11 flex-1 border border-line bg-transparent px-3.5 text-[13.5px] uppercase outline-none focus:border-chocolate" />
        <button type="submit" disabled={!code.trim() || busy} className="min-h-11 border border-chocolate px-5 text-[10.5px] tracking-[0.2em] uppercase disabled:opacity-40">Apply</button>
      </div>
      {(msg || cartView?.coupon) && <p role="status" className={`text-[12.5px] ${msg?.ok ? "text-success" : "text-danger"}`}>{msg?.text ?? cartView?.coupon?.message}</p>}
    </form>
  );
}

export function TotalsList({ showEstimate = true }: { showEstimate?: boolean }) {
  const { cartView, format } = useShop();
  if (!cartView) return null;
  const t = cartView.totals;
  return (
    <dl className="space-y-3 text-[14px]">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{format(t.subtotal)}</dd></div>
      {t.discount > 0 && <div className="flex justify-between text-success"><dt>Discount{cartView.coupon?.code ? ` (${cartView.coupon.code})` : ""}</dt><dd>− {format(t.discount)}</dd></div>}
      {showEstimate && <div className="flex justify-between"><dt>{cartView.shippingEstimate ? "Delivery from" : "Delivery"}</dt><dd>{!cartView.shippingEstimate ? "Calculated at checkout" : t.shipping === 0 ? "Complimentary" : format(t.shipping)}</dd></div>}
      {t.tax > 0 && <div className="flex justify-between"><dt>{cartView.taxLabel ?? "Tax"}</dt><dd>{format(t.tax)}</dd></div>}
      <div className="flex justify-between border-t border-line pt-4 text-[16px]"><dt>Estimated total</dt><dd>{format(t.total)}</dd></div>
      {t.taxIncluded > 0 && <p className="text-[12px] text-charcoal/55">Includes {format(t.taxIncluded)} {cartView.taxLabel}</p>}
    </dl>
  );
}
