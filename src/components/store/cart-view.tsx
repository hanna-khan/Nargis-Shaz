"use client";

import { ButtonLink } from "@/components/ui/button";
import { Display } from "@/components/ui/typography";
import { CartLines, CouponForm, FreeShippingMeter, TotalsList } from "./cart-lines";
import { MarketSwitcher } from "./market-switcher";
import { useShop } from "./shop-context";

export function CartView() {
  const { cart, cartView, market, hydrated, config } = useShop();
  const hasCod = (config.paymentMethods[market.id] ?? []).some((p) => p.kind === "cod");
  return (
    <section className="px-[clamp(18px,3.2vw,48px)] pt-16 pb-28">
      <Display as="h1" size="xl" text="Your *bag*" className="mb-12" />
      {!hydrated ? <div className="min-h-[40vh]" aria-busy="true" /> : cart.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-8 text-charcoal/60">Your bag is empty.</p>
          <ButtonLink href="/new-arrivals">Shop new arrivals</ButtonLink>
        </div>
      ) : (
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_400px]">
          <div className="border-t border-line"><CartLines size="lg" /></div>
          <aside className="bg-paper p-8 lg:sticky lg:top-24" aria-label="Order summary">
            <h2 className="mb-6 font-serif text-[28px]">Summary</h2>
            <MarketSwitcher />
            <div className="mt-6"><CouponForm /></div>
            <div className="mt-6"><TotalsList /></div>
            <div className="-mx-8 my-6"><FreeShippingMeter /></div>
            {cartView?.hasIssues && <p role="alert" className="mb-4 text-[13px] text-danger">Some items need your attention before checkout.</p>}
            <ButtonLink href="/checkout" full aria-disabled={cartView?.hasIssues} className={cartView?.hasIssues ? "pointer-events-none opacity-40" : undefined}>Continue to checkout</ButtonLink>
            <p className="mt-4 text-center text-[12px] text-charcoal/55">{hasCod ? "Cash on delivery available · Secure online payment" : "Secure online payment"}</p>
          </aside>
        </div>
      )}
    </section>
  );
}
