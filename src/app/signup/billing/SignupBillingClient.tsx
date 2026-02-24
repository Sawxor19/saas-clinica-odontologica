"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { planAmounts, planLabels, PlanKey } from "@/server/billing/plans";

const planOrder: PlanKey[] = ["trial", "monthly", "quarterly", "semiannual", "annual"];

export default function SignupBillingClient() {
  const params = useSearchParams();
  const intentId = useMemo(() => params.get("intentId") || "", [params]);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(plan: PlanKey) {
    if (!intentId || loadingPlan) return;
    setError(null);
    setLoadingPlan(plan);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId, plan }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error || "Falha ao iniciar checkout.");
      setLoadingPlan(null);
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Pagamento"
        description="Escolha o plano e finalize no Stripe."
      />
      {!intentId ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Intent não encontrado. Volte ao cadastro.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
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
              <Button
                type="button"
                className="w-full"
                disabled={Boolean(loadingPlan) || !intentId}
                onClick={() => handleCheckout(plan)}
              >
                {loadingPlan === plan ? "Aguarde..." : "Ir para pagamento"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
