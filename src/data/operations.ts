import type { AuditLogEntry, Customer, Discount, HomepageContent, Order, StaffMember, StoreSettings } from "@/types";
import { productData } from "./catalog";
import { seeded } from "./helpers";

/* ---------------- Customers ---------------- */

const cust = (id: string, first: string, last: string, email: string, phone: string, cc: string, city: string, created: string, orders: number, spent: number, cur: Customer["totalSpent"]["currency"], consent: boolean, tags: string[] = []): Customer => ({
  id, firstName: first, lastName: last, email, phone, countryCode: cc, city, createdAt: `${created}T10:00:00.000Z`, orderCount: orders, totalSpent: { amount: spent * 100, currency: cur }, marketingConsent: consent, tags,
});

export const customerData: Customer[] = [
  cust("cus_001", "Mahnoor", "Qureshi", "mahnoor.q@example.com", "+92 300 1234567", "PK", "Lahore", "2025-03-14", 7, 142300, "PKR", true, ["VIP"]),
  cust("cus_002", "Sana", "Malik", "sana.malik@example.com", "+92 321 7654321", "PK", "Karachi", "2025-08-02", 3, 51200, "PKR", true),
  cust("cus_003", "Hira", "Siddiqui", "hira.s@example.co.uk", "+44 7700 900123", "GB", "London", "2025-11-20", 4, 612, "GBP", true, ["Repeat"]),
  cust("cus_004", "Ayesha", "Rahman", "ayesha.r@example.com", "+1 415 555 0142", "US", "San Francisco", "2026-01-09", 2, 498, "USD", false),
  cust("cus_005", "Zara", "Ahmed", "zara.ahmed@example.de", "+49 151 2345678", "DE", "Berlin", "2026-02-17", 1, 279, "EUR", true),
  cust("cus_006", "Fatima", "Butt", "fatima.butt@example.com", "+92 333 1122334", "PK", "Islamabad", "2024-12-01", 11, 268900, "PKR", true, ["VIP", "Stylist client"]),
  cust("cus_007", "Mariam", "Khan", "mariam.k@example.ae", "+971 50 123 4567", "AE", "Dubai", "2026-03-30", 3, 905, "USD", true),
  cust("cus_008", "Noor", "Hussain", "noor.h@example.com", "+92 345 9988776", "PK", "Faisalabad", "2026-05-11", 1, 18500, "PKR", false),
  cust("cus_009", "Amna", "Javed", "amna.javed@example.co.uk", "+44 7700 900456", "GB", "Manchester", "2026-06-04", 2, 344, "GBP", true),
  cust("cus_010", "Rabia", "Sheikh", "rabia.s@example.ca", "+1 647 555 0199", "CA", "Toronto", "2026-07-22", 1, 299, "USD", true),
  cust("cus_011", "Iqra", "Nadeem", "iqra.n@example.com", "+92 301 5566778", "PK", "Multan", "2026-09-03", 2, 30400, "PKR", true),
  cust("cus_012", "Leila", "Haddad", "leila.h@example.fr", "+33 6 12 34 56 78", "FR", "Paris", "2026-10-15", 1, 149, "EUR", false),
];

/* ---------------- Orders ---------------- */

type Mk = { market: string; currency: Order["currency"]; cc: string; ship: string; pay: string };
const MK: Record<string, Mk> = {
  pk: { market: "pk", currency: "PKR", cc: "PK", ship: "pk-standard", pay: "cod" },
  pkcard: { market: "pk", currency: "PKR", cc: "PK", ship: "pk-express", pay: "card" },
  gb: { market: "gb", currency: "GBP", cc: "GB", ship: "gb-tracked", pay: "card" },
  us: { market: "us", currency: "USD", cc: "US", ship: "us-tracked", pay: "paypal" },
  eu: { market: "eu", currency: "EUR", cc: "DE", ship: "eu-express", pay: "card" },
  ae: { market: "intl", currency: "USD", cc: "AE", ship: "intl-tracked", pay: "card" },
};

