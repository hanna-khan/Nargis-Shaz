import Link from "next/link";
import { EditorialImage } from "@/components/media/editorial-image";
import { Price } from "../shop-context";
import { WishButton } from "./wish-button";
import type { Product } from "@/types";

/** Server-rendered product card with client islands for price (currency) and wishlist. */
export function ProductCard({ product: p, priority }: { product: Product; priority?: boolean }) {
  const main = p.colours[0].images[0];
  const alt = p.colours[0].images[2];
  const onSale = !!p.compareAtPrices;
  const soldOut = p.variants.every((v) => v.stock === 0);
  return (
    <article className="group relative">
      <Link href={`/products/${p.slug}`} className="zoom-on-hover block" aria-label={`${p.name}, ${p.subtitle}`}>
        <div className="relative aspect-[4/5] overflow-hidden">
          <EditorialImage image={main} className="absolute inset-0" priority={priority} sizes="(max-width:768px) 50vw, 25vw" />
          <EditorialImage image={alt} className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" sizes="(max-width:768px) 50vw, 25vw" />
          {(p.isNew || onSale || soldOut) && (
            <span className="absolute top-3.5 left-3.5 bg-paper px-2.5 py-1 text-[9.5px] tracking-[0.22em] uppercase">{soldOut ? "Sold out" : onSale ? "Reduced" : "New"}</span>
          )}
          <span className="absolute inset-x-3.5 bottom-3.5 translate-y-[130%] bg-paper/95 py-3 text-center text-[10.5px] tracking-[0.22em] uppercase transition-transform duration-700 ease-[var(--ease-editorial)] group-hover:translate-y-0 max-md:hidden">
            {p.sizes.length > 1 ? `${p.sizes.length} sizes · ${p.colours.length} colours` : "Discover"}
          </span>
        </div>
      </Link>
      <WishButton
        item={{ productId: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, image: main, prices: p.prices }}
        className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-paper/80 backdrop-blur-sm"
      />
      <div className="flex flex-col gap-1 pt-3.5 sm:flex-row sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-[20px] leading-tight font-normal"><Link href={`/products/${p.slug}`}>{p.name}</Link></h3>
          <p className="truncate text-[12.5px] text-charcoal/55">{p.subtitle}</p>
          <div className="mt-2 flex gap-1.5" aria-label={`Available in ${p.colours.map((c) => c.name).join(", ")}`}>
            {p.colours.map((c) => <span key={c.id} className="h-2.5 w-2.5 rounded-full border border-black/15" style={{ background: c.hex }} />)}
          </div>
        </div>
        <Price prices={p.prices} compareAt={p.compareAtPrices} className="text-[13.5px] whitespace-nowrap sm:pt-0.5" />
      </div>
    </article>
  );
}
