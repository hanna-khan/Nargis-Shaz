import type { Category, Collection, GarmentKind, OccasionId, PriceSet, Product, ProductColour, SceneTone } from "@/types";
import { prices, seeded } from "./helpers";

/* ---------------- Categories ---------------- */

export const categoryData: Category[] = [
  { id: "cat-tops", slug: "tops", name: "Tops & Shirts", description: "Fluid blouses, crisp shirts and satin tops.", sortOrder: 1 },
  { id: "cat-dresses", slug: "dresses", name: "Dresses", description: "Midi, shirt and embroidered dresses.", sortOrder: 2 },
  { id: "cat-kurtas", slug: "kurtas", name: "Kurtas & Co-ords", description: "Modern kurtas and matching sets.", sortOrder: 3 },
  { id: "cat-knitwear", slug: "knitwear", name: "Knitwear", description: "Cashmere, merino and ribbed knits.", sortOrder: 4 },
  { id: "cat-trousers", slug: "trousers", name: "Trousers", description: "Wide-leg, tailored and satin trousers.", sortOrder: 5 },
  { id: "cat-outerwear", slug: "outerwear", name: "Coats & Jackets", description: "Wrap coats, trenches and jackets.", sortOrder: 6 },
  { id: "cat-bags", slug: "bags", name: "Bags", description: "Leather pouches and totes.", sortOrder: 7 },
  { id: "cat-shoes", slug: "shoes", name: "Shoes", description: "Mary Janes, flats and heels.", sortOrder: 8 },
  { id: "cat-jewellery", slug: "jewellery", name: "Jewellery", description: "Gold-plated pieces, finished by hand.", sortOrder: 9 },
  { id: "cat-scarves", slug: "scarves", name: "Scarves & Dupattas", description: "Silk scarves and organza dupattas.", sortOrder: 10 },
];

/* ---------------- Colours (named, reused across products) ---------------- */

const HEX: Record<string, string> = {
  Ivory: "#F3EADB", Cream: "#EFE2CC", Sand: "#D4BC98", Camel: "#B98B5E", Terracotta: "#A4553A",
  Cocoa: "#5A4130", Sage: "#8B8A68", Ink: "#2A2420", Blush: "#E3C2B3", Midnight: "#2F3A4A",
  Burgundy: "#6E2B34", Olive: "#6B6B45", Gold: "#C79A4B", Emerald: "#2F5A4B", Rose: "#C9847E",
  Champagne: "#D9C3A0", Oatmeal: "#D8C8AE", Marigold: "#C98F35",
};

/* ---------------- Products ---------------- */

interface Spec {
  slug: string;
  name: string;
  subtitle: string;
  kind: GarmentKind;
  category: string;
  occasions: OccasionId[];
  collections?: string[];
  price: PriceSet;
  compareAt?: PriceSet;
  colours: [string, SceneTone][];
  sizes?: string[];
  fabric: string;
  description: string;
  details: string[];
  care?: string[];
  fit?: string;
  isNew?: boolean;
  accent?: boolean;
  tags?: string[];
  createdAt: string;
}

const APPAREL = ["XS", "S", "M", "L", "XL", "XXL"];
const SHOES = ["36", "37", "38", "39", "40", "41"];
const ONE = ["One size"];

