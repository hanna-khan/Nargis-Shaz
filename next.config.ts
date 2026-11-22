import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const mediaHost = (() => { try { return process.env.R2_PUBLIC_BASE_URL ? new URL(process.env.R2_PUBLIC_BASE_URL).origin : ""; } catch { return ""; } })();

/**
 * Content-Security-Policy. Inline scripts are needed by Next.js streaming and JSON-LD (no nonce, so
 * pages stay cacheable); everything else is locked to this origin plus the image CDNs and Turnstile.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com ${mediaHost}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Hostinger runs `npm run build` then `npm start`; a standalone output keeps the deploy small.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["@node-rs/argon2", "sharp", "mysql2"],
  experimental: {
    // Studio image uploads (several photos per request, 12 MB each max — validated server-side).
    serverActions: { bodySizeLimit: "40mb" },
  },
  images: {
    // Photography is pre-sized (R2 renditions / Pexels CDN) — see the loader.
    loader: "custom",
    loaderFile: "./src/lib/media/image-loader.ts",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
      { source: "/account/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  async redirects() {
    // Short, memorable category URLs → canonical /shop/<category> pages.
    const short = ["dresses", "tops", "trousers", "skirts", "co-ords", "knitwear", "blazers-coats", "festive-sets"];
    return [
      { source: "/new-in", destination: "/new-arrivals", permanent: true },
      ...short.map((s) => ({ source: `/${s}`, destination: `/shop/${s}`, permanent: true })),
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
