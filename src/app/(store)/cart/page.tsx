import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Your Bag", description: "Review the pieces in your bag.", path: "/cart", noIndex: true });

export default function CartPage() {
  return <CartView />;
}
