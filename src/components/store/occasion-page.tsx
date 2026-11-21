import "server-only";
import { notFound } from "next/navigation";
import { CollectionView } from "@/components/store/collection-view";
import { catalog } from "@/lib/repositories";
import { collectionMetadata } from "@/lib/seo";

/** Occasion routes (/workwear, /evening…) are first-class SEO landing pages backed by a collection. */
export async function occasionMetadata(slug: string) {
  const c = await catalog.getCollectionBySlug(slug);
  return c ? collectionMetadata(c, `/${slug}`) : {};
}

export async function OccasionPage({ slug }: { slug: string }) {
  const c = await catalog.getCollectionBySlug(slug);
  if (!c || !c.occasionId) notFound();
  const [products, all] = await Promise.all([catalog.listProducts({ occasionIds: [c.occasionId] }), catalog.listCollections()]);
  const editorial = all.find((x) => x.occasionId && x.id !== c.id);
  return <CollectionView collection={c} products={products} path={`/${slug}`} editorial={editorial} hideFacets={["occasion"]} />;
}
