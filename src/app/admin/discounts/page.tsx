import type { Metadata } from "next";
import { DiscountsView } from "@/components/admin/views/sales";

export const metadata: Metadata = { title: "Discounts" };

export default function Page() {
  return <DiscountsView />;
}
