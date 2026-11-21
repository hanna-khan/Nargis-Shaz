import Image from "next/image";
import { garmentSvg } from "@/lib/media/art";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

/**
 * Renders a product/campaign image. Uses next/image when a photograph exists,
 * otherwise the art-directed illustration. Always carries descriptive alt text.
 */
export function EditorialImage({ image, className, sizes = "(max-width: 768px) 100vw, 33vw", priority }: { image: ProductImage; className?: string; sizes?: string; priority?: boolean }) {
  if (image.src) {
    return (
      <div className={cn("art relative overflow-hidden bg-beige", className)}>
        <Image src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  const svg = image.art ? garmentSvg(image.art) : "";
  return <div role="img" aria-label={image.alt} className={cn("art relative overflow-hidden bg-beige", className)} dangerouslySetInnerHTML={{ __html: svg }} />;
}
