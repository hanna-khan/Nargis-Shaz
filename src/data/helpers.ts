import type { PriceSet } from "@/types";

/** Explicit market prices in MAJOR units → stored as minor units. */
export const prices = (pkr: number, usd: number, gbp: number, eur: number): PriceSet => ({
  PKR: pkr * 100,
  USD: usd * 100,
  GBP: gbp * 100,
  EUR: eur * 100,
});

/** Deterministic pseudo-random (no Math.random during prerender). */
export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
