import type { Metadata } from "next";
import { AuditLogView } from "@/components/admin/views/store";

export const metadata: Metadata = { title: "Audit log" };

export default function Page() {
  return <AuditLogView />;
}
