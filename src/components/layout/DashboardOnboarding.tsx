"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ONBOARDING_KEY = "clinica:onboarding:welcome-v1";

const TOUR_STEPS = [
  {
    title: "Dashboard",
    description: "Acompanhe indicadores, alertas e acessos rapidos.",
    href: "/dashboard",
  },
  {
    title: "Pacientes",
    description: "Cadastre e organize os pacientes da clinica.",
    href: "/dashboard/patients",
  },
  {
    title: "Agenda",
    description: "Gerencie agendamentos e status das consultas.",
    href: "/dashboard/schedule",
  },
  {
    title: "Financeiro",
    description: "Controle receitas, despesas e pagamentos.",
    href: "/dashboard/finance",
  },
] as const;

type Stage = "hidden" | "welcome" | "tourPrompt" | "tour";

function markOnboardingSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "true");
}

function hasSeenOnboarding() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function DashboardOnboarding() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>("hidden");
  const [stepIndex, setStepIndex] = useState(0);
  const welcomeParam = useMemo(() => searchParams.get("welcome"), [searchParams]);

  useEffect(() => {
    if (welcomeParam !== "1") return;

    let openTimer: ReturnType<typeof setTimeout> | null = null;
    if (!hasSeenOnboarding()) {
      openTimer = setTimeout(() => {
        setStage("welcome");
      }, 0);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const target = params.size ? `${pathname}?${params.toString()}` : pathname;
    router.replace(target);

    return () => {
      if (openTimer) clearTimeout(openTimer);
    };
  }, [pathname, router, searchParams, welcomeParam]);

  function closeAll() {
    markOnboardingSeen();
    setStage("hidden");
    setStepIndex(0);
  }

  function openTour() {
    setStepIndex(0);
    setStage("tour");
  }

  function goToProfileAndContinue() {
    router.push("/dashboard/profile");
    setStage("tourPrompt");
  }

  if (stage === "hidden") return null;

  const step = TOUR_STEPS[stepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      {stage === "welcome" ? (
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Parabens! Complete seu perfil para usar o sistema.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Revise seus dados em Meu perfil para liberar todas as funcoes da clinica.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={goToProfileAndContinue}>
                Abrir meu perfil
              </Button>
              <Button type="button" onClick={() => setStage("tourPrompt")}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stage === "tourPrompt" ? (
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Fazer tour rapido do sistema?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O tour apresenta os modulos principais para o primeiro uso.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeAll}>
                Agora nao
              </Button>
              <Button type="button" onClick={openTour}>
                Iniciar tour
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stage === "tour" ? (
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>
              Tour do sistema ({stepIndex + 1}/{TOUR_STEPS.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border px-4 py-3">
              <div className="text-sm font-semibold">{step.title}</div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                >
                  Anterior
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push(step.href)}>
                  Abrir modulo
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={closeAll}>
                  Encerrar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (stepIndex >= TOUR_STEPS.length - 1) {
                      closeAll();
                      return;
                    }
                    setStepIndex((value) => Math.min(TOUR_STEPS.length - 1, value + 1));
                  }}
                >
                  {stepIndex >= TOUR_STEPS.length - 1 ? "Concluir" : "Proximo"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