function makeOrder(n: number, customerId: string, mk: keyof typeof MK, at: string, items: [number, number][], pay: Order["paymentStatus"], ful: Order["fulfilmentStatus"]): Order {
  const m = MK[mk];
  const c = customerData.find((x) => x.id === customerId)!;
  const lines = items.map(([pi, q]) => {
    const p = productData[pi];
    const col = p.colours[0];
    const v = p.variants.find((x) => x.colourId === col.id && x.size === (p.sizes[1] ?? p.sizes[0]))!;
    return { productId: p.id, variantId: v.id, name: p.name, colour: col.name, size: v.size, quantity: q, unitPrice: p.prices[m.currency] };
  });
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  const shipping = m.currency === "PKR" ? (subtotal >= 10_000_00 ? 0 : 250_00) : subtotal > 250_00 ? 0 : 15_00;
  const taxRate = m.cc === "PK" ? 0.18 : m.cc === "GB" ? 0.2 : m.cc === "DE" ? 0.19 : 0;
  return {
    id: `ord_${n}`,
    number: `NS-${n}`,
    createdAt: at,
    customerId,
    email: c.email,
    marketId: m.market,
    currency: m.currency,
    countryCode: m.cc,
    shippingAddress: { firstName: c.firstName, lastName: c.lastName, line1: "14 Garden Road", city: c.city, postalCode: m.cc === "PK" ? "54000" : "10115", countryCode: c.countryCode, phone: c.phone },
    shippingMethodId: m.ship,
    paymentMethodId: m.pay,
    paymentKind: m.pay === "cod" ? "cod" : "online",
    paymentStatus: pay,
    fulfilmentStatus: ful,
    lines,
    totals: { subtotal, shipping, discount: 0, tax: 0, taxIncluded: Math.round(subtotal - subtotal / (1 + taxRate)), total: subtotal + shipping },
    timeline: [
      { at, message: "Order placed", actor: "Customer" },
      ...(pay === "paid" ? [{ at, message: "Payment confirmed by provider webhook", actor: "System" }] : []),
      ...(ful === "shipped" || ful === "delivered" ? [{ at, message: "Shipped with tracking number", actor: "Bilal (Staff)" }] : []),
      ...(ful === "delivered" ? [{ at, message: "Delivered", actor: "Courier" }] : []),
    ],
  };
}

export const orderData: Order[] = [
  makeOrder(10432, "cus_006", "pk", "2026-11-21T08:14:00.000Z", [[9, 1], [16, 1]], "awaiting_cod", "unfulfilled"),
  makeOrder(10431, "cus_003", "gb", "2026-11-20T19:42:00.000Z", [[4, 1]], "paid", "processing"),
  makeOrder(10430, "cus_001", "pkcard", "2026-11-20T15:03:00.000Z", [[0, 1], [1, 2]], "paid", "shipped"),
  makeOrder(10429, "cus_007", "ae", "2026-11-20T11:27:00.000Z", [[9, 1], [12, 1]], "paid", "processing"),
  makeOrder(10428, "cus_011", "pk", "2026-11-19T17:55:00.000Z", [[10, 1]], "awaiting_cod", "shipped"),
  makeOrder(10427, "cus_004", "us", "2026-11-19T09:10:00.000Z", [[3, 1], [5, 1]], "paid", "delivered"),
  makeOrder(10426, "cus_002", "pk", "2026-11-18T13:22:00.000Z", [[2, 1], [13, 1]], "paid", "delivered"),
  makeOrder(10425, "cus_005", "eu", "2026-11-18T08:40:00.000Z", [[4, 1]], "pending", "unfulfilled"),
  makeOrder(10424, "cus_009", "gb", "2026-11-17T20:16:00.000Z", [[1, 1], [6, 1]], "refunded", "returned"),
  makeOrder(10423, "cus_008", "pk", "2026-11-17T10:05:00.000Z", [[0, 1]], "failed", "cancelled"),
  makeOrder(10422, "cus_012", "eu", "2026-11-16T14:48:00.000Z", [[0, 1]], "paid", "delivered"),
  makeOrder(10421, "cus_010", "us", "2026-11-15T22:31:00.000Z", [[9, 1]], "paid", "delivered"),
  makeOrder(10420, "cus_006", "pkcard", "2026-11-14T12:00:00.000Z", [[14, 1], [7, 1]], "paid", "delivered"),
  makeOrder(10419, "cus_001", "pk", "2026-11-13T16:20:00.000Z", [[16, 1]], "paid", "delivered"),
];

/** 30 days of revenue (PKR minor units, all markets converted) for the dashboard chart. */
export const salesSeries: { date: string; revenue: number; orders: number }[] = (() => {
  const r = seeded("sales-2026-11");
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 23 + i));
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const trend = 1 + i / 45;
    const orders = Math.round((14 + r() * 10 + (weekend ? 7 : 0)) * trend);
    return { date: d.toISOString().slice(0, 10), orders, revenue: Math.round(orders * (15500 + r() * 6000)) * 100 };
  });
})();

/* ---------------- Discounts ---------------- */

