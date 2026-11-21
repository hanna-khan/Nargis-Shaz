import type { Metadata } from "next";
import { CollectionView } from "@/components/store/collection-view";
import { catalog } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "New Arrivals",
  description: "The newest pieces from Nargis & Shaz — cashmere, silk, tailoring and hand-embroidered festive wear, just arrived for the season.",
  path: "/new-arrivals",
});

export default async function NewArrivalsPage() {
  const [products, collections] = await Promise.all([catalog.listProducts({ sort: "newest" }), catalog.listCollections()]);
  return (
    <CollectionView
      collection={{ name: "New arrivals", eyebrow: "Just arrived", headline: "New *arrivals*", description: "The pieces we are wearing now — warm camel, terracotta and gold thread for the new season." }}
      products={products.slice(0, 12)}
      path="/new-arrivals"
      editorial={collections.find((c) => c.slug === "jashn-2026")}
    />
  );
}
