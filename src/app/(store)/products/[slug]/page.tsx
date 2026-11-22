import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/store/product/product-card";
import { toCard } from "@/components/store/product/card-data";
import { ProductPurchase } from "@/components/store/product/product-purchase";
import { RecentlyViewed } from "@/components/store/product/recently-viewed";
import { RailControls } from "@/components/store/home/rail-controls";
import { Accordion, Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { Emph } from "@/components/ui/typography";
import { catalog, commerce, content } from "@/lib/repositories";
import { breadcrumbJsonLd, productJsonLd, productMetadata } from "@/lib/seo";
import type { Product } from "@/types";

export async function generateStaticParams() {
  const products = await catalog.listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await catalog.getProductBySlug(slug);
  return p ? productMetadata(p) : { title: "Product not found", robots: { index: false } };
}

function Rail({ id, title, products }: { id: string; title: string; products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="pb-[clamp(64px,8vw,120px)]" aria-labelledby={`${id}-title`}>
      <div className="gutter mb-8 flex items-end justify-between">
        <h2 id={`${id}-title`} className="display text-[clamp(28px,3vw,44px)]"><Emph text={title} /></h2>
        {products.length > 4 && <RailControls target={id} />}
      </div>
      <ul id={id} className="no-scrollbar flex snap-x snap-mandatory scroll-px-[clamp(18px,3.4vw,56px)] gap-[clamp(8px,1.4vw,24px)] overflow-x-auto px-[clamp(18px,3.4vw,56px)]">
        {products.map((r) => <li key={r.id} className="w-[clamp(220px,23vw,340px)] shrink-0 snap-start"><ProductCard product={toCard(r)} sizes="(max-width:768px) 60vw, 23vw" /></li>)}
      </ul>
    </section>
  );
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await catalog.getProductBySlug(slug);
  if (!p) notFound();
  const [categories, all, cfg, guide] = await Promise.all([catalog.listCategories(), catalog.listProducts(), commerce.load(), content.sizeGuide(p.sizeGuideId ?? null)]);
  const category = categories.find((c) => c.id === p.categoryId) ?? { name: "Shop", slug: "" };
  const look = (p.completeTheLook ?? []).map((id) => all.find((x) => x.id === id)).filter((x): x is Product => !!x);
  const manual = (p.relatedIds ?? []).map((id) => all.find((x) => x.id === id)).filter((x): x is Product => !!x);
  const similar = manual.length ? manual : all
    .filter((x) => x.id !== p.id && !look.some((l) => l.id === x.id))
    .map((x) => ({ x, score: (x.categoryId === p.categoryId ? 2 : 0) + x.occasionIds.filter((o) => p.occasionIds.includes(o)).length }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || (b.x.stats?.unitsSold30d ?? 0) - (a.x.stats?.unitsSold30d ?? 0))
    .slice(0, 8)
    .map((s) => s.x);
  const madeToOrder = p.tags.includes("made-to-order") || p.categoryId === "cat-festive";
  const delivery = cfg.markets.map((m) => {
    const ms = cfg.shipping.filter((x) => x.marketId === m.id);
    if (!ms.length) return null;
    const min = Math.min(...ms.map((x) => x.estimatedDays[0])), max = Math.max(...ms.map((x) => x.estimatedDays[1]));
    return `${m.name}: ${min}–${max} working days${ms.some((x) => x.codAvailable) ? ", cash on delivery available" : ""}.`;
  }).filter(Boolean).join(" ");
  const catHref = category.slug ? `/shop/${category.slug}` : "/shop";

  return (
    <>
      <div className="gutter pt-5 pb-5"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: category.name, href: catHref }, { name: p.name }]} /></div>
      <section className="gutter pb-[clamp(64px,8vw,120px)]">
        <ProductPurchase product={p} categoryName={category.name} sizeGuide={guide ? { rows: guide.rows, notes: guide.notes ?? "" } : null}>
          <Accordion defaultOpen={-1} items={[
            { title: "Details & fit", content: <><ul className="list-disc space-y-1 pl-5">{p.details.map((d) => <li key={d}>{d}</li>)}</ul>{p.fit && <p className="mt-3">Fit: {p.fit}</p>}</> },
            { title: "Fabric & composition", content: <p>{p.fabric}</p> },
            { title: "Care", content: <ul className="list-disc space-y-1 pl-5">{p.care.map((c) => <li key={c}>{c}</li>)}</ul> },
            { title: "Delivery", content: <p>{delivery}{madeToOrder ? " Made-to-order pieces are dispatched once complete (4–10 weeks)." : ""} <Link href="/legal/shipping" className="underline">Delivery policy</Link></p> },
            { title: "Returns & exchanges", content: <p>{madeToOrder ? "Made-to-order and made-to-measure pieces cannot be returned, but our atelier will make complimentary alterations within 30 days of delivery." : "Return or exchange unworn pieces within 30 days. Returns are free within Pakistan; international returns are refunded to your original payment method once received."}</p> },
          ]} />
        </ProductPurchase>
      </section>
      <Rail id="look-rail" title="Complete the *look*" products={look} />
      <Rail id="similar-rail" title="You may also *like*" products={similar} />
      <RecentlyViewed excludeId={p.id} />
      <JsonLd data={productJsonLd(p, category.name)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: category.name, path: catHref }, { name: p.name, path: `/products/${p.slug}` }])} />
    </>
  );
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProductContent params={props.params} />
    </Suspense>
  );
}
