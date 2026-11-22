import { NoAccess } from "@/components/admin/ui";
import { staffPage } from "@/server/admin/guard";
import { OrderDocument } from "../doc";

export const metadata = { title: "Invoice" };

export default async function InvoicePage(props: PageProps<"/admin/orders/[id]/invoice">) {
  const { allowed } = await staffPage("orders.view");
  if (!allowed) return <NoAccess permission="orders.view" />;
  return <OrderDocument id={(await props.params).id} kind="invoice" />;
}
