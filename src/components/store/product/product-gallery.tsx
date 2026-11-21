"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

const ease = [0.22, 0.8, 0.24, 1] as const;

/**
 * Desktop: thumbnail rail + large main image with arrows; click opens the full-screen viewer.
 * Mobile: swipeable full-width gallery with counter; tap opens the viewer.
 */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [i, setI] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const n = images.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  // Reset to the first frame when the colour (image set) changes.
  const first = images[0]?.id;
  useEffect(() => { setI(0); track.current?.scrollTo({ left: 0 }); }, [first]); // eslint-disable-line react-hooks/set-state-in-effect

  return (
    <div className="lg:grid lg:grid-cols-[76px_minmax(0,1fr)] lg:gap-4">
      {/* Thumbnails (desktop) */}
      <ul className="no-scrollbar hidden max-h-[calc(100vh-140px)] flex-col gap-2.5 overflow-y-auto lg:sticky lg:top-24 lg:flex" aria-label="Product images">
        {images.map((img, k) => (
          <li key={img.id}>
            <button onClick={() => setI(k)} aria-label={`Show image ${k + 1} of ${n}`} aria-current={k === i} className={cn("relative block aspect-[3/4] w-full overflow-hidden transition-opacity", k === i ? "opacity-100 outline outline-1 outline-offset-2 outline-chocolate" : "opacity-55 hover:opacity-100")}>
              <Image src={img.src!} alt="" fill sizes="76px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {/* Main image (desktop) */}
      <div className="relative hidden aspect-[3/4] overflow-hidden bg-stone/50 lg:block">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.button key={images[i]?.id} type="button" onClick={() => setViewer(i)} aria-label={`Open image ${i + 1} full screen`} className="absolute inset-0 cursor-zoom-in"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }}>
            <Image src={images[i].src!} alt={images[i].alt} fill sizes="(max-width:1280px) 55vw, 50vw" loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} className="object-cover" />
          </motion.button>
        </AnimatePresence>
        {n > 1 && [-1, 1].map((d) => (
          <button key={d} onClick={() => go(d)} aria-label={d < 0 ? "Previous image" : "Next image"} className={cn("absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-offwhite/80 backdrop-blur-sm transition-colors hover:bg-offwhite", d < 0 ? "left-4" : "right-4")}>
            <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden><path d={d < 0 ? "M8 1L2 8l6 7" : "M2 1l6 7-6 7"} fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
        ))}
        <p className="absolute bottom-4 left-4 bg-offwhite/85 px-2.5 py-1 text-[11px] tracking-[0.14em]" aria-hidden>{i + 1} / {n}</p>
      </div>

      {/* Swipe gallery (mobile / tablet) */}
      <div className="relative -mx-[clamp(18px,3.4vw,56px)] lg:hidden">
        <div ref={track} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" aria-label={`${name} images`} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {images.map((img, k) => (
            <button key={img.id} type="button" onClick={() => setViewer(k)} className="relative aspect-[3/4] w-full shrink-0 snap-center" aria-label={`Open image ${k + 1} of ${n} full screen`}>
              <Image src={img.src!} alt={img.alt} fill sizes="100vw" loading={k === 0 ? "eager" : "lazy"} fetchPriority={k === 0 ? "high" : undefined} className="object-cover" />
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
          {images.map((img, k) => <span key={img.id} className={cn("h-[3px] rounded-full transition-all duration-500", k === i ? "w-6 bg-offwhite" : "w-3 bg-offwhite/50")} />)}
        </div>
      </div>

      <Lightbox images={images} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} />
    </div>
  );
}

/** Full-screen viewer: arrows / swipe / keyboard; click to zoom 2.2× and pan with the pointer. */
function Lightbox({ images, index, onClose, onIndex }: { images: ProductImage[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const ref = useRef<HTMLDivElement>(null);
  const n = images.length;
  const touch = useRef<number | null>(null);

  useEffect(() => {
    if (index === null) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { setZoom(false); onIndex((index + 1) % n); }
      if (e.key === "ArrowLeft") { setZoom(false); onIndex((index - 1 + n) % n); }
    };
    document.addEventListener("keydown", k);
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => ref.current?.focus(), 40);
    return () => { document.removeEventListener("keydown", k); document.documentElement.style.overflow = ""; prev?.focus?.(); };
  }, [index, n, onClose, onIndex]);

  return (
    <AnimatePresence>
      {index !== null && (
        <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Image viewer" className="fixed inset-0 z-[140] flex flex-col bg-offwhite outline-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-[11px] tracking-[0.18em]">{index + 1} / {n}</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setZoom((z) => !z)} className="hidden text-[11px] tracking-[0.2em] uppercase md:block">{zoom ? "Zoom out" : "Zoom in"}</button>
              <button onClick={onClose} aria-label="Close viewer" className="p-1 text-[30px] leading-none font-extralight">×</button>
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden"
            onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
            onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) onIndex((index + (dx < 0 ? 1 : -1) + n) % n); touch.current = null; }}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div key={images[index].id} className={cn("absolute inset-0", zoom ? "cursor-zoom-out" : "cursor-zoom-in")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`); setZoom((z) => !z); }}
                onMouseMove={(e) => { if (!zoom) return; const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`); }}>
                <Image src={images[index].src!} alt={images[index].alt} fill sizes="100vw" className="object-contain transition-transform duration-300" style={{ transform: zoom ? "scale(2.2)" : undefined, transformOrigin: origin }} />
              </motion.div>
            </AnimatePresence>
            {[-1, 1].map((d) => (
              <button key={d} onClick={() => { setZoom(false); onIndex((index + d + n) % n); }} aria-label={d < 0 ? "Previous image" : "Next image"} className={cn("absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-offwhite/80", d < 0 ? "left-4" : "right-4")}>
                <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden><path d={d < 0 ? "M8 1L2 8l6 7" : "M2 1l6 7-6 7"} fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto px-5 py-3">
            {images.map((img, k) => (
              <button key={img.id} onClick={() => { setZoom(false); onIndex(k); }} aria-label={`Show image ${k + 1}`} className={cn("relative h-16 w-12 shrink-0 overflow-hidden", k === index ? "outline outline-1 outline-offset-2 outline-chocolate" : "opacity-50")}>
                <Image src={img.src!} alt="" fill sizes="48px" className="object-cover" />
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
