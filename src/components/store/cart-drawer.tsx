"use client";

import { Drawer } from "@/components/ui/drawer";
import { ButtonLink } from "@/components/ui/button";
import { CartLines, FreeShippingMeter } from "./cart-lines";
import { useShop } from "./shop-context";

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, cartView, format, hydrated } = useShop();
  const close = () => setCartOpen(false);
  return (
    <Drawer
      open={cartOpen}
      onClose={close}
      title="Your bag"
      footer={
        cart.length > 0 && cartView && (
          <div className="border-t border-line px-7 pt-5 pb-7">
            <div className="mb-1 flex justify-between text-[12px] tracking-[0.16em] uppercase"><span>Subtotal</span><span>{format(cartView.totals.subtotal)}</span></div>
            {cartView.totals.discount > 0 && <div className="mb-1 flex justify-between text-[12px] text-success"><span>Discount ({cartView.coupon?.code})</span><span>− {format(cartView.totals.discount)}</span></div>}
            <div className="mt-3 grid gap-2.5" onClick={close}>
              <ButtonLink href={cartView.hasIssues ? "/cart" : "/checkout"} full>{cartView.hasIssues ? "Review your bag" : "Checkout"}</ButtonLink>
              <ButtonLink href="/cart" variant="outline" full>View bag</ButtonLink>
            </div>
            <p className="mt-3 text-center text-[12px] text-charcoal/55">Delivery and taxes are confirmed at checkout</p>
          </div>
        )
      }
    >
      <FreeShippingMeter />
      <div className="px-7">
        {!hydrated ? <div className="py-24" aria-busy="true" /> : cart.length ? (
          <CartLines onNavigate={close} />
        ) : (
          <div className="py-24 text-center">
            <p className="font-serif text-[30px]">Your bag is empty</p>
            <p className="mt-2 mb-8 text-charcoal/60">Begin with something you will wear for years.</p>
            <span onClick={close}><ButtonLink href="/new-arrivals">Shop new arrivals</ButtonLink></span>
          </div>
        )}
      </div>
    </Drawer>
  );
}
