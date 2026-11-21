import type { PriceSet } from "./commerce";

export type GarmentKind = "dress" | "blouse" | "knit" | "trousers" | "coat" | "kurta" | "skirt" | "set" | "bag" | "shoes" | "jewelry" | "scarf";

/** Art-direction scene for illustrated imagery when no photograph exists. */
export type SceneTone = "camel" | "oat" | "clay" | "sage" | "night" | "blush" | "cocoa" | "ivory";

export interface ImageCredit {
  source: "Pexels" | "Unsplash" | "Nargis & Shaz";
  photographer: string;
  photographerUrl?: string;
  sourceUrl?: string;
  license: string;
}

export interface ProductImage {
  id: string;
  /** Photograph URL (Pexels CDN for sample imagery; Supabase Storage in production). */
  src?: string;
  /** Licensing / attribution. Brand photography uses source "Nargis & Shaz". */
  credit?: ImageCredit;
  alt: string;
  width?: number;
  height?: number;
  /** @deprecated Legacy illustration parameters (no longer rendered on the storefront). */
  art?: { kind: GarmentKind; color: string; scene: SceneTone; view: number; accent?: boolean };
}

export interface ProductColour {
  id: string;
  name: string;
  hex: string;
  images: ProductImage[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  colourId: string;
  size: string;
  /** Optional per-variant price override. */
  prices?: PriceSet;
  stock: number;
}

export type ProductStatus = "active" | "draft" | "archived";

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  categoryId: string;
  collectionIds: string[];
  occasionIds: OccasionId[];
  prices: PriceSet;
  compareAtPrices?: PriceSet;
  colours: ProductColour[];
  sizes: string[];
  variants: ProductVariant[];
  fabric: string;
  care: string[];
  details: string[];
  fit?: string;
  tags: string[];
  /** Hand-picked pairings shown as "Complete the look". */
  completeTheLook?: string[];
  /** Sales analytics snapshot (Phase 2: aggregated from orders). Drives bestsellers. */
  stats?: { unitsSold30d: number };
  isNew: boolean;
  status: ProductStatus;
  createdAt: string; // ISO
  seo?: { title?: string; description?: string };
}

export type OccasionId = "workwear" | "everyday" | "evening" | "festive";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  /** Editorial image for menus and category cards. */
  image?: ProductImage;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  headline: string; // may contain *emphasis*
  description: string;
  occasionId?: OccasionId;
  hero: ProductImage;
  featured: boolean;
  sortOrder: number;
  status: "published" | "draft";
  seo?: { title?: string; description?: string };
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "bestselling";

export interface CatalogFilter {
  categoryIds?: string[];
  occasionIds?: OccasionId[];
  collectionId?: string;
  colours?: string[];
  sizes?: string[];
  newOnly?: boolean;
  inStockOnly?: boolean;
  priceRange?: [number, number];
  query?: string;
  sort?: SortKey;
}
