import type { Metadata } from "next";
import { Hero } from "@/components/store/home/hero";
import { CategoryTiles, OccasionArches, ProductRail, Quote, Services, SplitFeature, Statement, StoryBand } from "@/components/store/home/sections";
import { ProductCard } from "@/components/store/product/product-card";
import { Newsletter } from "@/components/store/newsletter";
import { catalog, content } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import type { Product } from "@/types";

export const metadata: Metadata = {
  ...pageMetadata({ title: `${site.name} — Considered women's clothing`, description: site.description, path: "/" }),
  title: { absolute: `${site.name} — Workwear, Everyday, Evening & Festive Clothing for Women` },
};

const img = (p: Product | undefined, colour = 0, view = 0) => p!.colours[colour].images[view];

export default async function HomePage() {
  const [home, products, collections, categories] = await Promise.all([content.getHomepage(), catalog.listProducts({ sort: "newest" }), catalog.listCollections(), catalog.listCategories()]);
  const bySlug = (s: string) => products.find((p) => p.slug === s);
  const col = (slug: string) => collections.find((c) => c.slug === slug)!;
  const catHref = (slug: string) => `/shop?category=${categories.find((c) => c.slug === slug)?.id}`;

  const tiles = [
    { label: "New in", href: "/new-arrivals", image: img(bySlug("noor-midi-dress")) },
    { label: "Tops", href: catHref("tops"), image: img(bySlug("aaliya-silk-blouse")) },
    { label: "Knitwear", href: catHref("knitwear"), image: img(bySlug("sahar-cashmere-crew"), 1) },
    { label: "Trousers", href: catHref("trousers"), image: img(bySlug("mehr-wide-leg-trousers")) },
    { label: "Coats", href: catHref("outerwear"), image: img(bySlug("zainab-wrap-coat")) },
    { label: "Kurtas", href: catHref("kurtas"), image: img(bySlug("jashn-kurta")) },
    { label: "Bags", href: catHref("bags"), image: img(bySlug("amal-leather-pouch")) },
    { label: "Shoes", href: catHref("shoes"), image: img(bySlug("sitara-mary-janes")) },
    { label: "Jewellery", href: catHref("jewellery"), image: img(bySlug("roshni-pendant-necklace")) },
    { label: "Festive", href: "/festive", image: img(bySlug("gul-embroidered-dress")) },
  ];
  const arrivals = products.filter((p) => p.isNew).slice(0, 8);
  const featured = home.featuredCollectionIds.map((id) => collections.find((c) => c.id === id)!).filter(Boolean);

  return (
    <>
      <Hero content={home.hero} frames={[img(bySlug("zainab-wrap-coat")), img(bySlug("noor-midi-dress"))]} />
      <CategoryTiles tiles={tiles} />
      <Statement eyebrow={home.statement.eyebrow} text={home.statement.text} link={{ label: "Read our story", href: "/our-story" }} />
      <ProductRail id="new-arrivals-rail" eyebrow="Just arrived" title="New *arrivals*" link={{ label: "Shop all", href: "/new-arrivals" }}>
        {arrivals.map((p, i) => <li key={p.id}><ProductCard product={p} priority={i < 2} /></li>)}
      </ProductRail>
      <SplitFeature collection={col("workwear")} tint cta="Shop the working edit" />
      <OccasionArches items={featured} />
      <SplitFeature collection={col("festive")} reverse cta="Discover Jashn" />
      <StoryBand {...home.story} image={img(bySlug("aaliya-silk-blouse"), 0, 2)} />
      <Quote {...home.quote} />
      <Services items={[
        { title: "Delivered worldwide", text: "Duties paid to the UK & EU" },
        { title: "Cash on delivery", text: "Across Pakistan" },
        { title: "30-day returns", text: "Free in Pakistan" },
        { title: "Personal styling", text: "Complimentary, by appointment" },
      ]} />
      <Newsletter />
    </>
  );
}
