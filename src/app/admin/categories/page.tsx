import type { Metadata } from "next";
import { CategoriesView } from "@/components/admin/views/catalog";

export const metadata: Metadata = { title: "Categories" };

export default function Page() {
  return <CategoriesView />;
}
