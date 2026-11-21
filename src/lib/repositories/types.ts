import type {
  AuditLogEntry, CatalogFilter, Category, Collection, Country, CurrencyDefinition, Customer, Discount,
  HomepageContent, Market, MediaAsset, Order, Product, ShippingMethod, StaffMember, StoreSettings, TaxRule,
} from "@/types";

/**
 * Repository contracts. The UI and services depend ONLY on these interfaces.
 * `local/` implements them with structured in-repo data; `supabase/` will implement
 * the same contracts against PostgreSQL (with RLS) without UI changes.
 */

export interface CatalogRepository {
  listProducts(filter?: CatalogFilter): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductById(id: string): Promise<Product | null>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
  listCategories(): Promise<Category[]>;
  listCollections(opts?: { includeDrafts?: boolean }): Promise<Collection[]>;
  getCategoryBySlug(slug: string): Promise<Category | null>;
  getCollectionBySlug(slug: string): Promise<Collection | null>;
}

export interface CommerceRepository {
  listCurrencies(): Promise<CurrencyDefinition[]>;
  listMarkets(): Promise<Market[]>;
  listCountries(): Promise<Country[]>;
  listShippingMethods(marketId?: string): Promise<ShippingMethod[]>;
  listTaxRules(): Promise<TaxRule[]>;
}

export interface ContentRepository {
  getHomepage(): Promise<HomepageContent>;
  listMedia(): Promise<MediaAsset[]>;
}

/** Admin-only repositories. In production every call passes through server-side authorization + RLS. */
export interface OperationsRepository {
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  listCustomers(): Promise<Customer[]>;
  listDiscounts(): Promise<Discount[]>;
  listStaff(): Promise<StaffMember[]>;
  listAuditLog(): Promise<AuditLogEntry[]>;
  getSettings(): Promise<StoreSettings>;
  getSalesSeries(): Promise<{ date: string; revenue: number; orders: number }[]>;
}

export interface Repositories {
  catalog: CatalogRepository;
  commerce: CommerceRepository;
  content: ContentRepository;
  operations: OperationsRepository;
}
