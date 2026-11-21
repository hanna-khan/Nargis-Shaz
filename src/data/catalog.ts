import type { Category, Collection, GarmentKind, OccasionId, PriceSet, Product, ProductColour, ProductImage } from "@/types";
import { prices, seeded } from "./helpers";
import { campaign, shoots } from "./photography";

/* ---------------- Categories (women's clothing only; each has products) ---------------- */

export const categoryData: Category[] = [
  { id: "cat-dresses", slug: "dresses", name: "Dresses", description: "Slip dresses, gowns, cotton maxis and linen shirt dresses.", sortOrder: 1, image: shoots.satinGown[3] },
  { id: "cat-tops", slug: "tops", name: "Tops & Shirts", description: "Poplin shirts and linen blouses with a considered cut.", sortOrder: 2, image: shoots.poplinShirt[1] },
  { id: "cat-trousers", slug: "trousers", name: "Trousers", description: "High-waisted, pleated and tailored to move with you.", sortOrder: 3, image: shoots.pleatedTrousers[0] },
  { id: "cat-skirts", slug: "skirts", name: "Skirts", description: "Pleated and printed midi skirts.", sortOrder: 4, image: shoots.printedSkirt[2] },
  { id: "cat-coords", slug: "co-ords", name: "Co-ords & Suits", description: "Matching sets and two-piece suits.", sortOrder: 5, image: shoots.sageSuit[1] },
  { id: "cat-knitwear", slug: "knitwear", name: "Knitwear", description: "Chunky, ribbed and made to be lived in.", sortOrder: 6, image: shoots.turtleneck[0] },
  { id: "cat-outerwear", slug: "blazers-coats", name: "Blazers & Coats", description: "Tailored blazers and timeless trench coats.", sortOrder: 7, image: shoots.trench[0] },
  { id: "cat-festive", slug: "festive-sets", name: "Festive Sets", description: "Embroidered lehengas and bridal sets, finished by hand.", sortOrder: 8, image: shoots.lehenga[0] },
];

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
  colour: [name: string, hex: string];
  images: ProductImage[];
  sizes?: string[];
  fabric: string;
  description: string;
  details: string[];
  care?: string[];
  fit?: string;
  isNew?: boolean;
  completeTheLook?: string[];
  unitsSold30d: number;
  createdAt: string;
}

const APPAREL = ["XS", "S", "M", "L", "XL", "XXL"];
const MADE_TO_ORDER = ["XS", "S", "M", "L", "XL"];

