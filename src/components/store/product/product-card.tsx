"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BagIcon } from "../icons";
import { Price, useShop } from "../shop-context";
import { WishButton } from "./wish-button";
import type { CardProduct } from "./card-data";

const ease = [0.22, 0.8, 0.24, 1] as const;

/**
 * Product card.
 * Desktop: hover cross-fades to an alternate frame of the same garment; arrows step through
 * the shoot; a size bar adds straight to the bag.
 * Touch: images swipe with dots; the bag icon opens a size sheet.
 */
export function ProductCard({ product: p, priority, sizes = "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 30vw" }: { product: CardProduct; priority?: boolean; sizes?: string }) {
  const { addToCart, setCartOpen } = useShop();
  const [idx, setIdx] = useState(0);
  const [hover, setHover] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [cardError, setCardError] = useState("");
  const track = useRef<HTMLDivElement>(null);
  const soldOut = p.sizes.every((s) => s.stock === 0);
  const onSale = !!p.compareAt;
  const n = p.images.length;
  // On hover the second frame shows; arrows override that.
  const shown = idx !== 0 ? idx : hover && n > 1 ? 1 : 0;

  const quickAdd = async (s: CardProduct["sizes"][number]) => {
    if (s.stock < 1) return;
    setCardError("");
    const r = await addToCart(s.variantId);
    if (!r.ok) { setCardError(r.error); return; }
    setAdded(s.size);
    setTimeout(() => { setAdded(null); setSheet(false); }, 1400);
  };

  return (
    <article className="group/card relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setIdx(0); }}>
      <div className="relative aspect-[3/4] overflow-hidden bg-stone/50">
        {/* Desktop: stacked frames with cross-fade */}
        <Link href={`/products/${p.slug}`} className="absolute inset-0 hidden md:block" aria-label={`${p.name} — ${p.subtitle}`}>
          {p.images.map((img, i) => (
            <Image key={img.id} src={img.src!} alt={i === 0 ? img.alt : ""} fill sizes={sizes} loading={priority && i === 0 ? "eager" : "lazy"} fetchPriority={priority && i === 0 ? "high" : undefined}
              className={cn("object-cover transition-[opacity,transform] duration-[900ms] ease-[var(--ease-editorial)]", i === shown ? "opacity-100" : "opacity-0", i === shown && hover && "scale-[1.025]")} />
          ))}
        </Link>
        {/* Touch: native horizontal swipe */}
        <div ref={track} className="no-scrollbar absolute inset-0 flex snap-x snap-mandatory overflow-x-auto md:hidden"
          onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / el.clientWidth)); }}>
          {p.images.map((img, i) => (
            <Link key={img.id} href={`/products/${p.slug}`} className="relative h-full w-full shrink-0 snap-center" aria-label={i === 0 ? `${p.name} — ${p.subtitle}` : undefined} tabIndex={i === 0 ? 0 : -1}>
              <Image src={img.src!} alt={i === 0 ? img.alt : ""} fill sizes="50vw" loading={priority && i === 0 ? "eager" : "lazy"} className="object-cover" />
            </Link>
          ))}
        </div>

        {(p.isNew || onSale || soldOut) && (
          <span className="pointer-events-none absolute top-3 left-3 bg-offwhite/92 px-2 py-1 text-[9px] tracking-[0.24em] uppercase">{soldOut ? "Sold out" : onSale ? "Reduced" : "New"}</span>
        )}
        <WishButton item={{ productId: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, image: p.images[0], prices: p.prices }}
          className="absolute top-2.5 right-2.5 grid h-9 w-9 place-items-center rounded-full bg-offwhite/75 backdrop-blur-sm transition-opacity md:opacity-0 md:group-hover/card:opacity-100 md:focus-visible:opacity-100 md:aria-pressed:opacity-100" />

        {n > 1 && (
          <>
            {/* Desktop arrows */}
            {[-1, 1].map((d) => (
              <button key={d} type="button" aria-label={d < 0 ? "Previous image" : "Next image"} onClick={() => setIdx((i) => (i + d + n) % n)}
                className={cn("absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center text-chocolate/80 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100 md:grid", d < 0 ? "left-1" : "right-1")}>
                <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden><path d={d < 0 ? "M8 1L2 8l6 7" : "M2 1l6 7-6 7"} fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
              </button>
            ))}
            {/* Mobile dots */}
            <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5 md:hidden" aria-hidden>
              {p.images.map((img, i) => <span key={img.id} className={cn("h-[5px] w-[5px] rounded-full transition-colors", i === idx ? "bg-offwhite" : "bg-offwhite/45")} />)}
            </div>
          </>
        )}

        {/* Desktop quick add */}
        {!soldOut && (
          <div className="absolute inset-x-0 bottom-0 hidden translate-y-full bg-offwhite/95 px-3 pt-2.5 pb-3 backdrop-blur-sm transition-transform duration-500 ease-[var(--ease-editorial)] group-hover/card:translate-y-0 group-focus-within/card:translate-y-0 md:block">
            <p className={cn("mb-1.5 text-center text-[9.5px] tracking-[0.24em] uppercase", cardError && "tracking-[0.06em] normal-case text-danger")} aria-live="polite">{cardError || (added ? `Added — size ${added}` : "Add to bag")}</p>
            <div className="flex flex-wrap justify-center gap-x-1 gap-y-0.5" role="group" aria-label={`Quick add ${p.name} — choose a size`}>
              {p.sizes.map((s) => (
                <button key={s.size} type="button" disabled={s.stock < 1} onClick={() => quickAdd(s)} aria-label={`Add size ${s.size}${s.stock < 1 ? " (sold out)" : ""}`}
                  className={cn("min-w-9 px-1.5 py-1 text-[12px] transition-colors hover:text-bronze disabled:cursor-not-allowed disabled:text-taupe/45 disabled:line-through", added === s.size && "text-bronze")}>
                  {s.size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 pt-3">
        <div className="min-w-0">
          <h3 className="label truncate text-[13px] leading-snug"><Link href={`/products/${p.slug}`} className="hover:text-bronze">{p.name}</Link></h3>
          <Price prices={p.prices} compareAt={p.compareAt} className="mt-0.5 block text-[13px]" />
          {p.colours.length > 1 && <p className="mt-1 text-[11.5px] text-taupe">{p.colours.length} colours</p>}
        </div>
        {!soldOut && (
          <button type="button" onClick={() => setSheet(true)} className="-mt-1 -mr-1 p-1.5 md:hidden" aria-label={`Quick add ${p.name}`}>
            <BagIcon width={18} height={18} />
          </button>
        )}
      </div>

      {/* Mobile size sheet */}
      <AnimatePresence>
        {sheet && (
          <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-modal="true" aria-label={`Choose a size for ${p.name}`}>
            <motion.div className="absolute inset-0 bg-chocolate/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div className="absolute inset-x-0 bottom-0 bg-offwhite px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))]" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.45, ease }}>
              <div className="mb-4 flex items-center justify-between">
                <div><p className="label text-[14px]">{p.name}</p><Price prices={p.prices} className="text-[13px]" /></div>
                <button onClick={() => setSheet(false)} aria-label="Close" className="p-2 text-[26px] leading-none font-extralight">×</button>
              </div>
              <p className={cn("eyebrow mb-3", cardError && "normal-case tracking-normal text-danger")} aria-live="polite">{cardError || (added ? `Added to bag — size ${added}` : "Select a size")}</p>
              <div className="grid grid-cols-3 gap-2">
                {p.sizes.map((s) => (
                  <button key={s.size} disabled={s.stock < 1} onClick={() => quickAdd(s)} className={cn("min-h-12 border text-[14px]", added === s.size ? "border-chocolate bg-chocolate text-offwhite" : "border-line", s.stock < 1 && "text-taupe/45 line-through")}>
                    {s.size}
                  </button>
                ))}
              </div>
              <button className="ulink mt-5 block" onClick={() => { setSheet(false); setCartOpen(true); }}>View bag</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </article>
  );
}
