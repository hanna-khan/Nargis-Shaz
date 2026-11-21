import type { Metadata } from "next";
import { ProductEditor } from "@/components/admin/views/catalog";

export const metadata: Metadata = { title: "Add product" };

export default function Page() {
  return <ProductEditor />;
}