const specs: Spec[] = [
  {
    slug: "aaliya-poplin-shirt", name: "Aaliya Poplin Shirt", subtitle: "Oversized cotton poplin shirt", kind: "blouse", category: "cat-tops",
    occasions: ["workwear", "everyday"], collections: ["col-aw26"], price: prices(8950, 85, 68, 79), colour: ["White", "#F7F5F0"], images: shoots.poplinShirt,
    fabric: "100% organic cotton poplin", description: "Cut generously through the body with a dropped shoulder and a long, curved hem. Wear it tucked into tailoring for the office, or open over a slip at the weekend.",
    details: ["Relaxed, oversized fit", "Mother-of-pearl buttons", "Single-needle stitching", "Model is 5'8\" and wears size S"], fit: "Oversized — size down for a closer fit",
    isNew: true, completeTheLook: ["mehr-pleated-trousers", "zainab-tailored-blazer"], unitsSold30d: 142, createdAt: "2026-11-02",
  },
  {
    slug: "mehr-pleated-trousers", name: "Mehr Pleated Trousers", subtitle: "High-waisted ecru trousers", kind: "trousers", category: "cat-trousers",
    occasions: ["workwear", "everyday"], collections: ["col-aw26"], price: prices(10500, 99, 79, 92), colour: ["Ecru", "#E6DCC8"], images: shoots.pleatedTrousers,
    fabric: "Wool-blend twill, 58% recycled polyester, 40% wool, 2% elastane", description: "Double front pleats and a high, belted waist give these trousers a long, clean line. Tailored enough for the boardroom and easy enough for Sundays.",
    details: ["High waist with belt loops", "Double front pleats", "Side pockets", "Inseam 80 cm"], fit: "True to size",
    completeTheLook: ["aaliya-poplin-shirt", "zainab-tailored-blazer"], unitsSold30d: 118, createdAt: "2026-10-22",
  },
  {
    slug: "noir-satin-slip-dress", name: "Noir Satin Slip Dress", subtitle: "Bias-cut satin midi", kind: "dress", category: "cat-dresses",
    occasions: ["evening"], collections: ["col-evening-edit"], price: prices(16500, 159, 125, 145), colour: ["Black", "#151211"], images: shoots.satinSlip,
    fabric: "Heavy satin, 100% recycled polyester", description: "Cut on the bias so it falls close to the body, with fine adjustable straps and a softly draped neckline. The dress you reach for when the invitation says black tie.",
    details: ["Midi length", "Bias cut", "Adjustable straps", "Fully lined"], care: ["Dry clean only", "Steam on low"],
    isNew: true, completeTheLook: ["zainab-tailored-blazer", "parveen-trench-coat"], unitsSold30d: 96, createdAt: "2026-11-08",
  },
  {
    slug: "rose-satin-gown", name: "Rosé Satin Gown", subtitle: "Draped satin evening gown", kind: "dress", category: "cat-dresses",
    occasions: ["evening", "festive"], collections: ["col-evening-edit"], price: prices(38000, 345, 279, 319), colour: ["Blush", "#E3C8BE"], images: shoots.satinGown,
    fabric: "Duchess satin, 100% polyester", description: "A sweeping floor-length gown in soft blush satin, with a plunging neckline and a full skirt that moves beautifully. Made for weddings, galas and evenings that deserve it.",
    details: ["Floor length", "Plunging V neckline", "Concealed back zip", "Fully lined"], care: ["Dry clean only"], sizes: MADE_TO_ORDER,
    isNew: true, unitsSold30d: 41, createdAt: "2026-11-10",
  },
  {
    slug: "gulnar-satin-maxi-dress", name: "Gulnar Satin Maxi Dress", subtitle: "Long-sleeved satin maxi", kind: "dress", category: "cat-dresses",
    occasions: ["festive", "evening"], collections: ["col-jashn"], price: prices(24500, 229, 185, 215), colour: ["Dusty Rose", "#C99A8E"], images: shoots.satinMaxi,
    fabric: "Satin crepe, 100% polyester", description: "A modest, fluid maxi in dusty rose satin with full bishop sleeves and a high neckline. Effortless for Eid, mehndi evenings and family celebrations.",
    details: ["Maxi length", "Bishop sleeves with buttoned cuffs", "High round neckline", "Half-lined"], care: ["Dry clean recommended"],
    unitsSold30d: 77, createdAt: "2026-10-30",
  },
  {
    slug: "parveen-trench-coat", name: "Parveen Trench Coat", subtitle: "Double-breasted cotton trench", kind: "coat", category: "cat-outerwear",
    occasions: ["workwear", "everyday"], collections: ["col-aw26"], price: prices(29500, 289, 229, 265), colour: ["Stone", "#CDBB9E"], images: shoots.trench,
    fabric: "Water-repellent cotton gabardine", description: "Our trench, reworked: a softer shoulder, a deeper belt and a length that looks right over trousers or a dress. A piece to keep for years.",
    details: ["Double-breasted", "Storm flap and buckled cuffs", "Self-tie belt", "Fully lined"], care: ["Dry clean only"],
    completeTheLook: ["mehr-pleated-trousers", "sahar-chunky-turtleneck"], unitsSold30d: 88, createdAt: "2026-09-18",
  },
  {
    slug: "safiya-coat-trouser-set", name: "Safiya Coat & Trouser Set", subtitle: "Ivory longline coat with matching trousers", kind: "set", category: "cat-coords",
    occasions: ["workwear", "evening"], collections: ["col-aw26"], price: prices(34000, 319, 255, 295), colour: ["Ivory", "#EFE9DE"], images: shoots.coatSet,
    fabric: "Wool-blend crepe, lined in cupro", description: "A longline ivory coat with a soft shawl collar, paired with straight-leg trousers in the same crepe. Worn together it is quietly commanding; apart, each piece works everywhere.",
    details: ["Two-piece set, sold together", "Longline coat with patch pockets", "Straight-leg trousers with pressed crease"], care: ["Dry clean only"],
    isNew: true, unitsSold30d: 52, createdAt: "2026-11-05",
  },
  {
    slug: "sahar-chunky-turtleneck", name: "Sahar Chunky Turtleneck", subtitle: "Rib-knit wool-blend jumper", kind: "knit", category: "cat-knitwear",
    occasions: ["everyday", "workwear"], collections: ["col-aw26"], price: prices(14900, 145, 115, 135), colour: ["Oatmeal", "#D8C6A8"], images: shoots.turtleneck,
    fabric: "60% merino wool, 30% alpaca, 10% recycled nylon", description: "A deep rib knit with a generous roll neck and long sleeves you can pull over your hands. Warm, soft and made to be lived in.",
    details: ["Relaxed fit", "Chunky rib knit", "Roll neck"], care: ["Hand wash cold", "Dry flat", "Store folded"],
    isNew: true, completeTheLook: ["mehr-pleated-trousers", "parveen-trench-coat"], unitsSold30d: 131, createdAt: "2026-10-26",
  },
  {
    slug: "zainab-tailored-blazer", name: "Zainab Tailored Blazer", subtitle: "Oversized single-breasted blazer", kind: "coat", category: "cat-outerwear",
    occasions: ["workwear", "evening"], collections: ["col-aw26"], price: prices(22500, 215, 175, 199), colour: ["Black", "#1C1816"], images: shoots.blazer,
    fabric: "Wool-blend suiting, lined in viscose", description: "An oversized blazer with strong, softly padded shoulders and long peak lapels. Over a shirt for the office, over satin for the evening.",
    details: ["Oversized fit", "Single-button fastening", "Peak lapels", "Two flap pockets"], care: ["Dry clean only"],
    completeTheLook: ["aaliya-poplin-shirt", "noir-satin-slip-dress"], unitsSold30d: 104, createdAt: "2026-09-30",
  },
  {
    slug: "ayesha-cotton-maxi-dress", name: "Ayesha Cotton Maxi Dress", subtitle: "Long-sleeved cotton maxi", kind: "dress", category: "cat-dresses",
    occasions: ["everyday", "festive"], price: prices(15500, 149, 119, 139), colour: ["Ivory", "#F1EADC"], images: shoots.cottonMaxi,
    fabric: "100% cotton voile, cotton lining", description: "An easy, floor-length dress in airy cotton with a gathered waist and long sleeves. Cool for summer afternoons and elegant enough for a family gathering.",
    details: ["Maxi length", "Gathered waist", "Long sleeves with buttoned cuffs"], care: ["Machine wash 30° on a gentle cycle", "Warm iron"],
    unitsSold30d: 63, createdAt: "2026-08-12",
  },
  {
    slug: "dua-linen-shirt-dress", name: "Dua Linen Shirt Dress", subtitle: "Washed linen midi", kind: "dress", category: "cat-dresses",
    occasions: ["everyday"], price: prices(13900, 135, 109, 125), colour: ["Olive", "#6E6A4C"], images: shoots.linenDress,
    fabric: "100% washed European linen", description: "A relaxed shirt dress in soft washed linen, with a full button placket and a loose, easy shape. Roll the sleeves and go.",
    details: ["Midi length", "Full button placket", "Side pockets"], care: ["Machine wash 30°", "Tumble dry low for a softer hand"],
    unitsSold30d: 58, createdAt: "2026-07-21",
  },
  {
    slug: "mira-printed-midi-skirt", name: "Mira Printed Midi Skirt", subtitle: "Printed viscose midi skirt", kind: "skirt", category: "cat-skirts",
    occasions: ["everyday"], price: prices(9800, 95, 75, 88), compareAt: prices(12500, 119, 95, 109), colour: ["Ink Print", "#2B2624"], images: shoots.printedSkirt,
    fabric: "100% viscose crepe", description: "A fluid midi skirt in a dark, small-scale print with an elasticated back waist. It swings when you walk.",
    details: ["Midi length", "Elasticated back waist", "Side zip"], care: ["Machine wash 30° on a delicate cycle"],
    completeTheLook: ["hana-linen-blouse", "sahar-chunky-turtleneck"], unitsSold30d: 49, createdAt: "2026-06-30",
  },
  {
    slug: "nilofer-pleated-midi-skirt", name: "Nilofer Pleated Midi Skirt", subtitle: "Knife-pleated midi skirt", kind: "skirt", category: "cat-skirts",
    occasions: ["workwear", "evening"], price: prices(11200, 109, 85, 99), colour: ["Pearl", "#E9E4DA"], images: shoots.pleatedSkirt,
    fabric: "Satin-finish crepe, 100% recycled polyester", description: "Fine knife pleats that hold their shape and catch the light. Pairs as well with a knit as with a silk blouse.",
    details: ["Midi length", "Knife pleats", "Concealed side zip"], care: ["Machine wash cold, hang to dry"],
    completeTheLook: ["sahar-chunky-turtleneck", "zainab-tailored-blazer"], unitsSold30d: 66, createdAt: "2026-09-04",
  },
  {
    slug: "hana-linen-blouse", name: "Hana Linen Blouse", subtitle: "Full-sleeved linen blouse", kind: "blouse", category: "cat-tops",
    occasions: ["everyday", "workwear"], price: prices(7900, 79, 62, 72), colour: ["White", "#F4F1EA"], images: shoots.linenBlouse,
    fabric: "100% washed linen", description: "A soft linen blouse with full sleeves and a relaxed shoulder, light enough for summer and easy to layer in winter.",
    details: ["Relaxed fit", "Gathered cuffs", "Round neckline with a keyhole button"], care: ["Machine wash 30°"],
    completeTheLook: ["mira-printed-midi-skirt", "mehr-pleated-trousers"], unitsSold30d: 84, createdAt: "2026-08-25",
  },
  {
    slug: "noor-zari-lehenga", name: "Noor Zari Lehenga", subtitle: "Ivory & gold embroidered lehenga set", kind: "set", category: "cat-festive",
    occasions: ["festive"], collections: ["col-jashn"], price: prices(85000, 749, 595, 689), colour: ["Ivory Gold", "#E7D9B8"], images: shoots.lehenga, sizes: MADE_TO_ORDER,
    fabric: "Raw silk with zari and sequin embroidery; organza dupatta", description: "An ivory lehenga worked in gold zari by artisans in Lahore, with a fitted blouse and a sheer embroidered dupatta. Light enough to dance in all night.",
    details: ["Three-piece set: lehenga, blouse, dupatta", "Hand-finished zari embroidery", "Made to order in 4–6 weeks"], care: ["Dry clean only", "Store flat in the muslin bag provided"],
    isNew: true, unitsSold30d: 18, createdAt: "2026-11-12",
  },
  {
    slug: "shahzadi-bridal-set", name: "Shahzadi Bridal Set", subtitle: "Maroon embroidered choli & lehenga", kind: "set", category: "cat-festive",
    occasions: ["festive"], collections: ["col-jashn"], price: prices(145000, 1290, 1020, 1190), colour: ["Maroon", "#6B1F24"], images: shoots.bridal, sizes: MADE_TO_ORDER,
    fabric: "Velvet and raw silk with dabka, zardozi and gota work", description: "Our bridal set in deep maroon: a heavily embroidered choli and lehenga with a contrasting beige dupatta. Every piece is made to measure in our Lahore atelier.",
    details: ["Three-piece set", "Hand embroidery by master karigars", "Made to measure — 8–10 weeks", "Complimentary fitting consultation"], care: ["Specialist dry clean only"],
    unitsSold30d: 6, createdAt: "2026-10-15",
  },
  {
    slug: "saba-sage-suit", name: "Saba Sage Suit", subtitle: "Two-piece tailored suit", kind: "set", category: "cat-coords",
    occasions: ["workwear", "everyday"], collections: ["col-aw26"], price: prices(32000, 299, 239, 275), colour: ["Sage", "#C9D3BF"], images: shoots.sageSuit,
    fabric: "Linen-viscose suiting", description: "A relaxed blazer and wide-leg trousers in a soft sage. Wear the suit together for a meeting, or break it up with a knit and denim.",
    details: ["Two-piece set, sold together", "Relaxed single-breasted blazer", "High-waisted wide-leg trousers"], care: ["Dry clean recommended"],
    isNew: true, unitsSold30d: 71, createdAt: "2026-11-01",
  },
];

