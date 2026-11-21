import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductEditor } from "@/components/admin/views/catalog";

export const metadata: Metadata = { title: "Edit product" };

// Admin records are private and per-request: params are read inside Suspense (no static generation).
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditor id={id} />;
}

export default function Page(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
