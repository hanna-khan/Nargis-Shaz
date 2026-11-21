"use client";

import Link from "next/link";
import { EditorialImage } from "@/components/media/editorial-image";
import { useShop } from "./shop-context";

export function QuantityStepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center border border-line" role="group" aria-label={`Quantity for ${label}`}>
      <button className="h-8 w-8 text-base" onClick={() => onChange(value - 1)} aria-label="Decrease quantity">−</button>
      <span className="w-8 text-center text-[13px]" aria-live="polite">{value}</span>
      <button className="h-8 w-8 text-base disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= 10} aria-label="Increase quantity">+</button>
    </div>
  );
}

export function CartLines({ size = "sm", onNavigate }: { size?: "sm" | "lg"; onNavigate?: () => void }) {
  const { cart, updateQuantity, removeFromCart, format, currency } = useShop();
  return (
    <ul>
      {cart.map((l) => (
        <li key={l.variantId} className={size === "lg" ? "grid grid-cols-[120px_1fr_auto] gap-6 border-b border-line py-7" : "grid grid-cols-[92px_1fr] gap-5 border-b border-line py-5"}>
          <Link href={`/products/${l.slug}`} onClick={onNavigate}><EditorialImage image={l.image} className="aspect-[4/5]" sizes="120px" /></Link>
          <div>
            <Link href={`/products/${l.slug}`} onClick={onNavigate} className="font-serif text-[21px] leading-tight">{l.name}</Link>
            <p className="mt-1 text-[12.5px] text-charcoal/60">{l.colour} · {l.size}</p>
            {size === "sm" && <p className="mt-0.5 text-[13px]">{format(l.prices[currency] * l.quantity)}</p>}
            <div className="mt-3 flex items-center gap-4">
              <QuantityStepper value={l.quantity} onChange={(n) => updateQuantity(l.variantId, n)} label={l.name} />
              <button onClick={() => removeFromCart(l.variantId)} className="text-[10.5px] tracking-[0.18em] text-charcoal/60 uppercase underline underline-offset-4 hover:text-charcoal">Remove</button>
            </div>
          </div>
          {size === "lg" && <p className="text-[14px]">{format(l.prices[currency] * l.quantity)}</p>}
        </li>
      ))}
    </ul>
  );
}

export function FreeShippingMeter() {
  const { config, market, subtotal, format } = useShop();
  const threshold = config.shipping.filter((s) => s.marketId === market.id && s.freeOver !== null).map((s) => s.freeOver!).sort((a, b) => a - b)[0];
  if (!threshold) return null;
  const left = Math.max(0, threshold - subtotal);
  return (
    <div className="bg-ivory px-7 py-4 text-[12.5px] tracking-[0.04em]">
      {left > 0 ? <>You are <strong className="font-normal">{format(left)}</strong> away from complimentary delivery</> : <>Your order qualifies for complimentary delivery</>}
      <div className="relative mt-2.5 h-[2px] bg-line"><div className="absolute inset-y-0 left-0 bg-clay transition-[width] duration-700" style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} /></div>
    </div>
  );
}
