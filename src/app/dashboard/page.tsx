import {
  CalendarCheck,
  AlertTriangle,
  Wallet,
  FileText,
  UserPlus,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDashboardData } from "@/server/services/dashboard";

export default async function DashboardPage() {
  const { role, metrics, scheduleToday } = await getDashboardData();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Visão geral"
        description="Resumo inteligente da clínica com alertas e ações rápidas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/patients"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Novo paciente
            </Link>
            <Link
              href="/dashboard/schedule"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <CalendarPlus className="mr-2 h-4 w-4" /> Novo agendamento
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Faturamento do mês"
          value={`R$ ${metrics.revenue.toFixed(2)}`}
          icon={<Wallet className="h-4 w-4" />}
          trend={{ value: "+4%", positive: true }}
        />
        <StatCard
          title="Consultas hoje"
          value={String(metrics.todayAppointments)}
          icon={<CalendarCheck className="h-4 w-4" />}
          trend={{ value: "Agenda em dia", positive: true }}
        />
        <StatCard
          title="Faltas no mês"
          value={String(metrics.missedCount)}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={{ value: "Atenção", positive: false }}
        />
        <StatCard
          title="Orçamentos pendentes"
          value={String(metrics.pendingBudgets)}
          icon={<FileText className="h-4 w-4" />}
          trend={{ value: "Revisar", positive: false }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agenda de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduleToday.length === 0 ? (
              <EmptyState
                title="Nenhum atendimento hoje 🎉"
                description="Aproveite para organizar a agenda ou fazer follow-ups."
              />
            ) : (
              <div className="space-y-2">
                {scheduleToday.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">Consulta marcada</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.starts_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.patient_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          R$ {Number(item.charge_amount ?? 0).toFixed(2)}
                        </p>
                        {item.payment_status === "paid" ? (
                          <p className="text-[10px] text-emerald-400">
                            Pago {item.payment_method ? `(${item.payment_method})` : ""}
                          </p>
                        ) : (
                          <p className="text-[10px] text-amber-400">Não pago</p>
                        )}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas inteligentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
              {role === "dentist"
                ? "3 pacientes sem retorno há 90 dias."
                : "2 orçamentos aprovados aguardam pagamento."}
            </div>
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">
              0 parcelas vencidas nesta semana.
            </div>
            <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-sky-200">
              {role === "receptionist"
                ? "Confirme os atendimentos das próximas 24h."
                : "Sugestão de retorno automático ativada."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
