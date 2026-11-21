import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    // Remote photography is resized by its CDN (Pexels/Unsplash/Supabase Storage) — see the loader.
    loader: "custom",
    loaderFile: "./src/lib/media/image-loader.ts",
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
