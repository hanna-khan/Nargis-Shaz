"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { EditorialImage } from "@/components/media/editorial-image";
import type { NavItem, NavLink } from "./navigation-types";

const ease = [0.22, 0.8, 0.24, 1] as const;

/**
 * Wide image-led panel. Text columns on the left; editorial images on the right.
 * In "preview" panels the first image follows the hovered/focused link.
 */
export function MegaMenu({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const panel = item.panel!;
  const [preview, setPreview] = useState<NavLink | null>(null);
  const fallback = panel.columns[0]?.links.find((l) => l.image) ?? null;
  const shownLink = preview ?? fallback;
  const previewImage = panel.preview ? shownLink?.image ?? null : null;
  const features = panel.features;

  return (
    <motion.div
      id={`mega-${item.id}`}
      role="region"
      aria-label={`${item.label} menu`}
      initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
      exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)", transition: { duration: 0.3, ease } }}
      transition={{ duration: 0.55, ease }}
      className="absolute inset-x-0 top-full hidden border-b border-line bg-offwhite text-chocolate xl:block"
    >
      <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.08 }} className="gutter grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-[clamp(32px,5vw,96px)] pt-10 pb-12">
        <div className="grid auto-cols-fr grid-flow-col gap-10">
          {panel.columns.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-5 text-bronze">{col.title}</p>
              <ul className="space-y-[3px]">
                {col.links.map((l) => (
                  <li key={l.href + l.name}>
                    <Link
                      href={l.href}
                      onClick={onNavigate}
                      onMouseEnter={() => setPreview(l.image ? l : null)}
                      onFocus={() => setPreview(l.image ? l : null)}
                      className="group inline-flex items-center gap-2 font-serif text-[19px] leading-[1.75] transition-colors hover:text-bronze focus-visible:text-bronze"
                    >
                      <span className="h-px w-0 bg-current transition-all duration-500 group-hover:w-4 group-focus-visible:w-4" aria-hidden />
                      {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={`grid gap-5 ${features.length + (panel.preview ? 1 : 0) >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {panel.preview && (
            <div className="relative aspect-[4/3] overflow-hidden bg-stone/50" aria-hidden={!previewImage}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={previewImage?.id ?? "default"} className="absolute inset-0" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }}>
                  <EditorialImage image={previewImage} priority className="absolute inset-0" sizes="30vw" position="center 30%" />
                </motion.div>
              </AnimatePresence>
              <p className="absolute bottom-4 left-4 bg-offwhite/90 px-3 py-1.5 text-[10px] tracking-[0.24em] uppercase">{shownLink?.name ?? "Explore"}</p>
            </div>
          )}
          {features.slice(0, panel.preview ? 1 : 2).map((f) => (
            <Link key={f.href} href={f.href} onClick={onNavigate} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden">
                <EditorialImage image={f.image} priority className="absolute inset-0" imgClassName="transition-transform duration-[1.6s] ease-[var(--ease-editorial)] group-hover:scale-[1.04]" sizes="30vw" position="center 30%" />
              </div>
              <p className="eyebrow mt-3 text-taupe">{f.eyebrow}</p>
              <p className="mt-1 flex items-center justify-between font-serif text-[18px]">{f.title}<span className="ulink !text-[10px]">{f.cta}</span></p>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
