import { NoAccess } from "@/components/admin/ui";
import { staffPage } from "@/server/admin/guard";
import { OrderDocument } from "../doc";

export const metadata = { title: "Packing slip" };

export default async function PackingPage(props: PageProps<"/admin/orders/[id]/packing-slip">) {
  const { allowed } = await staffPage("orders.view");
  if (!allowed) return <NoAccess permission="orders.view" />;
  return <OrderDocument id={(await props.params).id} kind="packing" />;
}
