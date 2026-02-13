export type PlanKey = "trial" | "monthly" | "quarterly" | "semiannual" | "annual";

export const planLabels: Record<PlanKey, string> = {
  trial: "Plano inicial (30 dias)",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

export const planDays: Record<PlanKey, number> = {
  trial: 30,
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  annual: 365,
};

export const planAmounts: Record<PlanKey, number> = {
  trial: 49.9,
  monthly: 49.9,
  quarterly: 139.9,
  semiannual: 269.9,
  annual: 499.9,
};
