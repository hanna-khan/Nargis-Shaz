import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/store/search-results";
import { ProductCard } from "@/components/store/product/product-card";
import { catalog } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

// Search result pages are useful to users but not to search engines.
export const metadata: Metadata = pageMetadata({ title: "Search", description: "Search the Nargis & Shaz collection.", path: "/search", noIndex: true });

export default async function SearchPage() {
  const [products, categories] = await Promise.all([catalog.listProducts(), catalog.listCategories()]);
  const cards = Object.fromEntries(products.map((p) => [p.id, <ProductCard key={p.id} product={p} />]));
  const index = products.map((p) => ({
    id: p.id,
    text: [p.name, p.subtitle, p.description, p.fabric, ...p.colours.map((c) => c.name), ...p.occasionIds, categories.find((c) => c.id === p.categoryId)?.name].join(" ").toLowerCase(),
  }));
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <SearchResults index={index} cards={cards} />
    </Suspense>
  );
}
