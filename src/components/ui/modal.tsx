"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Storefront modal (size guide etc.): focus moves in, Escape closes, scroll locked. */
export function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => ref.current?.focus(), 40);
    return () => { document.removeEventListener("keydown", k); document.documentElement.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] grid place-items-center p-4 max-sm:items-end max-sm:p-0" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-chocolate/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div ref={ref} tabIndex={-1} className={cn("relative max-h-[88vh] w-full max-w-[640px] overflow-y-auto bg-offwhite outline-none", className)}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.4, ease: [0.22, 0.8, 0.24, 1] }}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-offwhite px-6 py-4">
              <h2 className="font-serif text-[22px]">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="p-1 text-[26px] leading-none font-extralight">×</button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
