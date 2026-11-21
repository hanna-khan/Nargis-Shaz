"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { SilkPalette } from "./silk-surface";

const SilkSurface = dynamic(() => import("./silk-surface"), { ssr: false });

/**
 * Lazy WebGL backdrop: a CSS gradient is always rendered (fast LCP, no-JS, reduced motion);
 * the canvas loads only when visible, WebGL exists and motion is allowed.
 */
export function SilkBackdrop({ palette, gradient }: { palette: SilkPalette; gradient: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduce || !ref.current) return;
    const ok = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();
    if (!ok) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [reduce]);

  useEffect(() => { if (show) { const t = setTimeout(() => setReady(true), 350); return () => clearTimeout(t); } }, [show]);

  return (
    <div ref={ref} aria-hidden className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: gradient }} />
      {show && <div className={`absolute inset-0 transition-opacity duration-[1600ms] ${ready ? "opacity-100" : "opacity-0"}`}><SilkSurface palette={palette} /></div>}
    </div>
  );
}
