"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import imageLoader from "@/lib/media/image-loader";
import { QuantityStepper } from "../cart-lines";
import { Price, useShop } from "../shop-context";
import { ProductGallery } from "./product-gallery";
import { SizeGuideButton } from "./size-guide";
import { WishButton } from "./wish-button";
import type { Product } from "@/types";

const ease = [0.22, 0.8, 0.24, 1] as const;

/** Gallery + purchase panel. Colour changes swap images and variants; size + stock are validated. */
export function ProductPurchase({ product: p, categoryName, children, sizeGuide }: { product: Product; categoryName: string; children: ReactNode; sizeGuide: { rows: { size: string; uk?: string; eu?: string; us?: string; bust: string; waist: string; hip: string }[]; notes: string } | null }) {
  const { addToCart, setCartOpen, config, market, trackView, busy } = useShop();
  const [live, setLive] = useState<Record<string, number> | null>(null);
  const [colourIdx, setColourIdx] = useState(0);
  const [size, setSize] = useState<string | null>(p.sizes.length === 1 ? p.sizes[0] : null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const colour = p.colours[colourIdx];
  // Live stock (the page itself may be served from cache).
  const variants = p.variants.map((v) => (live && v.id in live ? { ...v, stock: live[v.id] } : v));
  const stockFor = (s: string) => variants.find((v) => v.colourId === colour.id && v.size === s)?.stock ?? 0;
  const variant = size ? variants.find((v) => v.colourId === colour.id && v.size === size) : undefined;
  const madeToOrder = p.tags.includes("made-to-order") || p.categoryId === "cat-festive";
  const fastest = config.shipping.filter((s) => s.marketId === market.id && s.active).sort((a, b) => a.estimatedDays[0] - b.estimatedDays[0])[0];
  const anyStock = variants.some((v) => v.colourId === colour.id && v.stock > 0);

  useEffect(() => {
    let off = false;
    fetch(`/api/products/${encodeURIComponent(p.slug)}/availability`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!off && d?.variants) setLive(d.variants); }).catch(() => {});
    return () => { off = true; };
  }, [p.slug]);
  useEffect(() => { trackView({ productId: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, image: p.colours[0].images[0], prices: p.prices }); }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const add = async () => {
    if (!variant) { setError("Please select your size."); document.getElementById("size-picker")?.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if (variant.stock < 1) { setError("This size is sold out. Please choose another."); return; }
    if (qty > variant.stock) { setError(`Only ${variant.stock} available in size ${variant.size}.`); return; }
    const r = await addToCart(variant.id, qty);
    if (!r.ok) { setError(r.error); return; }
    setAdded(true);
    setTimeout(() => { setAdded(false); setCartOpen(true); }, 650);
  };

  const availability = !anyStock ? { tone: "out", text: "Currently sold out in this colour" }
    : variant ? (variant.stock === 0 ? { tone: "out", text: `Size ${variant.size} is sold out` } : variant.stock < 4 ? { tone: "low", text: `Only ${variant.stock} left in size ${variant.size}` } : { tone: "in", text: madeToOrder ? "Made to order — dispatched in 4–10 weeks" : "In stock — ready to dispatch" })
    : { tone: "in", text: madeToOrder ? "Made to order in our Lahore atelier" : "In stock in selected sizes" };

  return (
    <>
      <div className="grid items-start gap-[clamp(24px,4.4vw,80px)] lg:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.75fr)]">
        <ProductGallery images={colour.images} name={p.name} />

        <div className="lg:sticky lg:top-24">
          <p className="eyebrow text-bronze">{p.isNew ? "New in" : categoryName}</p>
          <h1 className="display mt-3 text-[clamp(32px,3.2vw,48px)] uppercase tracking-[0.02em]">{p.name}</h1>
          <p className="mt-1.5 text-[14px] text-taupe">{p.subtitle}</p>
          <div className="mt-5 flex items-baseline gap-3">
            <Price prices={variant?.prices ?? p.prices} compareAt={p.compareAtPrices} className="text-[19px]" />
            <span className="text-[12px] text-taupe">{market.currency === "PKR" ? "incl. GST" : ["gb", "eu"].includes(market.id) ? "Duties & VAT included" : "Import duties may apply"}</span>
          </div>

          <fieldset className="mt-8">
            <legend className="mb-3 text-[10.5px] tracking-[0.22em] uppercase">Colour <span className="ml-1 tracking-[0.12em] text-taupe normal-case">{colour.name}</span></legend>
            <div className="flex gap-2.5">
              {p.colours.map((c, i) => (
                <button key={c.id} onClick={() => { setColourIdx(i); setSize(null); setError(""); }} aria-pressed={i === colourIdx} aria-label={c.name}
                  className={cn("relative h-14 w-11 overflow-hidden border transition-colors", i === colourIdx ? "border-chocolate" : "border-line hover:border-taupe")}>
                  {c.images[0]?.src ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageLoader({ src: c.images[0].src, width: 120 })})` }} /> : <span className="absolute inset-0" style={{ background: c.hex }} />}
                </button>
              ))}
            </div>
          </fieldset>

          {p.sizes.length > 1 && (
            <fieldset className="mt-7 scroll-mt-32" id="size-picker">
              <div className="mb-3 flex items-baseline justify-between">
                <legend className="text-[10.5px] tracking-[0.22em] uppercase">Size{size ? <span className="ml-1 tracking-[0.12em] text-taupe">{size}</span> : null}</legend>
                {sizeGuide && <SizeGuideButton fit={p.fit} guide={sizeGuide} />}
              </div>
              <div className="grid grid-cols-6 gap-1.5 max-sm:grid-cols-3">
                {p.sizes.map((s) => {
                  const st = stockFor(s);
                  return (
                    <button key={s} disabled={st === 0} onClick={() => { setSize(s); setError(""); setQty(1); }} aria-pressed={size === s}
                      aria-label={`Size ${s}${st === 0 ? ", sold out" : st < 4 ? `, only ${st} left` : ""}`}
                      className={cn("relative min-h-12 border text-[13px] transition-colors", size === s ? "border-chocolate bg-chocolate text-offwhite" : "border-line hover:border-chocolate", st === 0 && "cursor-not-allowed text-taupe/50", error && !size && "border-bronze")}>
                      {s}
                      {st === 0 && <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--color-stone)_50%,transparent_calc(50%+0.5px))]" />}
                      {st > 0 && st < 4 && size !== s && <span aria-hidden className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-bronze" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <p className={cn("mt-4 flex items-center gap-2 text-[13px]", availability.tone === "out" ? "text-danger" : availability.tone === "low" ? "text-bronze" : "text-taupe")} aria-live="polite">
            <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", availability.tone === "out" ? "bg-danger" : availability.tone === "low" ? "bg-bronze" : "bg-success")} />
            {availability.text}
          </p>
          <p className="mt-1 min-h-5 text-[13px] text-danger" role="alert">{error}</p>

          <div ref={buyRef} className="mt-3 flex gap-2.5">
            <QuantityStepper value={qty} onChange={(n) => { setQty(Math.max(1, Math.min(10, n))); setError(""); }} label={p.name} />
            <button onClick={add} disabled={!anyStock || busy} className="relative min-h-12 flex-1 overflow-hidden bg-chocolate text-[11px] tracking-[0.24em] text-offwhite uppercase transition-colors duration-500 hover:bg-espresso disabled:bg-stone disabled:text-taupe">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={added ? "added" : "add"} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.3, ease }} className="block">
                  {!anyStock ? "Sold out" : added ? "Added to bag ✓" : "Add to bag"}
                </motion.span>
              </AnimatePresence>
            </button>
            <WishButton item={{ productId: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, image: colour.images[0], prices: p.prices }} className="grid min-h-12 w-12 shrink-0 place-items-center border border-line hover:border-chocolate" />
          </div>
          {fastest && <p className="mt-4 text-[12.5px] text-taupe">{fastest.label} to {market.name}: {fastest.estimatedDays[0]}–{fastest.estimatedDays[1]} working days{market.id === "pk" ? " · Cash on delivery available" : ""}</p>}

          <p className="mt-8 text-[14.5px] leading-relaxed text-chocolate/85">{p.description}</p>
          <ul className="mt-6 grid grid-cols-3 gap-2 border-y border-line py-4 text-center text-[11px] tracking-[0.08em] text-taupe">
            <li>Designed in<br />Lahore</li>
            <li>{/natural|cotton|linen|wool|silk|cashmere|merino/i.test(p.fabric) ? "Natural" : "Considered"}<br />fibres</li>
            <li>{madeToOrder ? "Made to" : "Free returns"}<br />{madeToOrder ? "measure" : "in Pakistan"}</li>
          </ul>
          <div className="mt-2">{children}</div>
        </div>
      </div>

      {/* Sticky buy bar — desktop (top) / mobile (bottom) */}
      <AnimatePresence>
        {showBar && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.45, ease }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-offwhite/97 backdrop-blur-md lg:top-16 lg:bottom-auto lg:border-t-0 lg:border-b">
            <div className="gutter flex min-h-16 items-center justify-between gap-4 py-2.5">
              <div className="flex min-w-0 items-center gap-4">
                <p className="label hidden truncate text-[14px] lg:block">{p.name}</p>
                <p className="hidden text-[12.5px] text-taupe lg:block">{colour.name}{size ? ` · ${size}` : ""}</p>
                <div className="min-w-0 lg:hidden"><p className="label truncate text-[13px]">{p.name}</p><Price prices={p.prices} className="text-[12.5px]" /></div>
              </div>
              <div className="flex shrink-0 items-center gap-5">
                <Price prices={p.prices} className="hidden text-[15px] lg:block" />
                <button onClick={size ? add : () => document.getElementById("size-picker")?.scrollIntoView({ block: "center", behavior: "smooth" })} disabled={!anyStock}
                  className="min-h-11 bg-chocolate px-7 text-[10.5px] tracking-[0.22em] text-offwhite uppercase disabled:bg-stone">
                  {!anyStock ? "Sold out" : size ? (added ? "Added ✓" : "Add to bag") : "Select size"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