function buildColour(s: Spec): ProductColour {
  const [name, hex] = s.colour;
  return { id: `${s.slug}-c0`, name, hex, images: s.images };
}

export const productData: Product[] = specs.map((s, i) => {
  const sizes = s.sizes ?? APPAREL;
  const colour = buildColour(s);
  const rnd = seeded(s.slug);
  const num = String(i + 1).padStart(3, "0");
  return {
    id: `prd_${num}`,
    slug: s.slug,
    name: s.name,
    subtitle: s.subtitle,
    description: s.description,
    categoryId: s.category,
    collectionIds: s.collections ?? [],
    occasionIds: s.occasions,
    prices: s.price,
    compareAtPrices: s.compareAt,
    colours: [colour],
    sizes,
    variants: sizes.map((size) => {
      const r = rnd();
      return {
        id: `${colour.id}-${size.toLowerCase()}`,
        sku: `NS-${num}-${colour.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}-${size}`,
        colourId: colour.id,
        size,
        stock: r < 0.1 ? 0 : r < 0.24 ? Math.ceil(r * 14) : Math.round(6 + r * 28),
      };
    }),
    fabric: s.fabric,
    care: s.care ?? ["Machine wash 30° on a delicate cycle", "Do not tumble dry", "Cool iron on the reverse"],
    details: s.details,
    fit: s.fit,
    tags: [],
    completeTheLook: s.completeTheLook,
    stats: { unitsSold30d: s.unitsSold30d },
    isNew: !!s.isNew,
    status: "active",
    createdAt: `${s.createdAt}T09:00:00.000Z`,
  };
});

