import type { PriceSet, Product, ProductImage } from "@/types";

/** Minimal, serializable product summary for interactive cards (keeps client payload small). */
export interface CardProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  prices: PriceSet;
  compareAt?: PriceSet;
  isNew: boolean;
  colours: { name: string; hex: string }[];
  images: ProductImage[];
  sizes: { size: string; variantId: string; stock: number }[];
  colourName: string;
}

export function toCard(p: Product): CardProduct {
  const c = p.colours[0];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    prices: p.prices,
    compareAt: p.compareAtPrices,
    isNew: p.isNew,
    colours: p.colours.map((x) => ({ name: x.name, hex: x.hex })),
    images: c.images.slice(0, 4),
    colourName: c.name,
    sizes: p.sizes.map((s) => {
      const v = p.variants.find((x) => x.colourId === c.id && x.size === s)!;
      return { size: s, variantId: v.id, stock: v.stock };
    }),
  };
}
