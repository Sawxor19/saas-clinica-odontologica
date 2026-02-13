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
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/patients"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Novo paciente
            </Link>
            <Link
              href="/dashboard/schedule"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
            >
              <CalendarPlus className="mr-2 h-4 w-4" /> Novo agendamento
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-4"
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
                          <p className="text-[10px] text-emerald-700">
                            Pago {item.payment_method ? `(${item.payment_method})` : ""}
                          </p>
                        ) : (
                          <p className="text-[10px] text-amber-700">Não pago</p>
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              {role === "dentist"
                ? "3 pacientes sem retorno há 90 dias."
                : "2 orçamentos aprovados aguardam pagamento."}
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              0 parcelas vencidas nesta semana.
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-800">
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

