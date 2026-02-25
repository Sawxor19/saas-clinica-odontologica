import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/layout/DataTable";
import { getFinanceSummary } from "@/server/services/finance";
import { Wallet, TrendingUp, AlertTriangle, ChartNoAxesCombined, ReceiptText } from "lucide-react";
import { getPayables } from "@/server/services/payables";
import { PayablesTable } from "@/app/dashboard/finance/PayablesTable";
import { PayablesForm } from "@/app/dashboard/finance/PayablesForm";
import { StatusBadge } from "@/components/ui/status-badge";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export default async function FinancePage() {
  const summary = await getFinanceSummary();
  const payables = await getPayables();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const payablesThisMonth = payables.filter((item) => {
    const due = new Date(item.due_date);
    return due >= monthStart && due <= monthEnd;
  });

  const payablesTotal = payablesThisMonth.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const payablesPaid = payablesThisMonth
    .filter((item) => item.is_paid)
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const netMonth = summary.monthTotal - payablesTotal;
  const overdueHasAlert = summary.overdueTotal > 0;
  const receivablesHasData = summary.monthReceivableTotal > 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Financeiro"
        description="Controle claro de entradas, contas a receber e inadimplencia."
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
              href="/api/finance/export?type=payments&format=csv"
            >
              Exportar pagamentos (CSV)
            </a>
            <a
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
              href="/api/finance/export?type=payments&format=pdf"
            >
              Exportar pagamentos (PDF)
            </a>
            <a
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
              href="/api/finance/export?type=receivables&format=csv"
            >
              Exportar a receber (CSV)
            </a>
            <a
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
              href="/api/finance/export?type=receivables&format=pdf"
            >
              Exportar a receber (PDF)
            </a>
            <a
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
              href="/api/finance/export?type=payables&format=csv"
            >
              Exportar a pagar (CSV)
            </a>
            <a
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
              href="/api/finance/export?type=payables&format=pdf"
            >
              Exportar a pagar (PDF)
            </a>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Entradas hoje"
          value={formatCurrency(summary.todayTotal)}
          icon={<Wallet className="h-4 w-4" />}
          trend={{ value: "Atualizado", positive: true }}
        />
        <StatCard
          title="Contas a receber (mes)"
          value={formatCurrency(summary.monthReceivableTotal)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{
            value: receivablesHasData ? `${summary.receivables.length} titulo(s)` : "Sem pendencias",
            positive: true,
          }}
        />
        <StatCard
          title="Despesas (mes)"
          value={formatCurrency(payablesTotal)}
          icon={<ReceiptText className="h-4 w-4" />}
          trend={{
            value: payablesThisMonth.length
              ? `${payablesThisMonth.length} conta(s)`
              : "Sem contas no periodo",
            positive: false,
          }}
        />
        <StatCard
          title="Lucro mensal automatico"
          value={formatCurrency(netMonth)}
          icon={<ChartNoAxesCombined className="h-4 w-4" />}
          trend={{
            value: netMonth >= 0 ? "Resultado positivo" : "Resultado negativo",
            positive: netMonth >= 0,
          }}
        />
        <StatCard
          title="Atraso de pagamento"
          value={formatCurrency(summary.overdueTotal)}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={{
            value: summary.overdueCount ? `${summary.overdueCount} em atraso` : "Sem alertas",
            positive: !overdueHasAlert,
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conciliacao do mes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <div className="text-xs">Receitas liquidadas (mes)</div>
            <div className="text-base font-semibold text-foreground">{formatCurrency(summary.monthTotal)}</div>
          </div>
          <div>
            <div className="text-xs">A pagar (mes)</div>
            <div className="text-base font-semibold text-foreground">{formatCurrency(payablesTotal)}</div>
          </div>
          <div>
            <div className="text-xs">Pago (a pagar)</div>
            <div className="text-base font-semibold text-foreground">{formatCurrency(payablesPaid)}</div>
          </div>
          <div>
            <div className="text-xs">Contas a receber (mes)</div>
            <div className="text-base font-semibold text-foreground">
              {formatCurrency(summary.monthReceivableTotal)}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs">Atrasos de pagamento</div>
            <div className="text-base font-semibold text-foreground">{formatCurrency(summary.overdueTotal)}</div>
          </div>
          <div className="md:col-span-3">
            <div className="text-xs">Lucro mensal automatico</div>
            <div className="text-lg font-semibold text-foreground">{formatCurrency(netMonth)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entradas por paciente (mes)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: "paid_at",
                label: "Data",
                render: (row) => formatDate(row.paid_at),
              },
              { key: "patient_name", label: "Paciente" },
              { key: "procedure_name", label: "Procedimento" },
              {
                key: "charge_amount",
                label: "Valor",
                render: (row) => formatCurrency(Number(row.charge_amount ?? 0)),
              },
              { key: "payment_method", label: "Metodo" },
            ]}
            data={summary.payments}
            searchPlaceholder="Buscar por paciente, data ou metodo"
            searchKeys={["patient_name", "procedure_name", "paid_at", "payment_method"]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas a receber</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: "due_date",
                label: "Vencimento",
                render: (row) => formatDate(row.due_date),
              },
              { key: "patient_name", label: "Paciente" },
              { key: "procedure_name", label: "Procedimento" },
              {
                key: "charge_amount",
                label: "Valor",
                render: (row) => formatCurrency(Number(row.charge_amount ?? 0)),
              },
              {
                key: "due_status",
                label: "Status",
                render: (row) => <StatusBadge status={row.due_status} />,
              },
            ]}
            data={summary.receivables}
            searchPlaceholder="Buscar por paciente, procedimento ou status"
            searchKeys={["patient_name", "procedure_name", "due_status", "due_date"]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>A pagar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PayablesForm />
          <PayablesTable payables={payables} />
        </CardContent>
      </Card>
    </div>
  );
}
