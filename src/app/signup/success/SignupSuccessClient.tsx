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

const POLL_INTERVAL_MS = 2000;
const MAX_AUTO_POLL_ATTEMPTS = 45;
const REDIRECT_SECONDS = 5;
const DASHBOARD_REDIRECT_URL = "/dashboard?welcome=1";

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
  const [countdown, setCountdown] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    setError(null);

    if (!sessionId && !intentId) {
      setLoading(false);
      setReady(true);
      setStatusMessage("Pagamento confirmado.");
      setCountdown((current) => current ?? REDIRECT_SECONDS);
      return true;
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
      setCountdown((current) => current ?? REDIRECT_SECONDS);
      return true;
    }

    if (data.job?.status === "failed") {
      setReady(false);
      setLoading(false);
      setError(data.job.errorMessage || "Falha ao ativar a conta.");
      setCountdown(null);
      return true;
    }

    setReady(false);
    setLoading(true);
    setCountdown(null);
    return false;
  }, [intentId, sessionId]);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;

    const run = async () => {
      try {
        const stop = await fetchStatus();
        if (cancelled || stop) return;
        interval = setInterval(async () => {
          if (cancelled) return;

          attempts += 1;
          if (attempts >= MAX_AUTO_POLL_ATTEMPTS) {
            setLoading(false);
            setError(
              "O provisionamento demorou mais que o esperado. Clique em Atualizar status para tentar novamente."
            );
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
            return;
          }

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
        }, POLL_INTERVAL_MS);
      } catch (initialError) {
        setLoading(false);
        setError((initialError as Error).message);
        setCountdown(null);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [fetchStatus]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      window.location.assign(DASHBOARD_REDIRECT_URL);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((value) => (value === null ? null : value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">
          {ready ? "Sucesso! Sua conta esta pronta para uso!" : "Ativando sua conta"}
        </h1>
        <p className="text-muted-foreground">
          {ready
            ? `Redirecionando para o dashboard em ${countdown ?? REDIRECT_SECONDS}s.`
            : "Estamos concluindo o provisionamento de usuario, clinica e assinatura."}
        </p>
        <div className="rounded-md border px-3 py-2 text-sm">
          {loading ? `Processando... ${statusMessage}` : statusMessage}
        </div>
        {error ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="flex justify-center gap-2">
          {ready ? (
            <Link href={DASHBOARD_REDIRECT_URL}>
              <Button>Ir para dashboard agora</Button>
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
