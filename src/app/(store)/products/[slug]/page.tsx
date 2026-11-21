import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductRail } from "@/components/store/home/sections";
import { ProductCard } from "@/components/store/product/product-card";
import { ProductPurchase } from "@/components/store/product/product-purchase";
import { Accordion, Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { Container } from "@/components/ui/typography";
import { catalog } from "@/lib/repositories";
import { breadcrumbJsonLd, productJsonLd, productMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const products = await catalog.listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await catalog.getProductBySlug(slug);
  return p ? productMetadata(p) : { title: "Product not found", robots: { index: false } };
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await catalog.getProductBySlug(slug);
  if (!p || p.status !== "active") notFound();
  const [categories, all] = await Promise.all([catalog.listCategories(), catalog.listProducts()]);
  const category = categories.find((c) => c.id === p.categoryId)!;
  const related = all.filter((x) => x.id !== p.id && x.occasionIds.some((o) => p.occasionIds.includes(o)) && x.categoryId !== p.categoryId).slice(0, 6);

  return (
    <>
      <Container className="pt-6 pb-5"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: category.name, href: `/shop?category=${category.id}` }, { name: p.name }]} /></Container>
      <Container as="section" className="pb-20">
        <ProductPurchase product={p} categoryName={category.name}>
          <Accordion items={[
            { title: "Details & fit", content: <><ul className="list-disc space-y-1 pl-5">{p.details.map((d) => <li key={d}>{d}</li>)}</ul>{p.fit && <p className="mt-3">Fit: {p.fit}</p>}</> },
            { title: "Fabric & care", content: <><p>{p.fabric}</p><ul className="mt-3 list-disc space-y-1 pl-5">{p.care.map((c) => <li key={c}>{c}</li>)}</ul></> },
            { title: "Delivery & returns", content: <p>Delivery across Pakistan in 2–4 working days, with cash on delivery available. International orders ship tracked in 5–12 working days; UK and EU orders are delivered duties paid. Returns are free within 30 days in Pakistan.</p> },
          ]} />
          <div id="size-guide" className="sr-only">Size guide: XS (UK 6), S (UK 8), M (UK 10), L (UK 12), XL (UK 14), XXL (UK 16).</div>
        </ProductPurchase>
      </Container>
      {related.length > 0 && (
        <ProductRail id="related-rail" eyebrow="Wear it with" title="Complete the *look*" link={{ label: "Shop all", href: "/shop" }}>
          {related.map((r) => <li key={r.id}><ProductCard product={r} /></li>)}
        </ProductRail>
      )}
      <JsonLd data={productJsonLd(p, category.name)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: category.name, path: `/shop?category=${category.id}` }, { name: p.name, path: `/products/${p.slug}` }])} />
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
