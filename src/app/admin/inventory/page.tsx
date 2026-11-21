import type { Metadata } from "next";
import { InventoryView } from "@/components/admin/views/catalog";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return <InventoryView />;
}
