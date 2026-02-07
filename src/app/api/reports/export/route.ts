import { getReportsSummary } from "@/server/services/reports";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((key) => {
      const value = row[key];
      const escaped = String(value ?? "").replace(/"/g, '""');
      return `"${escaped}"`;
    });
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const { permissions } = await getClinicContext();
  assertPermission(permissions, "readFinance");

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "procedures";
  const start = url.searchParams.get("start") || undefined;
  const end = url.searchParams.get("end") || undefined;

  const summary = await getReportsSummary(start, end);
  const rows =
    type === "dentists"
      ? summary.dentistReport.map((item) => ({
          name: item.name,
          total: item.total.toFixed(2),
        }))
      : summary.procedureReport.map((item) => ({
          name: item.name,
          total: item.total.toFixed(2),
        }));

  const csv = toCsv(rows);
  const filename = type === "dentists" ? "dentistas" : "procedimentos";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=relatorio-${filename}.csv`,
    },
  });
}