const specs: Spec[] = [
  {
    slug: "noor-midi-dress", name: "The Noor Dress", subtitle: "Tencel twill midi dress", kind: "dress", category: "cat-dresses",
    occasions: ["workwear", "evening"], collections: ["col-aw26"], price: prices(18500, 159, 129, 149),
    colours: [["Terracotta", "oat"], ["Ivory", "clay"], ["Emerald", "blush"]], fabric: "100% Tencel™ lyocell twill",
    description: "A softly fitted midi with a V neckline, gathered sleeves and a skirt that moves when you do. Designed to take you from a nine o'clock meeting to dinner without a change.",
    details: ["Midi length, falls below the knee", "Concealed side zip", "Lined bodice", "Model is 5'8\" and wears size S"], fit: "True to size", isNew: true, createdAt: "2026-10-28",
  },
  {
    slug: "aaliya-silk-blouse", name: "The Aaliya Blouse", subtitle: "Washed silk blouse", kind: "blouse", category: "cat-tops",
    occasions: ["workwear", "everyday"], collections: ["col-aw26"], price: prices(9800, 89, 72, 82),
    colours: [["Cream", "clay"], ["Blush", "cocoa"], ["Ink", "camel"]], fabric: "Washed silk blend (70% silk, 30% viscose)",
    description: "Fluid sleeves, a gently scooped neckline and mother-of-pearl buttons. The shirt we reach for every single week.",
    details: ["Relaxed fit", "Mother-of-pearl buttons", "Single-needle seams"], fit: "Relaxed — take your usual size", isNew: true, createdAt: "2026-11-02",
  },
  {
    slug: "mehr-wide-leg-trousers", name: "Mehr Wide-Leg Trousers", subtitle: "High-waisted crepe trousers", kind: "trousers", category: "cat-trousers",
    occasions: ["workwear", "evening"], price: prices(11500, 109, 89, 99),
    colours: [["Sand", "cocoa"], ["Cocoa", "oat"], ["Ink", "blush"]], fabric: "Crepe, 96% recycled polyester, 4% elastane",
    description: "High-waisted with a long, clean line and a drape that skims rather than clings. Tailored enough for the boardroom, easy enough for Sundays.",
    details: ["High waist, wide leg", "Side pockets", "Hook and bar closure", "Inseam 82 cm"], fit: "True to size", createdAt: "2026-08-14",
  },
  {
    slug: "sahar-cashmere-crew", name: "Sahar Cashmere Crew", subtitle: "Pure cashmere jumper", kind: "knit", category: "cat-knitwear",
    occasions: ["everyday", "workwear"], collections: ["col-aw26", "col-gifts"], price: prices(21500, 189, 155, 175),
    colours: [["Oatmeal", "clay"], ["Sage", "blush"], ["Burgundy", "oat"]], fabric: "100% Grade-A cashmere, responsibly sourced",
    description: "Weightless, warm and made to be lived in. A ribbed hem and a slightly dropped shoulder give it an easy, lasting shape.",
    details: ["Regular fit", "Ribbed neck, cuffs and hem", "12-gauge knit"], care: ["Hand wash cold", "Dry flat", "Store folded"], isNew: true, createdAt: "2026-10-20",
  },
  {
    slug: "zainab-wrap-coat", name: "Zainab Wrap Coat", subtitle: "Wool & cashmere wrap coat", kind: "coat", category: "cat-outerwear",
    occasions: ["workwear", "evening", "everyday"], collections: ["col-aw26"], price: prices(34500, 345, 279, 319),
    colours: [["Camel", "night"], ["Ivory", "cocoa"], ["Ink", "oat"]], fabric: "80% wool, 20% cashmere",
    description: "A long, enveloping wrap coat with a soft shawl lapel and a belt that cinches at the waist. A piece to keep for years.",
    details: ["Falls mid-calf", "Self-tie belt", "Two in-seam pockets", "Fully lined in cupro"], care: ["Dry clean only"], isNew: true, createdAt: "2026-10-12",
  },
  {
    slug: "layla-silk-scarf", name: "Layla Silk Scarf", subtitle: "Printed mulberry silk", kind: "scarf", category: "cat-scarves",
    occasions: ["everyday", "workwear", "evening"], collections: ["col-gifts"], price: prices(6500, 69, 55, 62), sizes: ONE,
    colours: [["Marigold", "night"], ["Rose", "sage"], ["Midnight", "blush"]], fabric: "100% mulberry silk twill",
    description: "Hand-rolled edges and a print drawn from old textile archives. Wear it at the neck, in your hair or tied to your bag.",
    details: ["90 × 90 cm", "Hand-rolled edges"], care: ["Dry clean only"], createdAt: "2026-07-03",
  },
  {
    slug: "amal-leather-pouch", name: "Amal Leather Pouch", subtitle: "Soft structured pouch", kind: "bag", category: "cat-bags",
    occasions: ["everyday", "evening", "workwear"], collections: ["col-gifts"], price: prices(19800, 189, 155, 175), sizes: ONE,
    colours: [["Cocoa", "oat"], ["Burgundy", "blush"], ["Sand", "cocoa"]], fabric: "Vegetable-tanned calf leather, suede lining",
    description: "A soft, structured pouch with a rolled handle and a gold clasp. Large enough for the day, small enough to forget about.",
    details: ["24 × 20 × 9 cm", "Handle drop 12 cm", "Magnetic clasp"], care: ["Wipe with a soft dry cloth", "Store in dust bag"], createdAt: "2026-06-18",
  },
  {
    slug: "sitara-mary-janes", name: "Sitara Mary Janes", subtitle: "Block-heel leather Mary Janes", kind: "shoes", category: "cat-shoes",
    occasions: ["workwear", "evening"], price: prices(15900, 159, 129, 149), sizes: SHOES,
    colours: [["Burgundy", "blush"], ["Ink", "camel"], ["Cream", "clay"]], fabric: "Italian calf leather, leather sole with rubber insert",
    description: "A low block heel and a sweeping strap, cushioned for long days on your feet.",
    details: ["Heel 4.5 cm", "Padded footbed", "Adjustable buckle"], fit: "True to size. Half sizes take the size up.", createdAt: "2026-09-01",
  },
  {
    slug: "nilofer-satin-shirt", name: "Nilofer Satin Shirt", subtitle: "Fluid satin crepe shirt", kind: "blouse", category: "cat-tops",
    occasions: ["evening", "workwear"], price: prices(10900, 99, 79, 92), compareAt: prices(13500, 125, 99, 115),
    colours: [["Champagne", "night"], ["Emerald", "oat"], ["Rose", "sage"]], fabric: "Satin crepe, 100% recycled polyester",
    description: "Fluid satin with a soft liquid sheen. Wear it tucked into tailoring or open over a slip dress.",
    details: ["Relaxed fit", "Concealed placket", "Rounded hem"], createdAt: "2026-05-22",
  },
  {
    slug: "gul-embroidered-dress", name: "Gul Embroidered Dress", subtitle: "Hand-finished zari embroidery", kind: "dress", category: "cat-dresses",
    occasions: ["festive", "evening"], collections: ["col-jashn"], price: prices(32000, 299, 245, 279), accent: true,
    colours: [["Midnight", "camel"], ["Burgundy", "oat"], ["Ivory", "night"]], fabric: "Cotton-silk with gold zari thread",
    description: "Hand-finished gold embroidery travels from the neckline to the waist. Made for weddings, Eid mornings and every evening worth remembering.",
    details: ["Midi length", "Embroidery finished by artisans in Lahore", "Fully lined", "Concealed back zip"], care: ["Dry clean only"], isNew: true, createdAt: "2026-11-08",
  },
  {
    slug: "jashn-kurta", name: "Jashn Kurta", subtitle: "Cotton voile kurta with gota trim", kind: "kurta", category: "cat-kurtas",
    occasions: ["festive", "everyday"], collections: ["col-jashn"], price: prices(12500, 119, 95, 109), accent: true,
    colours: [["Rose", "sage"], ["Cream", "clay"], ["Emerald", "blush"]], fabric: "Cotton voile with gold gota trim",
    description: "A modern kurta cut shorter and lighter, with gota trim along the neckline. Pair with straight trousers or a sweeping gharara.",
    details: ["Hip length", "Side slits", "Half-lined"], isNew: true, createdAt: "2026-11-05",
  },
  {
    slug: "chandni-satin-trousers", name: "Chandni Satin Trousers", subtitle: "Floor-skimming satin", kind: "trousers", category: "cat-trousers",
    occasions: ["festive", "evening"], collections: ["col-jashn"], price: prices(12900, 119, 95, 109),
    colours: [["Ivory", "clay"], ["Champagne", "night"], ["Burgundy", "oat"]], fabric: "Heavy duchess satin",
    description: "Wide, floor-skimming satin that catches the light as you walk. The quiet centrepiece of a festive wardrobe.",
    details: ["High waist", "Concealed side zip", "Full length"], createdAt: "2026-09-26",
  },
  {
    slug: "roshni-pendant-necklace", name: "Roshni Pendant Necklace", subtitle: "Gold-plated sculpted pendant", kind: "jewelry", category: "cat-jewellery",
    occasions: ["festive", "evening", "everyday"], collections: ["col-gifts", "col-jashn"], price: prices(7900, 79, 65, 72), sizes: ONE,
    colours: [["Gold", "night"], ["Gold", "blush"]], fabric: "18k gold-plated brass",
    description: "A hand-finished pendant on a fine chain. Light enough for every day, bold enough for the night.",
    details: ["Chain 42 cm + 6 cm extender", "Nickel-free", "Arrives in a keepsake pouch"], isNew: true, createdAt: "2026-11-01",
  },
  {
    slug: "dena-ribbed-pullover", name: "Dena Ribbed Pullover", subtitle: "Fine-gauge merino rib", kind: "knit", category: "cat-knitwear",
    occasions: ["everyday", "workwear"], price: prices(12900, 125, 99, 115),
    colours: [["Blush", "cocoa"], ["Cocoa", "oat"], ["Cream", "sage"]], fabric: "70% merino wool, 30% recycled polyamide",
    description: "A fine-gauge ribbed knit with a close fit and a long hem. Layers beautifully under a coat.",
    details: ["Slim fit", "Long ribbed hem"], care: ["Machine wash on wool cycle", "Dry flat"], createdAt: "2026-08-30",
  },
  {
    slug: "parveen-trench-coat", name: "Parveen Trench", subtitle: "Water-repellent gabardine trench", kind: "coat", category: "cat-outerwear",
    occasions: ["workwear", "everyday"], price: prices(28500, 279, 229, 259),
    colours: [["Sand", "clay"], ["Olive", "blush"]], fabric: "Water-repellent cotton gabardine",
    description: "Our trench, reworked: a softer shoulder, a deeper belt and a length that looks right over trousers or a dress.",
    details: ["Water repellent", "Belted with storm flap", "Fully lined"], createdAt: "2026-07-21",
  },
  {
    slug: "ayesha-shirt-dress", name: "Ayesha Shirt Dress", subtitle: "Organic cotton poplin", kind: "dress", category: "cat-dresses",
    occasions: ["workwear", "everyday"], price: prices(14500, 135, 109, 125),
    colours: [["Sage", "blush"], ["Cream", "clay"]], fabric: "100% organic cotton poplin",
    description: "A crisp, belted shirt dress that works as hard as you do. Roll the sleeves for summer, layer with a knit for winter.",
    details: ["Midi length", "Self belt", "Side pockets"], care: ["Machine wash 30°", "Warm iron"], createdAt: "2026-06-02",
  },
  {
    slug: "saba-linen-co-ord", name: "Saba Linen Co-ord", subtitle: "Kurta and straight trouser set", kind: "kurta", category: "cat-kurtas",
    occasions: ["everyday", "festive"], price: prices(16800, 159, 129, 149),
    colours: [["Oatmeal", "sage"], ["Terracotta", "oat"]], fabric: "100% European linen",
    description: "A relaxed linen kurta with matching straight trousers. Easy for long lunches, effortless for family gatherings.",
    details: ["Two-piece set", "Kurta with side slits", "Elasticated trouser waist"], createdAt: "2026-09-12",
  },
  {
    slug: "rania-organza-dupatta", name: "Rania Organza Dupatta", subtitle: "Hand-embroidered silk organza", kind: "scarf", category: "cat-scarves",
    occasions: ["festive"], collections: ["col-jashn", "col-gifts"], price: prices(8900, 89, 72, 82), sizes: ONE, accent: true,
    colours: [["Champagne", "cocoa"], ["Blush", "sage"]], fabric: "Silk organza with tilla embroidery",
    description: "Sheer organza with a scattered tilla border, light as air. Finishes any festive look.",
    details: ["225 × 100 cm", "Hand-embroidered border"], care: ["Dry clean only"], isNew: true, createdAt: "2026-11-10",
  },
];

