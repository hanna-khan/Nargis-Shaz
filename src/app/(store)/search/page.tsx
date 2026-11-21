import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/store/search-results";
import { toCard } from "@/components/store/product/card-data";
import { catalog } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

// Result pages help shoppers but are kept out of search engines.
export const metadata: Metadata = pageMetadata({ title: "Search", description: "Search the Nargis & Shaz collection.", path: "/search", noIndex: true });

export default async function SearchPage() {
  const [products, categories] = await Promise.all([catalog.listProducts(), catalog.listCategories()]);
  const items = products.map((p) => ({
    card: toCard(p),
    text: [p.name, p.subtitle, p.description, p.fabric, ...p.colours.map((c) => c.name), ...p.occasionIds, categories.find((c) => c.id === p.categoryId)?.name].join(" ").toLowerCase(),
  }));
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <SearchResults items={items} />
    </Suspense>
  );
}
