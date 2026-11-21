import type { Metadata } from "next";
import { TeamView } from "@/components/admin/views/store";

export const metadata: Metadata = { title: "Team & roles" };

export default function Page() {
  return <TeamView />;
}
