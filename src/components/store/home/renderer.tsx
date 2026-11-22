import { Fragment } from "react";
import { catalog, content } from "@/lib/repositories";
import { collectionHref } from "@/lib/services/storefront";
import type { SectionData } from "@/server/cms/homepage";
import { Newsletter } from "../newsletter";
import { toCard } from "../product/card-data";
import { Hero } from "./hero";
import { ArtOfDressing, Bestsellers, Campaign, CategoryCards, CollectionsSequence, Details, NewArrivals, PromoBanner, QuoteBand, StatementBand, StoryBand } from "./sections";
import type { Product, ProductImage } from "@/types";

async function productsFor(sec: SectionData, all: Product[]): Promise<Product[]> {
  const limit = Math.min(Math.max(Number(sec.settings.limit ?? 8), 1), 24);
  const src = sec.settings.source ?? "new";
  let list: Product[];
  if (src === "manual") list = await catalog.getProductsByIds(((sec.settings.productIds as string[] | undefined) ?? sec.items.map((i) => i.productId).filter((x): x is string => !!x)));
  else if (src === "featured") list = all.filter((p) => p.isFeatured);
  else if (src === "collection") list = all.filter((p) => sec.settings.collectionId && p.collectionIds.includes(String(sec.settings.collectionId)));
  else if (src === "bestsellers") list = [...all].sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller) || (b.stats?.unitsSold30d ?? 0) - (a.stats?.unitsSold30d ?? 0));
  else list = [...all.filter((p) => p.isNew), ...[...all.filter((p) => !p.isNew)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))];
  return list.slice(0, limit);
}

/**
 * Renders homepage sections (published snapshot, or the draft in Studio preview) in their saved
 * order. Statement + editorial and story + quote pairs keep their combined editorial layouts.
 */
export async function HomeSections({ sections }: { sections: SectionData[] }) {
  const visible = sections.filter((x) => x.enabled);
  const mediaIds = visible.flatMap((x) => [x.imageId, x.mobileImageId, ...x.items.map((i) => i.imageId)]).filter((x): x is string => !!x);
  const [media, products, collections] = await Promise.all([content.media([...new Set(mediaIds)]), catalog.listProducts(), catalog.listCollections()]);
  const img = (id: string | null | undefined): ProductImage | null => (id ? media[id] ?? null : null);
  const out: React.ReactNode[] = [];

  for (let i = 0; i < visible.length; i++) {
    const sec = visible[i];
    const next = visible[i + 1];
    const cta = sec.primary;
    switch (sec.type) {
      case "hero": {
        const wide = img(sec.imageId) ?? img(sec.mobileImageId);
        if (!wide) break;
        out.push(<Hero key={sec.id} content={{ eyebrow: sec.eyebrow, headline: sec.heading, body: sec.body, primaryCta: sec.primary, secondaryCta: sec.secondary }} wide={wide} portrait={img(sec.mobileImageId) ?? wide} />);
        break;
      }
      case "products": {
        const list = (await productsFor(sec, products)).map(toCard);
        if (!list.length) break;
        out.push(sec.settings.layout === "rail"
          ? <Bestsellers key={sec.id} id={sec.id} content={{ eyebrow: sec.eyebrow, title: sec.heading }} products={list} link={cta} />
          : <NewArrivals key={sec.id} id={`${sec.id}-t`} content={{ eyebrow: sec.eyebrow, title: sec.heading }} products={list} link={cta} />);
        break;
      }
      case "category_cards":
        if (sec.items.length) out.push(<CategoryCards key={sec.id} eyebrow={sec.eyebrow} title={sec.heading} cards={sec.items.map((it) => ({ title: it.title, href: it.href ?? "/shop", image: img(it.imageId) }))} />);
        break;
      case "campaign":
        out.push(<Campaign key={sec.id} content={{ eyebrow: sec.eyebrow, headline: sec.heading, body: sec.body, cta }} images={[img(sec.imageId), ...sec.items.map((it) => img(it.imageId))]} />);
        break;
      case "statement":
        if (next?.type === "editorial") break; // rendered inside the editorial composition
        out.push(<StatementBand key={sec.id} eyebrow={sec.eyebrow} text={sec.body} />);
        break;
      case "editorial": {
        const prev = visible[i - 1];
        out.push(<ArtOfDressing key={sec.id} content={{ eyebrow: sec.eyebrow, headline: sec.heading, body: sec.body, cta }} statement={prev?.type === "statement" ? prev.body : undefined} images={sec.items.map((it) => img(it.imageId))} />);
        break;
      }
      case "details":
        if (sec.items.length) out.push(<Details key={sec.id} content={{ eyebrow: sec.eyebrow, headline: sec.heading, items: sec.items.map((it) => ({ title: it.title, body: it.body, imageId: it.imageId ?? "" })) }} images={sec.items.map((it) => img(it.imageId))} />);
        break;
      case "collections": {
        const picked = sec.items.length ? sec.items.map((it) => collections.find((c) => c.id === it.collectionId)).filter((c) => !!c) : collections;
        const items = picked.map((c) => ({ title: c.name, eyebrow: c.eyebrow, href: collectionHref(c), image: c.hero, blurb: c.description }));
        if (items.length) out.push(<CollectionsSequence key={sec.id} items={items} eyebrow={sec.eyebrow || undefined} title={sec.heading || undefined} />);
        break;
      }
      case "story": {
        const q = next?.type === "quote" ? { text: next.body, attribution: next.eyebrow } : null;
        out.push(<StoryBand key={sec.id} content={{ eyebrow: sec.eyebrow, headline: sec.heading, body: sec.body, imageId: sec.imageId ?? "" }} image={img(sec.imageId)} quote={q} cta={cta} />);
        if (q) i++;
        break;
      }
      case "quote":
        out.push(<QuoteBand key={sec.id} text={sec.body} attribution={sec.eyebrow} />);
        break;
      case "newsletter":
        out.push(<Newsletter key={sec.id} eyebrow={sec.eyebrow || undefined} heading={sec.heading || undefined} body={sec.body || undefined} />);
        break;
      case "promo":
        out.push(<PromoBanner key={sec.id} eyebrow={sec.eyebrow} heading={sec.heading} body={sec.body} cta={cta} image={img(sec.imageId)} />);
        break;
    }
  }
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}
