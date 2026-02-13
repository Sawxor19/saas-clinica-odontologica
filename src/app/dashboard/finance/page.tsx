import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/layout/DataTable";
import { getFinanceSummary } from "@/server/services/finance";
import { Wallet, TrendingUp, AlertTriangle } from "lucide-react";
import { getPayables } from "@/server/services/payables";
import { PayablesTable } from "@/app/dashboard/finance/PayablesTable";
import { PayablesForm } from "@/app/dashboard/finance/PayablesForm";

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

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Financeiro"
        description="Controle claro de entradas, recebíveis e inadimplência."
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
              href="/api/finance/export?type=payables&format=csv"
            >
              Exportar a pagar (CSV)
            </a>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Entradas hoje"
          value={`R$ ${summary.todayTotal.toFixed(2)}`}
          icon={<Wallet className="h-4 w-4" />}
          trend={{ value: "Atualizado", positive: true }}
        />
        <StatCard
          title="A receber (mês)"
          value={`R$ ${summary.monthTotal.toFixed(2)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{ value: "+2%", positive: true }}
        />
        <StatCard
          title="Inadimplência"
          value="R$ 0,00"
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={{ value: "Sem alertas", positive: true }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conciliação do mês</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
          <div>
            <div className="text-xs">Receitas (mês)</div>
            <div className="text-base font-semibold text-foreground">
              R$ {summary.monthTotal.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs">A pagar (mês)</div>
            <div className="text-base font-semibold text-foreground">
              R$ {payablesTotal.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs">Pago (a pagar)</div>
            <div className="text-base font-semibold text-foreground">
              R$ {payablesPaid.toFixed(2)}
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="text-xs">Saldo estimado</div>
            <div className="text-lg font-semibold text-foreground">
              R$ {netMonth.toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos do mês</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: "paid_at", label: "Data" },
              { key: "patient_name", label: "Paciente" },
              { key: "procedure_name", label: "Procedimento" },
              { key: "charge_amount", label: "Valor" },
              { key: "payment_method", label: "Método" },
            ]}
            data={summary.payments}
            searchPlaceholder="Buscar por data ou método"
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
