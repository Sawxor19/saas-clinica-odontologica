import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getReportsSummary } from "@/server/services/reports";
import Link from "next/link";
import { DataTable } from "@/components/layout/DataTable";
import { BarChart3, Percent } from "lucide-react";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { start?: string; end?: string };
}) {
  const start = searchParams?.start;
  const end = searchParams?.end;
  const summary = await getReportsSummary(start, end);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Relatórios"
        description="Receita por procedimento e dentista, além da conversão de orçamentos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex flex-wrap items-center gap-2" method="get">
              <input
                name="start"
                type="date"
                defaultValue={start ?? ""}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              />
              <input
                name="end"
                type="date"
                defaultValue={end ?? ""}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              />
              <button className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent">
                Filtrar
              </button>
            </form>
            <Link
              href={`/api/reports/export?type=procedures${start ? `&start=${start}` : ""}${end ? `&end=${end}` : ""}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              Exportar procedimentos (CSV)
            </Link>
            <Link
              href={`/api/reports/export?type=dentists${start ? `&start=${start}` : ""}${end ? `&end=${end}` : ""}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              Exportar dentistas (CSV)
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Taxa de conversão"
          value={`${summary.conversionRate}%`}
          icon={<Percent className="h-4 w-4" />}
          trend={{ value: `${summary.approvedBudgets}/${summary.totalBudgets} aprovados`, positive: true }}
        />
        <StatCard
          title="Procedimentos (mês)"
          value={String(summary.procedureReport.length)}
          icon={<BarChart3 className="h-4 w-4" />}
          trend={{ value: "Receita consolidada", positive: true }}
        />
        <StatCard
          title="Dentistas (mês)"
          value={String(summary.dentistReport.length)}
          icon={<BarChart3 className="h-4 w-4" />}
          trend={{ value: "Receita consolidada", positive: true }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita por procedimento</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: "name", label: "Procedimento" },
                { key: "total", label: "Receita" },
              ]}
              data={summary.procedureReport.map((item) => ({
                ...item,
                total: `R$ ${item.total.toFixed(2)}`,
              }))}
              searchPlaceholder="Buscar procedimento"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por dentista</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: "name", label: "Dentista" },
                { key: "total", label: "Receita" },
              ]}
              data={summary.dentistReport.map((item) => ({
                ...item,
                total: `R$ ${item.total.toFixed(2)}`,
              }))}
              searchPlaceholder="Buscar dentista"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
