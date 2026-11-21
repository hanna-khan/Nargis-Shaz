import type { Metadata } from "next";
import { ProductsView } from "@/components/admin/views/catalog";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return <ProductsView />;
}
