import type { Metadata } from "next";
import { CollectionView } from "@/components/store/collection-view";
import { catalog } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Shop Women's Clothing",
  description: "Shop the Nargis & Shaz collection: dresses, poplin shirts, tailored trousers, skirts, suits, knitwear, blazers, coats and festive sets. Delivered across Pakistan and worldwide.",
  path: "/shop",
});

export default async function ShopPage(props: PageProps<"/shop">) {
  const [products, collections, categories] = await Promise.all([catalog.listProducts(), catalog.listCollections(), catalog.listCategories()]);
  const siblings = [{ name: "All clothing", href: "/shop", active: true }, ...categories.filter((c) => products.some((p) => p.categoryId === c.id)).map((c) => ({ name: c.name, href: `/shop/${c.slug}` }))];
  return (
    <CollectionView
      collection={{ name: "Shop women", eyebrow: "The collection", headline: "Everything, *considered*", description: "Tailoring, dresses, knitwear and festive pieces — designed in Lahore to be worn for years." }}
      scope={{}}
      searchParams={props.searchParams}
      path="/shop"
      editorial={collections.find((c) => c.seasonal) ?? collections.find((c) => !c.occasionId)}
      siblings={siblings}
    />
  );
}
