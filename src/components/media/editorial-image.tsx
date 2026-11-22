import Image from "next/image";
import { Monogram } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

/**
 * The single way photography is rendered. next/image with a CDN loader (responsive srcset,
 * lazy-loading below the fold, `priority` for above-the-fold LCP images).
 * Images without a photograph (e.g. a product just created in the studio) show a quiet
 * monogram placeholder instead of a fake image.
 */
export function EditorialImage({
  image, className, imgClassName, sizes = "(max-width: 768px) 100vw, 33vw", priority, position = "center",
}: { image?: ProductImage | null; className?: string; imgClassName?: string; sizes?: string; priority?: boolean; position?: string }) {
  // Callers may position the frame themselves (e.g. "absolute inset-0"); only default to relative.
  const pos = /\b(absolute|fixed|sticky)\b/.test(className ?? "") ? "" : "relative";
  if (!image?.src) {
    return (
      <div role="img" aria-label={image?.alt ?? "Photograph coming soon"} className={cn(pos, "grid place-items-center overflow-hidden bg-linen text-bronze/70", className)}>
        <Monogram className="h-12" title="" />
      </div>
    );
  }
  return (
    <div className={cn(pos, "overflow-hidden bg-stone/60", className)}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        className={cn("object-cover", imgClassName)}
        style={{ objectPosition: position }}
      />
    </div>
  );
}