export const discountData: Discount[] = [
  { id: "dis_001", code: "WELCOME10", description: "10% off a first order", type: "percentage", value: 10, marketIds: "all", usageCount: 412, usageLimit: null, startsAt: "2026-01-01T00:00:00.000Z", endsAt: null, active: true },
  { id: "dis_002", code: "JASHN15", description: "15% off the festive edit", type: "percentage", value: 15, marketIds: ["pk"], minimumSubtotal: { PKR: 20_000_00 }, usageCount: 96, usageLimit: 500, startsAt: "2026-11-01T00:00:00.000Z", endsAt: "2026-12-31T23:59:00.000Z", active: true },
  { id: "dis_003", code: "UKSHIP", description: "Free tracked shipping to the UK", type: "free_shipping", value: 0, marketIds: ["gb"], usageCount: 58, usageLimit: null, startsAt: "2026-10-01T00:00:00.000Z", endsAt: "2026-12-01T00:00:00.000Z", active: true },
  { id: "dis_004", code: "STYLIST", description: "Fixed amount for styling clients", type: "fixed", value: { PKR: 3000_00, USD: 25_00, GBP: 20_00, EUR: 22_00 }, marketIds: "all", usageCount: 21, usageLimit: 100, startsAt: "2026-06-01T00:00:00.000Z", endsAt: null, active: false },
  { id: "dis_005", code: "SUMMER25", description: "End of summer", type: "percentage", value: 25, marketIds: "all", usageCount: 1204, usageLimit: null, startsAt: "2026-07-15T00:00:00.000Z", endsAt: "2026-08-31T23:59:00.000Z", active: false },
];

/* ---------------- Team & audit ---------------- */

export const staffData: StaffMember[] = [
  { id: "stf_001", name: "Nargis Imran", email: "nargis@nargisandshaz.com", roleId: "owner", status: "active", lastActiveAt: "2026-11-21T09:02:00.000Z", avatarTone: "#9A8069" },
  { id: "stf_002", name: "Shaz Ali", email: "shaz@nargisandshaz.com", roleId: "administrator", status: "active", lastActiveAt: "2026-11-21T07:40:00.000Z", avatarTone: "#655044" },
  { id: "stf_003", name: "Hamza Tariq", email: "hamza@nargisandshaz.com", roleId: "store_manager", status: "active", lastActiveAt: "2026-11-20T18:11:00.000Z", avatarTone: "#C7B49D" },
  { id: "stf_004", name: "Mehwish Raza", email: "mehwish@nargisandshaz.com", roleId: "content_manager", status: "active", lastActiveAt: "2026-11-20T16:25:00.000Z", avatarTone: "#B48A5E" },
  { id: "stf_005", name: "Bilal Saeed", email: "bilal@nargisandshaz.com", roleId: "staff", status: "active", lastActiveAt: "2026-11-21T06:55:00.000Z", avatarTone: "#8A8767" },
  { id: "stf_006", name: "Areeba Shah", email: "areeba@nargisandshaz.com", roleId: "staff", status: "invited", lastActiveAt: null, avatarTone: "#E7CDBE" },
];

export const auditData: AuditLogEntry[] = [
  { id: "aud_010", at: "2026-11-21T08:31:00.000Z", actorId: "stf_005", actorName: "Bilal Saeed", action: "order.fulfilment_updated", resource: "orders", resourceId: "ord_10430", summary: "Marked NS-10430 as shipped", changes: { fulfilmentStatus: { from: "processing", to: "shipped" } } },
  { id: "aud_009", at: "2026-11-21T07:52:00.000Z", actorId: "stf_002", actorName: "Shaz Ali", action: "settings.payment_provider_updated", resource: "settings", summary: "Enabled PayPal for Europe", changes: { "payments.paypal.marketIds": { from: ["gb", "us"], to: ["gb", "us", "eu"] } } },
  { id: "aud_008", at: "2026-11-20T18:05:00.000Z", actorId: "stf_003", actorName: "Hamza Tariq", action: "inventory.adjusted", resource: "inventory", resourceId: "prd_015", summary: "Restocked Noor Zari Lehenga (Ivory Gold, M) +6" },
  { id: "aud_007", at: "2026-11-20T16:20:00.000Z", actorId: "stf_004", actorName: "Mehwish Raza", action: "content.homepage_updated", resource: "content", summary: "Updated homepage hero headline" },
  { id: "aud_006", at: "2026-11-20T11:00:00.000Z", actorId: "stf_002", actorName: "Shaz Ali", action: "order.refunded", resource: "finance", resourceId: "ord_10424", summary: "Refunded NS-10424 in full (£233)" },
  { id: "aud_005", at: "2026-11-19T14:42:00.000Z", actorId: "stf_001", actorName: "Nargis Imran", action: "team.invited", resource: "team", resourceId: "stf_006", summary: "Invited areeba@nargisandshaz.com as Staff" },
  { id: "aud_004", at: "2026-11-19T10:12:00.000Z", actorId: "stf_003", actorName: "Hamza Tariq", action: "discount.created", resource: "discounts", resourceId: "dis_002", summary: "Created discount JASHN15" },
  { id: "aud_003", at: "2026-11-18T09:30:00.000Z", actorId: "stf_004", actorName: "Mehwish Raza", action: "product.updated", resource: "products", resourceId: "prd_016", summary: "Published Shahzadi Bridal Set", changes: { status: { from: "draft", to: "active" } } },
];

