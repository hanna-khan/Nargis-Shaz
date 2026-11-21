"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 0.8, 0.24, 1] as const;

/**
 * Scroll-triggered editorial reveal. Content is always in the server HTML (SEO-safe);
 * only opacity/transform/clip are animated.
 */
export function Reveal({ children, className, delay = 0, variant = "rise", as = "div" }: { children: ReactNode; className?: string; delay?: number; variant?: "rise" | "fade" | "curtain"; as?: "div" | "section" | "li" | "article" }) {
  const reduce = useReducedMotion();
  const v: Record<string, Variants> = {
    rise: { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0 } },
    fade: { hidden: { opacity: 0 }, show: { opacity: 1 } },
    curtain: { hidden: { clipPath: "inset(0 0 100% 0)" }, show: { clipPath: "inset(0 0 0% 0)" } },
  };
  const M = motion[as];
  return (
    <M
      className={className}
      variants={reduce ? undefined : v[variant]}
      initial={reduce ? undefined : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: variant === "curtain" ? 1.4 : 1.1, ease, delay }}
    >
      {children}
    </M>
  );
}

/** Staggers its direct <StaggerItem> children. */
export function Stagger({ children, className, gap = 0.1 }: { children: ReactNode; className?: string; gap?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? undefined : "hidden"} whileInView="show" viewport={{ once: true, margin: "0px 0px -8% 0px" }} variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, variant = "rise" }: { children: ReactNode; className?: string; variant?: "rise" | "curtain" }) {
  const variants: Variants =
    variant === "curtain"
      ? { hidden: { clipPath: "inset(0 0 100% 0)" }, show: { clipPath: "inset(0 0 0% 0)", transition: { duration: 1.3, ease } } }
      : { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 1, ease } } };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
