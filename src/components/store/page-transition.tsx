"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Soft fade-up between client-side route changes. The first, server-rendered paint is never
 * hidden (initial={false}), so LCP and crawlers always see content immediately.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // eslint-disable-line react-hooks/set-state-in-effect
  if (reduce) return <>{children}</>;
  return (
    <motion.div key={pathname} initial={!mounted ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 0.8, 0.24, 1] }}>
      {children}
    </motion.div>
  );
}
