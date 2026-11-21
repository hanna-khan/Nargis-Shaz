import type { Metadata } from "next";
import { CollectionView } from "@/components/store/collection-view";
import { catalog } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Shop Women's Clothing",
  description: "Shop the full Nargis & Shaz collection: dresses, silk blouses, cashmere knitwear, tailored trousers, coats, kurtas and accessories. Delivery across Pakistan and worldwide.",
  path: "/shop",
});

export default async function ShopPage() {
  const [products, collections] = await Promise.all([catalog.listProducts(), catalog.listCollections()]);
  return (
    <CollectionView
      collection={{ name: "Shop", eyebrow: "The collection", headline: "Everything, *considered*", description: "Considered clothing for work, weekends and celebrations." }}
      products={products}
      path="/shop"
      editorial={collections.find((c) => c.slug === "autumn-winter-2026")}
    />
  );
}
