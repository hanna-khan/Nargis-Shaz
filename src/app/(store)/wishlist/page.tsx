import type { Metadata } from "next";
import { WishlistView } from "@/components/store/wishlist-view";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Wishlist", description: "Your saved pieces at Nargis & Shaz.", path: "/wishlist", noIndex: true });

export default function WishlistPage() {
  return <WishlistView />;
}
