import type { Metadata } from "next";
import { OrdersView } from "@/components/admin/views/sales";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrdersView />;
}
