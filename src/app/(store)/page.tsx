import type { Metadata } from "next";
import { Hero } from "@/components/store/home/hero";
import { ArtOfDressing, Bestsellers, Campaign, CategoryCards, CollectionsSequence, Details, NewArrivals, StoryBand } from "@/components/store/home/sections";
import { Newsletter } from "@/components/store/newsletter";
import { toCard } from "@/components/store/product/card-data";
import { catalog } from "@/lib/repositories";
import { getHomepageView } from "@/lib/services/storefront";
import { ogImage, pageMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import { campaign } from "@/data/photography";

export const metadata: Metadata = {
  ...pageMetadata({ title: site.name, description: site.description, path: "/", image: ogImage(campaign.heroWide.src) }),
  title: { absolute: `${site.name} — Designer Label · Workwear, Dresses & Festive Clothing for Women` },
};

/** Every section reads from homepage content (Studio → Homepage content) and the catalogue. */
export default async function HomePage() {
  const [{ home, images, newArrivals, bestsellers }, collections] = await Promise.all([getHomepageView(), catalog.listCollections()]);
  const img = (id: string) => images[id] ?? null;
  const sequence = [
    ...collections.filter((c) => !c.occasionId),
    ...collections.filter((c) => c.occasionId === "evening" || c.occasionId === "everyday"),
  ].map((c) => ({ title: c.name, eyebrow: c.eyebrow, href: c.occasionId ? `/${c.occasionId}` : `/collections/${c.slug}`, image: c.hero, blurb: c.description }));

  return (
    <>
      <Hero content={home.hero} wide={img(home.hero.imageId) ?? campaign.heroWide} portrait={img(home.hero.mobileImageId) ?? campaign.heroPortrait} />
      <NewArrivals content={home.newArrivals} products={newArrivals.map(toCard)} />
      <CategoryCards cards={home.categoryCards.map((c) => ({ ...c, image: img(c.imageId) }))} />
      <Campaign content={home.campaign} images={home.campaign.imageIds.map(img)} />
      <Bestsellers content={home.bestsellers} products={bestsellers.map(toCard)} />
      <ArtOfDressing content={home.editorial} statement={home.statement.text} images={home.editorial.imageIds.map(img)} />
      <Details content={home.details} images={home.details.items.map((i) => img(i.imageId))} />
      <CollectionsSequence items={sequence} />
      <StoryBand content={home.story} image={img(home.story.imageId)} quote={home.quote} />
      <Newsletter />
    </>
  );
}
