"use client";

import Image from "next/image";
import Link from "next/link";
import { Price, useShop } from "../shop-context";

/** Recently viewed pieces (stored in this browser). Hidden until there is something to show. */
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { recentlyViewed, hydrated } = useShop();
  const items = recentlyViewed.filter((r) => r.productId !== excludeId).slice(0, 6);
  if (!hydrated || !items.length) return null;
  return (
    <section className="gutter pb-[clamp(64px,8vw,120px)]" aria-labelledby="recent-title">
      <h2 id="recent-title" className="display mb-8 text-[clamp(26px,2.6vw,38px)]">Recently <em>viewed</em></h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((r) => (
          <li key={r.productId}>
            <Link href={`/products/${r.slug}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-stone/50">
                {r.image.src && <Image src={r.image.src} alt={r.image.alt} fill sizes="(max-width:640px) 33vw, 16vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}
              </div>
              <p className="label mt-2 truncate text-[11.5px]">{r.name}</p>
              <Price prices={r.prices} className="text-[12px] text-taupe" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
