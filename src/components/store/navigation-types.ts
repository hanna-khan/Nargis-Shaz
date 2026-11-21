import type { PriceSet, ProductImage } from "@/types";

export interface NavLink {
  name: string;
  href: string;
  /** Optional preview image shown in the mega menu while this link is hovered/focused. */
  image?: ProductImage;
}

export interface NavFeature {
  title: string;
  eyebrow: string;
  href: string;
  cta: string;
  image: ProductImage;
}

export interface NavPanel {
  columns: { title: string; links: NavLink[] }[];
  features: NavFeature[];
  /** Image preview that swaps as links are hovered (first feature slot). */
  preview?: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  panel?: NavPanel;
}

/** Navigation + search index assembled on the server from the repositories. */
export interface NavData {
  announcement: string;
  primary: NavItem[];
  categories: NavLink[];
  occasions: NavLink[];
  collections: NavLink[];
  searchIndex: { id: string; name: string; subtitle: string; href: string; keywords: string; image: ProductImage; prices: PriceSet }[];
  paymentNote: string;
}
