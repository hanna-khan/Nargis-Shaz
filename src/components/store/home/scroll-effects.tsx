"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { splitEmphasis } from "@/lib/utils";

/**
 * Editorial text that "writes itself" as it scrolls into view: each word moves from
 * faint to full ink. Static for reduced motion. Text is real HTML (SEO / screen readers).
 */
export function ScrollText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = splitEmphasis(text).flatMap((seg) => seg.text.split(/(\s+)/).filter((w) => w.trim()).map((w) => ({ w, em: seg.em })));
  return (
    <p ref={ref} className={className}>
      {words.map((x, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} em={x.em} reduce={!!reduce}>{x.w}</Word>
      ))}
    </p>
  );
}

function Word({ children, progress, range, em, reduce }: { children: string; progress: MotionValue<number>; range: [number, number]; em: boolean; reduce: boolean }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  const Tag = em ? motion.em : motion.span;
  return <><Tag style={reduce ? undefined : { opacity }} className={em ? "text-bronze" : undefined}>{children}</Tag> </>;
}

/**
 * Pinned horizontal sequence: vertical scrolling moves a row of editorial panels sideways.
 * On touch screens and with reduced motion it becomes a native swipeable row.
 */
export function HorizontalSequence({ children, intro }: { children: ReactNode; intro: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const measure = () => {
      const enable = mq.matches && !reduce;
      setPinned(enable);
      if (track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    return () => { window.removeEventListener("resize", measure); mq.removeEventListener("change", measure); };
  }, [reduce]);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  return (
    <section ref={section} style={pinned ? { height: `calc(100vh + ${distance}px)` } : undefined} className="relative bg-offwhite" aria-label="Discover our collections">
      <div className={pinned ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-16" : "py-[clamp(64px,8vw,120px)]"}>
        <div className="gutter mb-8">{intro}</div>
        <motion.div ref={track} style={pinned ? { x } : undefined} className={pinned ? "flex w-max gap-6 px-[clamp(18px,3.4vw,56px)]" : "no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[clamp(18px,3.4vw,56px)] pb-2"}>
          {children}
        </motion.div>
      </div>
    </section>
  );
}

/** Slow vertical drift for a photograph inside an overflow-hidden frame. */
export function Drift({ children, amount = 60, className }: { children: ReactNode; amount?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-amount, amount]);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      <motion.div style={reduce ? undefined : { y }} className="absolute -inset-y-[70px] inset-x-0">{children}</motion.div>
    </div>
  );
}
