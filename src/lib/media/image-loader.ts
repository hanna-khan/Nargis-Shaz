/**
 * next/image loader. Photography is served by its CDN at the exact width requested,
 * so `sizes` + srcset stay fully responsive without a server-side image optimizer.
 *  - Pexels:   ?auto=compress&cs=tinysrgb&w=
 *  - Unsplash: imgix params
 *  - Supabase Storage (Phase 2): /render/image transformation endpoint
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const q = quality ?? 72;
  if (src.startsWith("https://images.pexels.com/")) return `${src}?auto=compress&cs=tinysrgb&fit=crop&w=${width}`;
  if (src.startsWith("https://images.unsplash.com/")) return `${src}?auto=format&fit=crop&q=${q}&w=${width}`;
  if (src.includes(".supabase.co/storage/v1/object/public/")) return `${src.replace("/object/public/", "/render/image/public/")}?width=${width}&quality=${q}`;
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
