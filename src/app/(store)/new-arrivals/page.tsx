import type { Metadata } from "next";
import { CollectionView } from "@/components/store/collection-view";
import { catalog } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "New Arrivals",
  description: "The newest pieces from Nargis & Shaz — tailoring, satin, knitwear and hand-embroidered festive wear, just arrived for the season.",
  path: "/new-arrivals",
});

export default async function NewArrivalsPage() {
  const [products, collections] = await Promise.all([catalog.listProducts({ newOnly: true, sort: "newest" }), catalog.listCollections()]);
  return (
    <CollectionView
      collection={{ name: "New in", eyebrow: "Just arrived", headline: "New *arrivals*", description: "The pieces we are wearing now: sage tailoring, satin for the evening and gold thread for the season of celebrations." }}
      products={products}
      path="/new-arrivals"
      editorial={collections.find((c) => c.slug === "the-evening-edit")}
    />
  );
}
