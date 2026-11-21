"use client";

import { Drawer } from "@/components/ui/drawer";
import { ButtonLink } from "@/components/ui/button";
import { CartLines, FreeShippingMeter } from "./cart-lines";
import { useShop } from "./shop-context";

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, subtotal, format } = useShop();
  const close = () => setCartOpen(false);
  return (
    <Drawer
      open={cartOpen}
      onClose={close}
      title="Your bag"
      footer={
        cart.length > 0 && (
          <div className="border-t border-line px-7 pt-5 pb-7">
            <div className="mb-4 flex justify-between text-[12px] tracking-[0.16em] uppercase"><span>Subtotal</span><span>{format(subtotal)}</span></div>
            <div className="grid gap-2.5" onClick={close}>
              <ButtonLink href="/checkout" full>Checkout</ButtonLink>
              <ButtonLink href="/cart" variant="outline" full>View bag</ButtonLink>
            </div>
            <p className="mt-3 text-center text-[12px] text-charcoal/55">Delivery and taxes are confirmed at checkout</p>
          </div>
        )
      }
    >
      <FreeShippingMeter />
      <div className="px-7">
        {cart.length ? (
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
