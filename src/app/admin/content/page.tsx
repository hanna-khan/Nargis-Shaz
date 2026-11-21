import type { Metadata } from "next";
import { ContentView } from "@/components/admin/views/store";

export const metadata: Metadata = { title: "Homepage content" };

export default function Page() {
  return <ContentView />;
}
