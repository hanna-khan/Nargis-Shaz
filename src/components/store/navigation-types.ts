import type { PriceSet, ProductImage } from "@/types";

/** Lightweight navigation + search index passed from the server layout to client chrome. */
export interface NavData {
  categories: { name: string; href: string }[];
  occasions: { name: string; href: string; image: ProductImage }[];
  collections: { name: string; href: string }[];
  searchIndex: { id: string; name: string; subtitle: string; href: string; keywords: string; image: ProductImage; prices: PriceSet }[];
  announcement: string;
}
