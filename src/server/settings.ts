import { inArray } from "drizzle-orm";
import { db, type Executor } from "./db";
import { storeSettings } from "./db/schema";

export interface StoreSettingsValue {
  storeName: string;
  legalName: string;
  supportEmail: string;
  supportPhone: string;
  whatsapp: string;
  address: string;
  logoMediaId: string | null;
  social: { instagram: string; facebook: string; pinterest: string; tiktok: string };
  defaultMarketId: string;
  orderNumberPrefix: string;
  lowStockThreshold: number;
  announcement: { enabled: boolean; message: string; href: string };
  footer: { about: string; copyright: string };
  seo: { title: string; description: string; ogImageId: string | null };
  maintenance: { enabled: boolean; message: string };
  checkout: { guestCheckout: boolean; reservationMinutes: number; maxQuantityPerLine: number };
  paymentNote: string;
}

export const DEFAULT_SETTINGS: StoreSettingsValue = {
  storeName: "Nargis & Shaz",
  legalName: "Nargis & Shaz",
  supportEmail: "care@nargisandshaz.com",
  supportPhone: "+92 42 0000 0000",
  whatsapp: "",
  address: "Lahore, Pakistan",
  logoMediaId: null,
  social: { instagram: "", facebook: "", pinterest: "", tiktok: "" },
  defaultMarketId: "pk",
  orderNumberPrefix: "NS-",
  lowStockThreshold: 3,
  announcement: { enabled: true, message: "Complimentary delivery in Pakistan over Rs 10,000 · Cash on delivery available", href: "/customer-care#delivery" },
  footer: { about: "A Lahore designer label for women — tailoring, occasion and festive wear, made in small runs in our atelier.", copyright: "Nargis & Shaz" },
  seo: { title: "Nargis & Shaz — Designer Label", description: "Designer womenswear from Lahore: tailoring for work, quiet everyday pieces and hand-finished festive wear. Delivered across Pakistan and worldwide.", ogImageId: null },
  maintenance: { enabled: false, message: "We're making a few changes and will be back shortly." },
  checkout: { guestCheckout: true, reservationMinutes: 30, maxQuantityPerLine: 10 },
  paymentNote: "Cash on delivery in Pakistan · Debit and credit cards",
};

type Key = keyof StoreSettingsValue;

export async function getSettings(exec: Executor = db): Promise<StoreSettingsValue> {
  const rows = await exec.select().from(storeSettings);
  const out = structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, unknown>;
  for (const r of rows) {
    const def = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[r.key];
    if (def === undefined) continue;
    out[r.key] = def && typeof def === "object" && !Array.isArray(def) && r.value && typeof r.value === "object" ? { ...(def as object), ...(r.value as object) } : r.value;
  }
  return out as unknown as StoreSettingsValue;
}

export async function saveSettings(patch: Partial<StoreSettingsValue>, staffUserId: string | null, exec: Executor = db) {
  const keys = Object.keys(patch) as Key[];
  for (const k of keys) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    await exec.insert(storeSettings).values({ key: k, value: patch[k] as unknown, updatedBy: staffUserId })
      .onDuplicateKeyUpdate({ set: { value: patch[k] as unknown, updatedBy: staffUserId } });
  }
}

export async function getSettingKeys(keys: Key[]) {
  const rows = await db.select().from(storeSettings).where(inArray(storeSettings.key, keys));
  return rows;
}
