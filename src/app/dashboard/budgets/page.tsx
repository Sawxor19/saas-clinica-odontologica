import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmForm } from "@/components/ui/confirm-form";
import {
  approveBudgetAndIssueContractAction,
  createBudgetAction,
  deleteBudgetAction,
  deleteBudgetItemAction,
  issueBudgetContractAction,
  updateBudgetStatusAction,
} from "@/app/dashboard/budgets/actions";
import { BudgetForm } from "@/app/dashboard/budgets/BudgetForm";
import { getBudgets } from "@/server/services/budgets";
import { getClinicContext } from "@/server/auth/context";
import { listPatients } from "@/server/repositories/patients";
import { listProcedures } from "@/server/repositories/procedures";

function formatStatus(status: string) {
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Recusado";
  return "Rascunho";
}

function statusClassName(status: string) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function formatCurrency(value: number) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

export default async function BudgetsPage() {
  const { clinicId } = await getClinicContext();
  const [budgets, patientsRaw, proceduresRaw] = await Promise.all([
    getBudgets(),
    listPatients(clinicId),
    listProcedures(clinicId),
  ]);

  const patients = [...(patientsRaw ?? [])].sort((a, b) =>
    String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""), "pt-BR")
  );
  const procedures = [...proceduresRaw].sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR")
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Orcamentos"
        description="Monte propostas por procedimento e emita contrato ao aprovar."
      />

      <Card>
        <CardHeader>
          <CardTitle>Novo orcamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBudgetAction} className="space-y-4">
            <BudgetForm patients={patients} procedures={procedures} />
            <div className="flex justify-end">
              <Button type="submit">Salvar orcamento</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orcamentos criados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgets.length === 0 ? (
            <EmptyState
              title="Nenhum orcamento criado"
              description="Crie o primeiro orcamento para iniciar as propostas de tratamento."
            />
          ) : (
            budgets.map((budget) => (
              <div
                key={budget.id}
                className="space-y-3 rounded-2xl border border-border/70 bg-background/96 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">
                      <Link href={`/dashboard/patients/${budget.patient_id}`} className="text-primary">
                        {budget.patient_name}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Criado em{" "}
                      {new Date(budget.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClassName(budget.status)}`}
                    >
                      {formatStatus(budget.status)}
                    </span>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    <div>Subtotal: R$ {formatCurrency(budget.subtotal)}</div>
                    <div>Desconto: R$ {formatCurrency(budget.discount_amount)}</div>
                    <div className="text-sm font-semibold text-foreground">
                      Total: R$ {formatCurrency(budget.total)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 rounded-xl border border-border/70 bg-card/95 p-3 text-xs">
                  {budget.items.length === 0 ? (
                    <div className="text-muted-foreground">Sem itens no orcamento.</div>
                  ) : (
                    budget.items.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>{item.procedure_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {item.quantity} x R$ {formatCurrency(item.unit_price)}
                          </span>
                          <ConfirmForm
                            action={deleteBudgetItemAction}
                            message="Remover este item do orcamento?"
                          >
                            <input type="hidden" name="budget_id" value={budget.id} />
                            <input type="hidden" name="item_id" value={item.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px] text-destructive"
                            >
                              Remover item
                            </Button>
                          </ConfirmForm>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {budget.notes ? (
                  <p className="text-xs text-muted-foreground">Obs: {budget.notes}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {budget.contract_url ? (
                    <a href={budget.contract_url} target="_blank" rel="noreferrer">
                      <Button type="button" size="sm" variant="outline">
                        Abrir contrato
                      </Button>
                    </a>
                  ) : null}

                  {budget.status !== "approved" ? (
                    <form action={approveBudgetAndIssueContractAction}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <input type="hidden" name="patient_id" value={budget.patient_id} />
                      <Button type="submit" size="sm">
                        Aprovar + emitir contrato
                      </Button>
                    </form>
                  ) : (
                    <form action={issueBudgetContractAction}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <input type="hidden" name="patient_id" value={budget.patient_id} />
                      <Button type="submit" size="sm" variant="outline">
                        Reemitir contrato
                      </Button>
                    </form>
                  )}

                  {budget.status !== "draft" ? (
                    <form action={updateBudgetStatusAction}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <input type="hidden" name="status" value="draft" />
                      <Button type="submit" size="sm" variant="outline">
                        Voltar rascunho
                      </Button>
                    </form>
                  ) : null}

                  {budget.status !== "rejected" ? (
                    <form action={updateBudgetStatusAction}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <Button type="submit" size="sm" variant="outline" className="text-amber-700">
                        Marcar recusado
                      </Button>
                    </form>
                  ) : null}

                  <ConfirmForm
                    action={deleteBudgetAction}
                    message="Remover este orcamento e seus itens?"
                  >
                    <input type="hidden" name="budget_id" value={budget.id} />
                    <Button type="submit" size="sm" variant="outline" className="text-destructive">
                      Remover
                    </Button>
                  </ConfirmForm>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
