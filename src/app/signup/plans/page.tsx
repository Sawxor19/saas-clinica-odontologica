import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/layout/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { planAmounts, planLabels, PlanKey } from "@/server/billing/plans";
import { startCheckoutAction } from "@/app/billing/actions";
import { getBillingSummary } from "@/server/services/billing";

const planOrder: PlanKey[] = ["trial", "monthly", "quarterly", "semiannual", "annual"];

export default async function SignupPlansPage() {
  const { payments } = await getBillingSummary();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Escolha seu plano"
        description="Finalize a assinatura para liberar o acesso ao sistema."
        actions={
          <Link href="/dashboard/profile">
            <Button variant="outline">Voltar para o perfil</Button>
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {planOrder.map((plan) => (
          <Card key={plan}>
            <CardHeader>
              <CardTitle>{planLabels[plan]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-semibold">
                R$ {planAmounts[plan].toFixed(2)}
              </div>
              <form action={startCheckoutAction}>
                <input type="hidden" name="plan" value={plan} />
                <Button type="submit" className="w-full">
                  Assinar
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
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
            data={payments}
          />
        </CardContent>
      </Card>
    </div>
  );
}
