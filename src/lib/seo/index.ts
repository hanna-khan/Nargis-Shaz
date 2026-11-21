import type { Metadata } from "next";
import { site } from "@/config/site";
import type { Collection, Product } from "@/types";
import { stripEmphasis } from "@/lib/utils";

export const absoluteUrl = (path = "/") => new URL(path, site.url).toString();

/** Consistent metadata for every public page: title, description, canonical, OG, Twitter. */
export function pageMetadata(args: { title: string; description: string; path: string; image?: string; noIndex?: boolean; type?: "website" | "article" }): Metadata {
  // Images come from file-based `opengraph-image` routes (root + per product) unless overridden.
  const images = args.image ? [{ url: args.image, width: 1200, height: 630, alt: args.title }] : undefined;
  return {
    title: args.title,
    description: args.description,
    alternates: { canonical: args.path },
    openGraph: { title: `${args.title} | ${site.name}`, description: args.description, url: args.path, siteName: site.name, type: args.type ?? "website", locale: site.locale, ...(images && { images }) },
    twitter: { card: "summary_large_image", title: `${args.title} | ${site.name}`, description: args.description, site: site.twitter, ...(images && { images: images.map((i) => i.url) }) },
    robots: args.noIndex ? { index: false, follow: false } : undefined,
  };
}

export function productMetadata(p: Product): Metadata {
  return pageMetadata({
    title: p.seo?.title ?? `${p.name} — ${p.subtitle}`,
    description: p.seo?.description ?? `${p.description.slice(0, 140).trimEnd()}… ${p.fabric}. Rs ${(p.prices.PKR / 100).toLocaleString("en-PK")}.`,
    path: `/products/${p.slug}`,
  });
}

export function collectionMetadata(c: Collection, path: string): Metadata {
  return pageMetadata({ title: c.seo?.title ?? c.name, description: c.seo?.description ?? c.description, path });
}

/* ---------------- JSON-LD ---------------- */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: absoluteUrl("/icon.svg"),
    email: site.email,
    telephone: site.phone,
    sameAs: [site.instagram],
    address: { "@type": "PostalAddress", streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postalCode, addressCountry: site.address.country },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    potentialAction: { "@type": "SearchAction", target: `${site.url}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function productJsonLd(p: Product, categoryName: string) {
  const inStock = p.variants.some((v) => v.stock > 0);
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: p.name,
    description: p.description,
    url: absoluteUrl(`/products/${p.slug}`),
    brand: { "@type": "Brand", name: site.name },
    category: categoryName,
    material: p.fabric,
    productGroupID: p.id,
    variesBy: ["https://schema.org/color", "https://schema.org/size"],
    image: p.colours[0].images.filter((i) => i.src).map((i) => absoluteUrl(i.src!)).concat(absoluteUrl("/opengraph-image")).slice(0, 4),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PKR",
      lowPrice: (p.prices.PKR / 100).toFixed(0),
      highPrice: (p.prices.PKR / 100).toFixed(0),
      offerCount: p.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    hasVariant: p.variants.slice(0, 24).map((v) => {
      const colour = p.colours.find((c) => c.id === v.colourId)!;
      return {
        "@type": "Product",
        sku: v.sku,
        name: `${p.name} — ${colour.name}, ${v.size}`,
        color: colour.name,
        size: v.size,
        offers: { "@type": "Offer", price: ((v.prices ?? p.prices).PKR / 100).toFixed(0), priceCurrency: "PKR", availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: absoluteUrl(`/products/${p.slug}`) },
      };
    }),
  };
}

export const headlineText = stripEmphasis;
