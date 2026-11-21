import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { CollectionView } from "@/components/store/collection-view";
import { catalog } from "@/lib/repositories";
import { collectionMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const cols = await catalog.listCollections();
  return cols.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await catalog.getCollectionBySlug(slug);
  if (!c) return { title: "Collection not found", robots: { index: false } };
  return collectionMetadata(c, c.occasionId ? `/${c.occasionId}` : `/collections/${c.slug}`);
}

async function CollectionContent({ params }: { params: PageProps<"/collections/[slug]">["params"] }) {
  const { slug } = await params;
  const c = await catalog.getCollectionBySlug(slug);
  if (!c || c.status !== "published") notFound();
  // Occasion collections live at their own top-level URL — one canonical page each.
  if (c.occasionId) permanentRedirect(`/${c.occasionId}`);
  const products = await catalog.listProducts({ collectionId: c.id });
  return <CollectionView collection={c} products={products} path={`/collections/${c.slug}`} />;
}

export default function CollectionPage(props: PageProps<"/collections/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <CollectionContent params={props.params} />
    </Suspense>
  );
}
