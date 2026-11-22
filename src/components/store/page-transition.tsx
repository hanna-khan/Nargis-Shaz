"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/** Set after the first (server-rendered) page has hydrated; later mounts come from client navigation. */
const session = { hydrated: false };

/**
 * Soft fade-up between client-side route changes (used from the store's template.tsx, which remounts
 * on navigation). The first, server-rendered paint is never hidden, so LCP and crawlers always see
 * content immediately.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [fromNavigation] = useState(() => session.hydrated);
  useEffect(() => { session.hydrated = true; }, []);
  const initial = !fromNavigation || reduce ? false : { opacity: 0, y: 12 };
  return <motion.div initial={initial} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 0.8, 0.24, 1] }}>{children}</motion.div>;
}
