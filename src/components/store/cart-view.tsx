"use client";

import { ButtonLink } from "@/components/ui/button";
import { Display } from "@/components/ui/typography";
import { shippingCost } from "@/lib/commerce/totals";
import { CartLines, FreeShippingMeter } from "./cart-lines";
import { MarketSwitcher } from "./market-switcher";
import { useShop } from "./shop-context";

export function CartView() {
  const { cart, subtotal, format, config, market, hydrated } = useShop();
  const methods = config.shipping.filter((s) => s.marketId === market.id);
  const cheapest = methods.length ? Math.min(...methods.map((m) => shippingCost(m, subtotal))) : 0;
  return (
    <section className="px-[clamp(18px,3.2vw,48px)] pt-16 pb-28">
      <Display as="h1" size="xl" text="Your *bag*" className="mb-12" />
      {!hydrated ? <div className="min-h-[40vh]" /> : cart.length === 0 ? (
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
            <dl className="mt-6 space-y-3 text-[14px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{format(subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery from</dt><dd>{cheapest === 0 ? "Complimentary" : format(cheapest)}</dd></div>
              <div className="flex justify-between border-t border-line pt-4 text-[16px]"><dt>Estimated total</dt><dd>{format(subtotal + cheapest)}</dd></div>
            </dl>
            <div className="-mx-8 my-6"><FreeShippingMeter /></div>
            <ButtonLink href="/checkout" full>Continue to checkout</ButtonLink>
            <p className="mt-4 text-center text-[12px] text-charcoal/55">{market.id === "pk" ? "Cash on delivery and cards accepted" : "Secure online payment"}</p>
          </aside>
        </div>
      )}
    </section>
  );
}
