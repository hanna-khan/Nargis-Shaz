import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/components/store/product/catalog";
import { SearchBox } from "@/components/store/search-results";
import { pageMetadata } from "@/lib/seo";

// Result pages help shoppers but are kept out of search engines.
export const metadata: Metadata = pageMetadata({ title: "Search", description: "Search the Nargis & Shaz collection.", path: "/search", noIndex: true });

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  if (!q) return <div className="pb-24" />;
  return <Catalog scope={{ query: q }} searchParams={Promise.resolve(sp)} />;
}

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <>
      <Suspense fallback={<div className="h-48" />}><SearchBox /></Suspense>
      <Suspense fallback={<div className="min-h-[50vh]" />}><Results searchParams={props.searchParams} /></Suspense>
    </>
  );
}