/* ---------------- Collections ---------------- */

export const collectionData: Collection[] = [
  { id: "col-workwear", slug: "workwear", occasionId: "workwear", name: "Workwear", eyebrow: "The Working Edit", headline: "Quiet *authority*, beautifully cut", description: "Tailored blazers, pleated trousers and shirts that stay crisp from nine to six. Dressing for work, without the dress code.", hero: shoots.blazer[0], featured: true, sortOrder: 1, status: "published", seo: { title: "Workwear for Women — Blazers, Trousers & Shirts", description: "Tailored blazers, pleated trousers, poplin shirts and suits for professional women. Nargis & Shaz workwear, delivered across Pakistan and worldwide." } },
  { id: "col-everyday", slug: "everyday", occasionId: "everyday", name: "Everyday", eyebrow: "Everyday", headline: "Easy pieces for the days *in between*", description: "Washed linen, soft knits and fluid skirts for weekends, errands and long lunches.", hero: shoots.linenDress[0], featured: true, sortOrder: 2, status: "published", seo: { title: "Everyday Clothing for Women — Linen, Knitwear & Skirts", description: "Linen dresses, chunky knits, midi skirts and relaxed blouses for everyday wear." } },
  { id: "col-evening", slug: "evening", occasionId: "evening", name: "Evening", eyebrow: "Evening", headline: "Satin, silk and *sculpted* lines", description: "For dinners, galas and quiet celebrations. Pieces that catch the light and hold their shape.", hero: shoots.satinSlip[0], featured: true, sortOrder: 3, status: "published", seo: { title: "Evening Wear for Women — Satin Dresses & Gowns", description: "Satin slip dresses, draped gowns and tailored pieces for dinners and formal events." } },
  { id: "col-festive", slug: "festive", occasionId: "festive", name: "Festive & Occasion", eyebrow: "Jashn", headline: "Gold thread, *modern* shapes", description: "Weddings, Eid mornings and family celebrations. Embroidery finished by artisans, on silhouettes made for today.", hero: shoots.lehenga[0], featured: true, sortOrder: 4, status: "published", seo: { title: "Festive & Occasion Wear — Lehengas, Bridal & Eid Dresses", description: "Hand-embroidered lehengas, bridal sets and satin dresses for Eid, weddings and celebrations." } },
  { id: "col-aw26", slug: "autumn-winter-2026", name: "Autumn · Winter 2026", eyebrow: "The new season", headline: "Designed for *every chapter*", description: "Our autumn-winter collection: sage, stone and ecru tailoring, chunky knits and the trench, reworked.", hero: campaign.heroWide, featured: false, sortOrder: 5, status: "published" },
  { id: "col-evening-edit", slug: "the-evening-edit", name: "The Evening Edit", eyebrow: "Limited edition", headline: "After *dark*", description: "Bias-cut satin and sweeping gowns for the evenings that deserve them.", hero: campaign.fan, featured: false, sortOrder: 6, status: "published" },
  { id: "col-jashn", slug: "jashn-2026", name: "Jashn 2026", eyebrow: "Festive capsule", headline: "The *celebration* edit", description: "A limited festive capsule, hand-finished in small ateliers across Punjab.", hero: campaign.bridalMoon, featured: false, sortOrder: 7, status: "published" },
];