const VIEWS = 4;

function buildColours(s: Spec): ProductColour[] {
  return s.colours.map(([name, scene], ci) => ({
    id: `${s.slug}-${ci}`,
    name: s.colours.filter(([n]) => n === name).length > 1 && ci > 0 ? `${name} II` : name,
    hex: HEX[name] ?? "#C7B49D",
    images: Array.from({ length: VIEWS }, (_, v) => ({
      id: `${s.slug}-${ci}-${v}`,
      alt: `${s.name} in ${name.toLowerCase()} — ${["front view on hanger", "fabric detail", "three-quarter view", "styled view"][v]}`,
      art: { kind: s.kind, color: HEX[name] ?? "#B98B5E", scene: v === 2 ? "oat" : v === 3 ? (scene === "night" ? "cocoa" : "clay") : scene, view: v, accent: s.accent },
    })),
  }));
}

export const productData: Product[] = specs.map((s, i) => {
  const sizes = s.sizes ?? APPAREL;
  const colours = buildColours(s);
  const rnd = seeded(s.slug);
  return {
    id: `prd_${String(i + 1).padStart(3, "0")}`,
    slug: s.slug,
    name: s.name,
    subtitle: s.subtitle,
    description: s.description,
    categoryId: s.category,
    collectionIds: s.collections ?? [],
    occasionIds: s.occasions,
    prices: s.price,
    compareAtPrices: s.compareAt,
    colours,
    sizes,
    variants: colours.flatMap((c) =>
      sizes.map((size) => {
        const r = rnd();
        return {
          id: `${c.id}-${size.toLowerCase().replace(/\s/g, "")}`,
          sku: `NS-${String(i + 1).padStart(3, "0")}-${c.name.slice(0, 3).toUpperCase()}-${size.replace(/\s/g, "").toUpperCase()}`,
          colourId: c.id,
          size,
          stock: r < 0.08 ? 0 : r < 0.2 ? Math.ceil(r * 15) : Math.round(6 + r * 30),
        };
      })
    ),
    fabric: s.fabric,
    care: s.care ?? ["Machine wash 30° on a delicate cycle", "Do not tumble dry", "Cool iron on reverse"],
    details: s.details,
    fit: s.fit,
    tags: s.tags ?? [],
    isNew: !!s.isNew,
    status: "active",
    createdAt: `${s.createdAt}T09:00:00.000Z`,
  };
});

