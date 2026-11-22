import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CollectionView } from "@/components/store/collection-view";
import { catalog } from "@/lib/repositories";
import { pageMetadata, ogImage } from "@/lib/seo";

export async function generateStaticParams() {
  const [cats, products] = await Promise.all([catalog.listCategories(), catalog.listProducts()]);
  return cats.filter((c) => products.some((p) => p.categoryId === c.id)).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = await catalog.getCategoryBySlug(category);
  if (!c) return { title: "Category not found", robots: { index: false } };
  return pageMetadata({ title: `${c.name} for Women`, description: `${c.description} Shop ${c.name.toLowerCase()} by Nargis & Shaz — delivered across Pakistan and worldwide.`, path: `/shop/${c.slug}`, image: ogImage(c.image?.src) });
}

async function CategoryContent({ params, searchParams }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const c = await catalog.getCategoryBySlug(category);
  if (!c) notFound();
  const [categories, all] = await Promise.all([catalog.listCategories(), catalog.listProducts()]);
  if (!all.some((p) => p.categoryId === c.id || categories.some((x) => x.parentId === c.id && x.id === p.categoryId))) notFound();
  const siblings = [{ name: "All clothing", href: "/shop" }, ...categories.filter((x) => all.some((p) => p.categoryId === x.id)).map((x) => ({ name: x.name, href: `/shop/${x.slug}`, active: x.id === c.id }))];
  return (
    <CollectionView
      collection={{ name: c.name, eyebrow: "Shop women", headline: c.name, description: c.description }}
      scope={{ scopeCategoryIds: [c.id] }}
      searchParams={searchParams}
      path={`/shop/${c.slug}`}
      crumbs={[{ name: "Home", href: "/" }, { name: "Shop", href: "/shop" }, { name: c.name }]}
      siblings={siblings}
      hideCategory
    />
  );
}

export default function CategoryPage(props: PageProps<"/shop/[category]">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
