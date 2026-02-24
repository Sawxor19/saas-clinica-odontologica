"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type ProvisioningResponse = {
  ready: boolean;
  clinicId: string | null;
  job: {
    jobId: string;
    status: string;
    errorMessage: string | null;
    updatedAt: string;
  } | null;
  subscription: {
    status: string;
    current_period_end: string | null;
  } | null;
  error?: string;
};

const statusLabel: Record<string, string> = {
  received: "Recebido",
  user_ok: "Usuario confirmado",
  profile_ok: "Perfil criado",
  clinic_ok: "Clinica criada",
  membership_ok: "Vinculo criado",
  subscription_ok: "Assinatura criada",
  done: "Concluido",
  failed: "Falhou",
};

export default function SignupSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = useMemo(
    () => searchParams.get("session_id") || "",
    [searchParams]
  );
  const intentId = useMemo(
    () => searchParams.get("intentId") || "",
    [searchParams]
  );
  const [loading, setLoading] = useState(Boolean(sessionId || intentId));
  const [ready, setReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Aguardando processamento..."
  );
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!sessionId && !intentId) {
      setLoading(false);
      setReady(true);
      setStatusMessage("Pagamento confirmado.");
      return;
    }

    const query = new URLSearchParams();
    if (sessionId) query.set("session_id", sessionId);
    if (intentId) query.set("intentId", intentId);

    const response = await fetch(`/api/signup/provisioning-status?${query.toString()}`, {
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as ProvisioningResponse;

    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel consultar o status.");
    }

    if (data.job?.status) {
      const label = statusLabel[data.job.status] || data.job.status;
      setStatusMessage(`Etapa atual: ${label}`);
    } else if (data.subscription?.status) {
      setStatusMessage(`Assinatura: ${data.subscription.status}`);
    }

    if (data.ready) {
      setReady(true);
      setLoading(false);
      setError(null);
      setStatusMessage("Conta ativada com sucesso.");
      return true;
    }

    if (data.job?.status === "failed") {
      setReady(false);
      setLoading(false);
      setError(data.job.errorMessage || "Falha ao ativar a conta.");
      return true;
    }

    setReady(false);
    setLoading(true);
    setError(null);
    return false;
  }, [intentId, sessionId]);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        const stop = await fetchStatus();
        if (cancelled || stop) return;
        interval = setInterval(async () => {
          if (cancelled) return;
          try {
            const shouldStop = await fetchStatus();
            if (shouldStop && interval) {
              clearInterval(interval);
              interval = null;
            }
          } catch (pollError) {
            setLoading(false);
            setError((pollError as Error).message);
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
          }
        }, 2000);
      } catch (initialError) {
        setLoading(false);
        setError((initialError as Error).message);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [fetchStatus]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">
          {ready ? "Conta ativada" : "Ativando sua conta"}
        </h1>
        <p className="text-muted-foreground">
          {ready
            ? "Seu provisionamento foi concluido e o acesso ja pode ser liberado."
            : "Estamos concluindo o provisionamento de usuario, clinica e assinatura."}
        </p>
        <div className="rounded-md border px-3 py-2 text-sm">
          {loading ? "Processando..." : statusMessage}
        </div>
        {error ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="flex justify-center gap-2">
          {ready ? (
            <Link href="/login">
              <Button>Ir para login</Button>
            </Link>
          ) : (
            <Button type="button" variant="outline" onClick={() => void fetchStatus()}>
              Atualizar status
            </Button>
          )}
          <Link href={intentId ? `/signup/billing?intentId=${intentId}` : "/signup/billing"}>
            <Button variant="ghost">Voltar</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
