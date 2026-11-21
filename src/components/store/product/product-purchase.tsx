"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Price, useShop } from "../shop-context";
import { WishButton } from "./wish-button";
import type { Product } from "@/types";

const ease = [0.22, 0.8, 0.24, 1] as const;

/** Gallery + variant selection + add to bag. Server passes product data and the details accordion. */
export function ProductPurchase({ product: p, categoryName, children }: { product: Product; categoryName: string; children: ReactNode }) {
  const { addToCart, setCartOpen, config, market } = useShop();
  const [colourIdx, setColourIdx] = useState(0);
  const [size, setSize] = useState<string | null>(p.sizes.length === 1 ? p.sizes[0] : null);
  const [error, setError] = useState("");
  const colour = p.colours[colourIdx];
  const stockFor = (s: string) => p.variants.find((v) => v.colourId === colour.id && v.size === s)?.stock ?? 0;
  const variant = size ? p.variants.find((v) => v.colourId === colour.id && v.size === size) : undefined;
  const fastest = config.shipping.filter((s) => s.marketId === market.id).sort((a, b) => a.estimatedDays[0] - b.estimatedDays[0])[0];

  const add = () => {
    if (!variant) { setError("Please select a size."); document.getElementById("size-picker")?.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if (variant.stock < 1) { setError("This size is sold out in this colour."); return; }
    addToCart({ productId: p.id, variantId: variant.id, slug: p.slug, name: p.name, colour: colour.name, size: variant.size, image: colour.images[0], prices: variant.prices ?? p.prices });
    setCartOpen(true);
  };

  return (
    <div className="grid items-start gap-[clamp(28px,5vw,90px)] md:grid-cols-[minmax(0,1.35fr)_minmax(340px,.8fr)]">
      {/* Gallery: grid on desktop, swipeable on mobile */}
      <div className="no-scrollbar -mx-[clamp(18px,3.2vw,48px)] flex snap-x snap-mandatory gap-1.5 overflow-x-auto md:mx-0 md:grid md:grid-cols-2 md:gap-2.5 md:overflow-visible" aria-label={`${p.name} images`}>
        <AnimatePresence mode="popLayout" initial={false}>
          {colour.images.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, clipPath: "inset(0 0 12% 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease, delay: i * 0.06 }}
              className={cn("shrink-0 basis-[86%] snap-center md:basis-auto", i === 0 && "md:col-span-2")}
            >
              <EditorialImage image={img} className={cn("aspect-[4/5.2]", i === 0 && "md:aspect-[4/4.4]")} priority={i === 0} sizes="(max-width:768px) 86vw, 50vw" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="md:sticky md:top-[96px]">
        <p className="eyebrow">{p.isNew ? "New in" : categoryName}</p>
        <h1 className="mt-3 font-serif text-[clamp(38px,4vw,58px)] leading-[1.02] font-light">{p.name}</h1>
        <p className="mt-1 text-[14px] text-charcoal/60">{p.subtitle}</p>
        <Price prices={variant?.prices ?? p.prices} compareAt={p.compareAtPrices} className="mt-5 block text-[18px]" />
        <p className="mt-1 text-[12px] text-charcoal/50">{market.currency === "PKR" ? "Inclusive of GST" : market.zone === "international" && ["gb", "eu"].includes(market.id) ? "Duties & VAT included" : "Import duties may apply"}</p>
        <p className="mt-6 max-w-[460px] text-[14.5px] text-charcoal/75">{p.description}</p>

        <fieldset className="mt-7">
          <legend className="mb-3 text-[10.5px] tracking-[0.22em] uppercase">Colour — <span className="text-charcoal/65">{colour.name}</span></legend>
          <div className="flex gap-3">
            {p.colours.map((c, i) => (
              <button key={c.id} onClick={() => { setColourIdx(i); setError(""); }} aria-pressed={i === colourIdx} aria-label={c.name}
                className={cn("relative h-9 w-9 rounded-full border border-black/15", i === colourIdx && "after:absolute after:-inset-[6px] after:rounded-full after:border after:border-charcoal")} style={{ background: c.hex }} />
            ))}
          </div>
        </fieldset>

        {p.sizes.length > 1 && (
          <fieldset className="mt-7" id="size-picker">
            <div className="mb-3 flex justify-between text-[10.5px] tracking-[0.22em] uppercase">
              <legend>Size{size ? ` — ${size}` : ""}</legend>
              <a href="#size-guide" className="ulink !text-[10px]">Size guide</a>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {p.sizes.map((s) => {
                const st = stockFor(s);
                return (
                  <button key={s} disabled={st === 0} onClick={() => { setSize(s); setError(""); }} aria-pressed={size === s} aria-label={`${s}${st === 0 ? ", sold out" : st < 4 ? `, only ${st} left` : ""}`}
                    className={cn("relative border py-3 text-[12.5px] transition-colors", size === s ? "border-charcoal bg-charcoal text-ivory" : "border-line hover:border-charcoal", st === 0 && "text-charcoal/30 line-through", error && !size && "border-clay")}>
                    {s}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 min-h-5 text-[12.5px] text-clay" role="alert">{error || (variant && variant.stock > 0 && variant.stock < 4 ? `Only ${variant.stock} left in this size` : "")}</p>
          </fieldset>
        )}

        <div className="mt-4 flex gap-3">
          <Button onClick={add} full>Add to bag</Button>
          <WishButton item={{ productId: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, image: colour.images[0], prices: p.prices }} className="shrink-0 border border-line px-4" />
        </div>
        {p.sizes.length === 1 && error && <p className="mt-2 text-[12.5px] text-clay" role="alert">{error}</p>}
        {fastest && <p className="mt-4 text-center text-[12.5px] text-charcoal/55">{fastest.label} to {market.name} in {fastest.estimatedDays[0]}–{fastest.estimatedDays[1]} working days</p>}
        <div className="mt-8">{children}</div>
      </div>

      {/* Mobile sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-line bg-paper px-[clamp(18px,3.2vw,48px)] py-3 md:hidden">
        <div className="min-w-0"><p className="truncate font-serif text-[18px]">{p.name}</p><Price prices={p.prices} className="text-[13px]" /></div>
        <Button onClick={add} size="sm">{size ? "Add to bag" : "Select size"}</Button>
      </div>
    </div>
  );
}
