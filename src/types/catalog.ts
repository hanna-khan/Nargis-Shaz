import type { PriceSet } from "./commerce";

export type GarmentKind =
  | "dress"
  | "blouse"
  | "knit"
  | "trousers"
  | "coat"
  | "kurta"
  | "bag"
  | "shoes"
  | "jewelry"
  | "scarf";

/** Art-direction scene for illustrated imagery when no photograph exists. */
export type SceneTone = "camel" | "oat" | "clay" | "sage" | "night" | "blush" | "cocoa" | "ivory";

export interface ProductImage {
  id: string;
  /** Real photograph URL (Supabase Storage later). Optional while art direction is illustrated. */
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  /** Illustration fallback parameters. */
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

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export interface CatalogFilter {
  categoryIds?: string[];
  occasionIds?: OccasionId[];
  collectionId?: string;
  colours?: string[];
  sizes?: string[];
  newOnly?: boolean;
  query?: string;
  sort?: SortKey;
}
