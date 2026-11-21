"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HeartIcon } from "../icons";
import { useShop, type WishItem } from "../shop-context";

export function WishButton({ item, className, withLabel }: { item: WishItem; className?: string; withLabel?: boolean }) {
  const { toggleWish, isWished, hydrated } = useShop();
  const on = hydrated && isWished(item.productId);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(item); }}
      aria-pressed={on}
      aria-label={on ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <motion.span animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.4 }} className={on ? "text-clay" : ""}>
        <HeartIcon filled={on} width={18} height={18} />
      </motion.span>
      {withLabel && <span className="text-[10.5px] tracking-[0.2em] uppercase">{on ? "Saved" : "Save to wishlist"}</span>}
    </button>
  );
}
