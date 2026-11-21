import "server-only";
import { categoryData, collectionData, productData } from "@/data/catalog";
import { campaign } from "@/data/photography";
import { countryData, currencyData, marketData, shippingData, taxData } from "@/data/markets";
import { auditData, customerData, discountData, homepageData, orderData, salesSeries, settingsData, staffData } from "@/data/operations";
import { applyCatalogFilter } from "@/lib/services/catalog-filter";
import type { MediaAsset, ProductImage } from "@/types";
import type { Repositories } from "../types";

/** Deep copy so callers can never mutate the source data. */
const clone = <T,>(v: T): T => structuredClone(v);

export const localRepositories: Repositories = {
  catalog: {
    async listProducts(filter) {
      const active = productData.filter((p) => p.status === "active");
      return clone(filter ? applyCatalogFilter(active, filter) : active);
    },
    async getProductBySlug(slug) {
      return clone(productData.find((p) => p.slug === slug) ?? null);
    },
    async getProductById(id) {
      return clone(productData.find((p) => p.id === id) ?? null);
    },
    async getProductsByIds(ids) {
      return clone(productData.filter((p) => ids.includes(p.id)));
    },
    async listCategories() {
      return clone([...categoryData].sort((a, b) => a.sortOrder - b.sortOrder));
    },
    async listCollections(opts) {
      return clone(collectionData.filter((c) => opts?.includeDrafts || c.status === "published").sort((a, b) => a.sortOrder - b.sortOrder));
    },
    async getCategoryBySlug(slug) {
      return clone(categoryData.find((c) => c.slug === slug) ?? null);
    },
    async getCollectionBySlug(slug) {
      return clone(collectionData.find((c) => c.slug === slug) ?? null);
    },
  },
  commerce: {
    async listCurrencies() { return clone(currencyData); },
    async listMarkets() { return clone(marketData.filter((m) => m.active)); },
    async listCountries() { return clone(countryData); },
    async listShippingMethods(marketId) { return clone(shippingData.filter((s) => s.active && (!marketId || s.marketId === marketId))); },
    async listTaxRules() { return clone(taxData); },
  },
  content: {
    async getHomepage() { return clone(homepageData); },
    async listMedia() {
      const seen = new Map<string, MediaAsset>();
      const add = (img: ProductImage, folder: MediaAsset["folder"], productId?: string) => {
        if (!img.src || seen.has(img.id)) return;
        seen.set(img.id, { ...img, filename: img.src.split("/").pop()!.split("?")[0], folder, productId, sizeKb: 0, uploadedAt: "2026-11-01T09:00:00.000Z" });
      };
      productData.forEach((p) => p.colours.forEach((c) => c.images.forEach((img) => add(img, "products", p.id))));
      Object.values(campaign).forEach((img) => add(img, "campaigns"));
      collectionData.forEach((c) => add(c.hero, "editorial"));
      categoryData.forEach((c) => c.image && add(c.image, "editorial"));
      return clone([...seen.values()]);
    },
  },
  operations: {
    async listOrders() { return clone(orderData); },
    async getOrder(id) { return clone(orderData.find((o) => o.id === id) ?? null); },
    async listCustomers() { return clone(customerData); },
    async listDiscounts() { return clone(discountData); },
    async listStaff() { return clone(staffData); },
    async listAuditLog() { return clone(auditData); },
    async getSettings() { return clone(settingsData); },
    async getSalesSeries() { return clone(salesSeries); },
  },
};
