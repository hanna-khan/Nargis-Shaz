import type { Metadata } from "next";
import { MediaView } from "@/components/admin/views/store";

export const metadata: Metadata = { title: "Media library" };

export default function Page() {
  return <MediaView />;
}
