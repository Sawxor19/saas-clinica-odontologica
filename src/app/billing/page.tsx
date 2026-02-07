import Link from "next/link";
import { cancelSubscriptionAction, openBillingPortal } from "@/app/billing/actions";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/layout/DataTable";
import { Badge } from "@/components/ui/badge";
import { getBillingSummary } from "@/server/services/billing";
import { planLabels, planAmounts } from "@/server/billing/plans";

export default async function BillingPage() {
  const { subscription, payments } = await getBillingSummary();
  const canCancel = ["active", "trialing", "past_due", "unpaid"].includes(
    subscription.status
  );
  const hasPaymentIssue = [
    "past_due",
    "unpaid",
    "incomplete",
    "incomplete_expired",
  ].includes(subscription.status);

  const formatBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

  const formatDate = (value?: string | null) =>
    value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

  const lastPayment = payments[0];
  const paymentRows = payments.map((payment) => ({
    ...payment,
    paid_at: formatDate(payment.paid_at),
    amount: formatBRL.format(payment.amount),
  }));

  const statusLabel: Record<string, string> = {
    active: "Ativa",
    trialing: "Em teste",
    past_due: "Em atraso",
    unpaid: "Não paga",
    canceled: "Cancelada",
    incomplete: "Incompleta",
    incomplete_expired: "Expirada",
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Assinatura"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/profile">
              <Button variant="outline">Voltar para perfil</Button>
            </Link>
            <Link href="/signup/plans">
              <Button variant="secondary">Trocar plano</Button>
            </Link>
            {canCancel ? (
              <form action={cancelSubscriptionAction}>
                <Button variant="destructive">Cancelar assinatura</Button>
              </form>
            ) : null}
            <form action={openBillingPortal}>
              <Button variant="outline">Gerenciar no Stripe</Button>
            </form>
          </div>
        }
      />
      {hasPaymentIssue ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span>
            Pagamento não confirmado no vencimento. A assinatura será cancelada
            se o pagamento não for regularizado.
          </span>
          <form action={openBillingPortal}>
            <Button size="sm" variant="outline">
              Regularizar pagamento
            </Button>
          </form>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Plano atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{planLabels[subscription.plan as keyof typeof planLabels] ?? subscription.plan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline">{statusLabel[subscription.status] ?? subscription.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-medium">{formatBRL.format(planAmounts[subscription.plan as keyof typeof planAmounts] ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Próximo vencimento</span>
              <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
            </div>
            {canCancel ? (
              <p className="text-xs text-muted-foreground">
                O cancelamento é aplicado ao fim do período atual.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Último pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">{formatDate(lastPayment?.paid_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-medium">{lastPayment ? formatBRL.format(lastPayment.amount) : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-medium truncate" title={lastPayment?.stripe_invoice_id ?? "—"}>
                {lastPayment?.stripe_invoice_id ?? "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Histórico completo abaixo. Valores exibidos em BRL.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <form action={openBillingPortal} className="contents">
              <Button type="submit" variant="outline" className="w-full">
                Atualizar forma de pagamento
              </Button>
            </form>
            <Link href="/signup/plans" className="contents">
              <Button variant="outline" className="w-full">
                Ver outros planos
              </Button>
            </Link>
            {canCancel ? (
              <form action={cancelSubscriptionAction} className="contents">
                <Button type="submit" variant="destructive" className="w-full">
                  Cancelar assinatura
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: "paid_at", label: "Data" },
              { key: "amount", label: "Valor" },
              { key: "stripe_invoice_id", label: "Invoice" },
            ]}
            data={paymentRows}
            searchKeys={["paid_at", "amount", "stripe_invoice_id"]}
            searchPlaceholder="Buscar por data, valor ou invoice"
          />
        </CardContent>
      </Card>
    </div>
  );
}
