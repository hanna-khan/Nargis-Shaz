/**
 * next/image loader. Photography is served pre-sized, so `sizes` + srcset stay responsive without a
 * server-side optimizer (Hostinger runs no image service):
 *  - Studio uploads (R2 / local): WebP renditions …/media/<id>/w480|960|1600|2400.webp
 *  - Pexels sample photography:  ?auto=compress&cs=tinysrgb&w=
 */
const RENDITIONS = [480, 960, 1600, 2400];

export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const q = quality ?? 72;
  const m = src.match(/^(.*\/media\/[^/]+\/)w\d+\.webp$/);
  if (m) return `${m[1]}w${RENDITIONS.find((w) => w >= width) ?? 2400}.webp`;
  if (src.startsWith("https://images.pexels.com/")) return `${src}?auto=compress&cs=tinysrgb&fit=crop&w=${width}`;
  if (src.startsWith("https://images.unsplash.com/")) return `${src}?auto=format&fit=crop&q=${q}&w=${width}`;
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
