import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetail } from "@/components/admin/views/sales";

export const metadata: Metadata = { title: "Order" };

// Admin records are private and per-request: params are read inside Suspense (no static generation).
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}

export default function Page(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
