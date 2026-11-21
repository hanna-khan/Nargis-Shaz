"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Accessible side drawer (focus moved in, Escape closes, scroll locked). */
export function Drawer({ open, onClose, side = "right", title, children, footer, className }: { open: boolean; onClose: () => void; side?: "left" | "right"; title: string; children: ReactNode; footer?: ReactNode; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => panel.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-charcoal/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} onClick={onClose} />
          <motion.div
            ref={panel}
            tabIndex={-1}
            className={cn("absolute top-0 bottom-0 flex w-full max-w-[460px] flex-col bg-paper outline-none", side === "right" ? "right-0" : "left-0", className)}
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ duration: 0.6, ease: [0.22, 0.8, 0.24, 1] }}
          >
            <div className="flex items-center justify-between border-b border-line px-7 py-5">
              <h2 className="font-serif text-[26px] font-normal">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="text-[28px] leading-none font-extralight">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
