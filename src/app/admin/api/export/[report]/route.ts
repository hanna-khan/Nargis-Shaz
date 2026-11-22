import { audit } from "@/server/audit";
import { requireStaff, staffActor } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { apiError, route } from "@/server/http";
import { parseRange, report, REPORTS, toCsv, type ReportKind } from "@/server/admin/reports";

/** GET /admin/api/export/:report?range=… — CSV download (staff session + permission required). */
export const GET = route<{ params: Promise<{ report: string }> }>(async (req, { params }) => {
  const { report: kind } = await params;
  if (!(kind in REPORTS)) return apiError(404, "not_found", "Unknown report");
  const staff = await requireStaff();
  const ok = kind === "orders" ? hasPermission(staff.permissions, "orders.export", staff.isSuperAdmin) || hasPermission(staff.permissions, "reports.export", staff.isSuperAdmin)
    : kind === "customers" ? hasPermission(staff.permissions, "customers.export", staff.isSuperAdmin)
    : hasPermission(staff.permissions, "reports.export", staff.isSuperAdmin);
  if (!ok) return apiError(403, "forbidden", "You don't have permission to export this report.");
  const range = parseRange(Object.fromEntries(new URL(req.url).searchParams));
  const rep = await report(kind as ReportKind, range);
  await audit(staffActor(staff), "report.exported", "report", kind, `Exported ${REPORTS[kind as ReportKind]} (${range.label}, ${rep.rows.length} rows)`);
  return new Response(toCsv(rep), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nargis-shaz-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
});
