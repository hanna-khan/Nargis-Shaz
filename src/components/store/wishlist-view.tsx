"use client";

import Link from "next/link";
import { useState } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { ButtonLink } from "@/components/ui/button";
import { Display, Eyebrow } from "@/components/ui/typography";
import { Price, useShop, type WishItem } from "./shop-context";
import { WishButton } from "./product/wish-button";

function MoveToBag({ item }: { item: WishItem }) {
  const { addToCart, toggleWish, setCartOpen, busy } = useShop();
  const sizes = item.sizes ?? [];
  const [variantId, setVariantId] = useState("");
  const [msg, setMsg] = useState("");
  if (!sizes.some((s) => s.stock > 0)) return <p className="mt-4 text-[12.5px] text-taupe">Sold out</p>;
  return (
    <form className="mt-4 flex gap-2" onSubmit={async (e) => {
      e.preventDefault();
      if (!variantId) { setMsg("Choose a size"); return; }
      const r = await addToCart(variantId);
      if (!r.ok) { setMsg(r.error); return; }
      toggleWish(item);
      setCartOpen(true);
    }}>
      <label className="sr-only" htmlFor={`size-${item.productId}`}>Size for {item.name}</label>
      <select id={`size-${item.productId}`} value={variantId} onChange={(e) => { setVariantId(e.target.value); setMsg(""); }} className="min-h-10 flex-1 border border-line bg-transparent px-2 text-[13px]">
        <option value="">Size</option>
        {sizes.map((s) => <option key={s.variantId} value={s.variantId} disabled={s.stock < 1}>{s.size}{s.stock < 1 ? " — sold out" : ""}</option>)}
      </select>
      <button type="submit" disabled={busy} className="min-h-10 bg-chocolate px-4 text-[10px] tracking-[0.2em] text-offwhite uppercase disabled:opacity-50">Move to bag</button>
      {msg && <p role="alert" className="sr-only">{msg}</p>}
      {msg && <span className="basis-full text-[12px] text-danger">{msg}</span>}
    </form>
  );
}

export function WishlistView() {
  const { wishlist, hydrated, customer } = useShop();
  return (
    <section className="px-[clamp(18px,3.2vw,48px)] pt-16 pb-28">
      <div className="mb-12 text-center">
        <Eyebrow>Saved for later</Eyebrow>
        <Display as="h1" size="xl" text="Your *wishlist*" className="mt-3" />
        {hydrated && !customer && wishlist.length > 0 && <p className="mt-4 text-[13px] text-taupe"><Link href="/account/login?next=/wishlist" className="ulink">Sign in</Link> to keep your wishlist on every device.</p>}
      </div>
      {!hydrated ? (
        <div className="min-h-[40vh]" aria-busy="true" />
      ) : wishlist.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-8 text-charcoal/60">Tap the heart on any piece to keep it here.</p>
          <ButtonLink href="/new-arrivals">Discover new arrivals</ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-[clamp(12px,1.6vw,26px)] gap-y-12 md:grid-cols-3 xl:grid-cols-4">
          {wishlist.map((w) => (
            <li key={w.productId} className="relative">
              <Link href={`/products/${w.slug}`} className="zoom-on-hover block"><EditorialImage image={w.image} className="aspect-[3/4]" sizes="25vw" /></Link>
              <WishButton item={w} className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-paper/80" />
              <div className="mt-3.5 flex justify-between gap-3">
                <div><h2 className="label text-[13px] leading-snug"><Link href={`/products/${w.slug}`}>{w.name}</Link></h2><p className="text-[12.5px] text-charcoal/55">{w.subtitle}</p></div>
                <Price prices={w.prices} className="text-[13.5px]" />
              </div>
              <MoveToBag item={w} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
