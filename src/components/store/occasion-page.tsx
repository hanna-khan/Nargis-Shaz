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
  const editorial = all.find((x) => !x.occasionId && x.status === "published" && products.some((p) => p.collectionIds.includes(x.id)));
  const siblings = all.filter((x) => x.occasionId).map((x) => ({ name: x.name, href: `/${x.occasionId}`, active: x.id === c.id }));
  return <CollectionView collection={c} products={products} path={`/${slug}`} editorial={editorial} siblings={siblings} />;
}
