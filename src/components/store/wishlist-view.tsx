"use client";

import Link from "next/link";
import { EditorialImage } from "@/components/media/editorial-image";
import { ButtonLink } from "@/components/ui/button";
import { Display, Eyebrow } from "@/components/ui/typography";
import { Price, useShop } from "./shop-context";
import { WishButton } from "./product/wish-button";

export function WishlistView() {
  const { wishlist, hydrated } = useShop();
  return (
    <section className="px-[clamp(18px,3.2vw,48px)] pt-16 pb-28">
      <div className="mb-12 text-center">
        <Eyebrow>Saved for later</Eyebrow>
        <Display as="h1" size="xl" text="Your *wishlist*" className="mt-3" />
      </div>
      {!hydrated ? (
        <div className="min-h-[40vh]" />
      ) : wishlist.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-8 text-charcoal/60">Tap the heart on any piece to keep it here.</p>
          <ButtonLink href="/new-arrivals">Discover new arrivals</ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-[clamp(12px,1.6vw,26px)] gap-y-12 md:grid-cols-3 xl:grid-cols-4">
          {wishlist.map((w) => (
            <li key={w.productId} className="relative">
              <Link href={`/products/${w.slug}`} className="zoom-on-hover block"><EditorialImage image={w.image} className="aspect-[4/5]" sizes="25vw" /></Link>
              <WishButton item={w} className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-paper/80" />
              <div className="mt-3.5 flex justify-between gap-3">
                <div><h2 className="font-serif text-[20px] leading-tight"><Link href={`/products/${w.slug}`}>{w.name}</Link></h2><p className="text-[12.5px] text-charcoal/55">{w.subtitle}</p></div>
                <Price prices={w.prices} className="text-[13.5px]" />
              </div>
              <Link href={`/products/${w.slug}`} className="ulink mt-4 inline-block">Choose size</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
