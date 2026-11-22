import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import sharp from "sharp";
import { AppError } from "../lib/core";

/**
 * Media storage. Uploads are validated (MIME sniffed from the bytes, size and pixel limits), stripped
 * of EXIF/GPS metadata, auto-rotated and saved as WebP renditions (480/960/1600/2400 px wide).
 * Binaries never go into MySQL — only the metadata row (media_assets).
 *
 *  MEDIA_DRIVER=r2     Cloudflare R2 (production) — R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 *  MEDIA_DRIVER=local  public/uploads (development only — not persistent on Hostinger redeploys)
 */
export const RENDITIONS = [480, 960, 1600, 2400] as const;
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "heif"]);

export function mediaDriver(): "r2" | "local" {
  const d = process.env.MEDIA_DRIVER;
  if (d === "r2") return "r2";
  if (process.env.NODE_ENV === "production" && d !== "local") return "r2";
  return "local";
}

export function r2Missing() {
  return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"].filter((k) => !process.env[k]);
}

let client: AwsClient | null = null;
const r2 = () => (client ??= new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: "s3", region: "auto" }));
const r2Url = (key: string) => `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;

async function put(key: string, body: Buffer, contentType: string) {
  if (mediaDriver() === "r2") {
    const missing = r2Missing();
    if (missing.length) throw new AppError(`Media storage isn't configured (missing ${missing.join(", ")}).`);
    const res = await r2().fetch(r2Url(key), { method: "PUT", body: new Uint8Array(body), headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
    if (!res.ok) throw new AppError(`Upload to storage failed (${res.status}).`);
    return `${process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`;
  }
  const file = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return `/uploads/${key}`;
}

export interface StoredImage { storageKey: string; url: string; width: number; height: number; bytes: number; checksum: string; mimeType: string; driver: "r2" | "local" }

/** Validates and stores an uploaded image. `id` is the media asset id (used as the storage prefix). */
export async function storeImage(id: string, file: File): Promise<StoredImage> {
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError(`${file.name} is larger than 12 MB.`);
  if (file.size < 100) throw new AppError(`${file.name} is empty.`);
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new AppError(`${file.name} isn't a valid image.`);
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new AppError(`${file.name}: only JPEG, PNG, WebP or AVIF images are accepted.`);
  if (!meta.width || !meta.height || meta.width < 300 || meta.height < 300) throw new AppError(`${file.name} is too small (minimum 300 × 300 px).`);

  const checksum = createHash("sha256").update(input).digest("hex");
  const base = `media/${id}`;
  let largest: { width: number; height: number; bytes: number; url: string } | null = null;
  const widths = RENDITIONS; // every rendition exists (smaller originals are not enlarged)
  for (const w of widths) {
    const { data, info } = await sharp(input).rotate().resize({ width: Math.min(w, meta.width!), withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const url = await put(`${base}/w${w}.webp`, data, "image/webp");
    largest = { width: info.width, height: info.height, bytes: info.size, url };
  }
  return { storageKey: base, url: largest!.url, width: largest!.width, height: largest!.height, bytes: largest!.bytes, checksum, mimeType: "image/webp", driver: mediaDriver() };
}

export async function deleteStored(driver: string, storageKey: string | null) {
  if (!storageKey) return;
  if (driver === "r2") {
    if (r2Missing().length) return;
    await Promise.all(RENDITIONS.map((w) => r2().fetch(r2Url(`${storageKey}/w${w}.webp`), { method: "DELETE" }).catch(() => null)));
  } else if (driver === "local") {
    await rm(path.join(process.cwd(), "public", "uploads", storageKey), { recursive: true, force: true });
  }
}
