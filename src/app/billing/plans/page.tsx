import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { planAmounts, planLabels, PlanKey } from "@/server/billing/plans";
import { startCheckoutAction } from "@/app/billing/actions";

const paidPlans: PlanKey[] = ["trial", "monthly", "quarterly", "semiannual", "annual"];

export default function PlansPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Escolha seu plano"
        description="Selecione um plano para ativar a assinatura da clínica."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {paidPlans.map((plan) => (
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
    </div>
  );
}
