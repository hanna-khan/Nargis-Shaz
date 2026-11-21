import type { Metadata } from "next";
import { CollectionsView } from "@/components/admin/views/catalog";

export const metadata: Metadata = { title: "Collections" };

export default function Page() {
  return <CollectionsView />;
}
