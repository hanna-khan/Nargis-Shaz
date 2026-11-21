import { ImageResponse } from "next/og";
import { catalog } from "@/lib/repositories";
import { garmentSvg } from "@/lib/media/art";
import { formatMoney } from "@/lib/commerce/currency";

export const alt = "Nargis & Shaz product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const products = await catalog.listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

/** Per-product social image. Phase 2: use the product's primary photograph instead of the illustration. */
export default async function ProductOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await catalog.getProductBySlug(slug);
  const art = p?.colours[0].images[0].art;
  const svg = art ? garmentSvg({ ...art }).replace(/<filter id="n[\s\S]*?<\/filter>/, "").replace(/<rect[^>]*filter="url\(#n[^"]*\)"[^>]*\/>/, "") : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F5F0E8" }}>
        {svg && <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={504} height={630} alt="" style={{ objectFit: "cover" }} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, color: "#292722" }}>
          <div style={{ fontSize: 22, letterSpacing: 8, textTransform: "uppercase", color: "#9A8069" }}>Nargis & Shaz</div>
          <div style={{ fontSize: 76, marginTop: 24, fontFamily: "serif", lineHeight: 1.05 }}>{p?.name ?? "Nargis & Shaz"}</div>
          <div style={{ fontSize: 30, marginTop: 18, color: "#655044" }}>{p?.subtitle}</div>
          {p && <div style={{ fontSize: 32, marginTop: 40 }}>{formatMoney(p.prices.PKR, "PKR")}</div>}
        </div>
      </div>
    ),
    size,
  );
}