/* ---------------- Collections ---------------- */

const hero = (id: string, kind: GarmentKind, color: string, scene: SceneTone, alt: string, accent = false) => ({
  id, alt, art: { kind, color: HEX[color], scene, view: 3, accent },
});

export const collectionData: Collection[] = [
  { id: "col-workwear", slug: "workwear", occasionId: "workwear", name: "The Working Edit", eyebrow: "Workwear", headline: "Quiet *authority*, beautifully cut", description: "Wide-leg trousers with a long line, shirts that stay crisp from nine to six, and coats that make an entrance. Dressing for work, without the dress code.", hero: hero("h-work", "coat", "Camel", "night", "Camel wrap coat styled for the office"), featured: true, sortOrder: 1, status: "published", seo: { title: "Workwear for Women", description: "Tailored trousers, silk blouses and wrap coats for professional women. Considered workwear by Nargis & Shaz, delivered across Pakistan and worldwide." } },
  { id: "col-everyday", slug: "everyday", occasionId: "everyday", name: "Everyday", eyebrow: "Everyday", headline: "Easy pieces for the days *in between*", description: "Soft knits, fluid shirts and relaxed linen for weekends, errands and long lunches.", hero: hero("h-every", "knit", "Sage", "blush", "Sage cashmere jumper"), featured: true, sortOrder: 2, status: "published", seo: { title: "Everyday Clothing for Women", description: "Cashmere knits, linen co-ords and relaxed shirts for everyday wear." } },
  { id: "col-evening", slug: "evening", occasionId: "evening", name: "Evening", eyebrow: "Evening", headline: "Satin, silk and *sculpted* lines", description: "For dinners, galas and quiet celebrations. Pieces that catch the light and hold their shape.", hero: hero("h-eve", "dress", "Burgundy", "oat", "Burgundy midi dress for evening"), featured: true, sortOrder: 3, status: "published", seo: { title: "Evening Wear for Women", description: "Satin trousers, silk shirts and midi dresses for dinners and formal events." } },
  { id: "col-festive", slug: "festive", occasionId: "festive", name: "Jashn · Festive", eyebrow: "Jashn", headline: "Gold thread, *modern* shapes", description: "Weddings, Eid mornings and family dinners. Embroidery finished by artisans, on silhouettes made for today.", hero: hero("h-fest", "dress", "Midnight", "camel", "Midnight embroidered festive dress", true), featured: true, sortOrder: 4, status: "published", seo: { title: "Festive Wear — Eid & Wedding Collection", description: "Embroidered dresses, kurtas and organza dupattas for Eid, weddings and celebrations." } },
  { id: "col-aw26", slug: "autumn-winter-2026", name: "Autumn · Winter 2026", eyebrow: "The new season", headline: "Dressed for the *life* you lead", description: "Our autumn-winter collection: warm camel, terracotta and cream, in cashmere, wool and silk.", hero: hero("h-aw", "coat", "Camel", "cocoa", "Autumn winter 2026 campaign"), featured: false, sortOrder: 5, status: "published" },
  { id: "col-jashn", slug: "jashn-2026", name: "Jashn 2026", eyebrow: "Limited edition", headline: "The *celebration* edit", description: "A limited festive capsule, hand-finished in small ateliers across Punjab.", hero: hero("h-jashn", "kurta", "Rose", "sage", "Rose kurta with gota trim", true), featured: false, sortOrder: 6, status: "published" },
  { id: "col-gifts", slug: "the-gift-edit", name: "The Gift Edit", eyebrow: "Gifting", headline: "Something to *keep*", description: "Cashmere, silk and gold — gifts chosen to be treasured for years.", hero: hero("h-gift", "jewelry", "Gold", "night", "Gold pendant necklace"), featured: false, sortOrder: 7, status: "published" },
];