/* ---------------- Content & settings ---------------- */

export const homepageData: HomepageContent = {
  announcement: "Complimentary delivery across Pakistan over Rs 10,000 · Duties paid to the UK & EU",
  hero: {
    eyebrow: "Autumn · Winter 2026",
    headline: "Designed for *every chapter*",
    body: "Soft tailoring, considered knits and evening pieces made to be remembered — for the woman who moves between the boardroom and the celebration.",
    primaryCta: { label: "Discover the collection", href: "/collections/autumn-winter-2026" },
    secondaryCta: { label: "New in", href: "/new-arrivals" },
    imageId: "px-8433535",
    mobileImageId: "px-8433356",
  },
  newArrivals: { eyebrow: "Just arrived", title: "New *arrivals*", limit: 8 },
  categoryCards: [
    { title: "Workwear", href: "/workwear", imageId: "px-8958833" },
    { title: "Everyday", href: "/everyday", imageId: "px-17805846" },
    { title: "Dresses", href: "/shop/dresses", imageId: "px-9563080" },
    { title: "Festive & Occasion", href: "/festive", imageId: "px-9418537" },
  ],
  campaign: {
    eyebrow: "The campaign",
    headline: "Made for the *whole* of your day",
    body: "From the first meeting to the last dinner reservation: a wardrobe that keeps its shape, and its composure, from morning to night.",
    cta: { label: "Shop workwear", href: "/workwear" },
    imageIds: ["px-8433588", "px-4456727", "px-7945663"],
  },
  bestsellers: { eyebrow: "Most loved", title: "The *bestsellers*", mode: "auto", productIds: [], limit: 4 },
  statement: { eyebrow: "The house", text: "Clothes that carry you from the *first meeting* to the last *celebration* — and are still loved a decade later." },
  editorial: {
    eyebrow: "The art of dressing",
    headline: "Light, line and *movement*",
    body: "Satin cut on the bias, pleats that hold their shape, linen that softens with every wash. We design for the way fabric moves on a body — and the way you move through your day.",
    imageIds: ["px-21926474", "px-9563093", "px-17805846", "px-8958830"],
    cta: { label: "Discover the evening edit", href: "/collections/the-evening-edit" },
  },
  details: {
    eyebrow: "A closer look",
    headline: "In the *details*",
    items: [
      { title: "Organic poplin", body: "Crisp cotton that softens over time, finished with mother-of-pearl buttons.", imageId: "px-7945663" },
      { title: "Hand-finished zari", body: "Gold thread embroidered by master karigars in our Lahore atelier.", imageId: "px-9418564" },
      { title: "Chunky rib knit", body: "Merino and alpaca, knitted dense and warm for the coldest mornings.", imageId: "px-6995886" },
    ],
  },
  featuredCollectionIds: ["col-everyday", "col-evening", "col-festive"],
  story: { eyebrow: "Our story", headline: "Made slowly, for women who *never stop moving*", body: "Nargis & Shaz began in Lahore with a simple belief: a wardrobe should work as hard as you do, and look beautiful doing it. We choose natural fibres, work with small ateliers and design every piece to be worn for years.", imageId: "px-4456727" },
  quote: { text: "The kind of wardrobe you stop thinking about, because everything simply works.", attribution: "Mahnoor, Lahore" },
};

export const settingsData: StoreSettings = {
  storeName: "Nargis & Shaz",
  legalName: "Nargis & Shaz (Private) Limited",
  supportEmail: "care@nargisandshaz.com",
  supportPhone: "+92 42 111 627 742",
  baseCurrency: "PKR",
  defaultMarketId: "pk",
  exchangeRates: { PKR: 1, USD: 0.0036, GBP: 0.0028, EUR: 0.0033 },
  lowStockThreshold: 5,
  orderNumberPrefix: "NS-",
  payments: [
    { id: "cod", displayName: "Cash on delivery", enabled: true, marketIds: ["pk"], mode: "live" },
    { id: "card", displayName: "Debit / credit card", enabled: true, marketIds: ["pk", "gb", "eu", "us", "intl"], mode: "test" },
    { id: "wallet", displayName: "Mobile wallet", enabled: true, marketIds: ["pk"], mode: "test" },
    { id: "bank-transfer", displayName: "Bank transfer", enabled: false, marketIds: ["pk"], mode: "test" },
    { id: "paypal", displayName: "PayPal", enabled: true, marketIds: ["gb", "us", "eu"], mode: "test" },
  ],
};
