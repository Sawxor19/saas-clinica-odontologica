"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/server/db/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CheckEmailResponse = {
  emailVerified?: boolean;
  error?: string;
};

function decodeSearchParam(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function getAuthLinkErrorMessage(errorCode: string, errorDescription: string) {
  const description = decodeSearchParam(errorDescription);
  if (errorCode === "otp_expired") {
    return "Este link de confirmacao expirou. Solicite um novo e-mail de confirmacao.";
  }
  if (description) {
    return description;
  }
  return "Link invalido ou expirado. Solicite novo e-mail de confirmacao.";
}

async function refreshEmailVerification(intentId: string): Promise<CheckEmailResponse> {
  const response = await fetch("/api/signup/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intentId }),
  });

  const data = (await response.json().catch(() => ({}))) as CheckEmailResponse;
  if (!response.ok) {
    return { error: data?.error || "Nao foi possivel verificar o e-mail." };
  }

  return data;
}

export default function SignupVerifyClient() {
  const router = useRouter();
  const params = useSearchParams();
  const intentIdFromQuery = useMemo(() => params.get("intentId") || "", [params]);
  const code = useMemo(() => params.get("code") || "", [params]);
  const authError = useMemo(() => params.get("error") || "", [params]);
  const authErrorCode = useMemo(() => params.get("error_code") || "", [params]);
  const authErrorDescription = useMemo(
    () => params.get("error_description") || "",
    [params]
  );

  const [intentId, setIntentId] = useState(intentIdFromQuery);
  const [emailVerified, setEmailVerified] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!emailCooldown) return;
    const timer = setInterval(
      () => setEmailCooldown((value) => Math.max(0, value - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [emailCooldown]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setInitializing(true);
      setError(null);
      const linkErrorMessage = authError
        ? getAuthLinkErrorMessage(authErrorCode, authErrorDescription)
        : null;

      const supabase = supabaseClient();
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            if (!active) return;
            setError(linkErrorMessage || "Link invalido ou expirado. Solicite novo e-mail de confirmacao.");
            setInitializing(false);
            return;
          }
        }
      }

      let resolvedIntentId = intentIdFromQuery;

      if (!resolvedIntentId) {
        const resolveResponse = await fetch("/api/signup/resolve-intent", { method: "POST" });
        const resolveData = (await resolveResponse.json().catch(() => ({}))) as {
          intentId?: string;
          emailVerified?: boolean;
          error?: string;
        };

        if (!resolveResponse.ok || !resolveData.intentId) {
          if (!active) return;
          setError(
            linkErrorMessage ||
              resolveData?.error ||
              "Nao foi possivel localizar seu cadastro pendente."
          );
          setInitializing(false);
          return;
        }

        resolvedIntentId = resolveData.intentId;
        if (!active) return;

        setIntentId(resolvedIntentId);
        if (typeof resolveData.emailVerified === "boolean") {
          setEmailVerified(resolveData.emailVerified);
          if (resolveData.emailVerified) {
            setMessage("E-mail confirmado!");
          }
        }
        router.replace(`/signup/verify?intentId=${resolvedIntentId}`);
      } else {
        if (!active) return;
        setIntentId(resolvedIntentId);
      }

      const checkResult = await refreshEmailVerification(resolvedIntentId);
      if (!active) return;

      if (checkResult.error) {
        setError(checkResult.error);
      } else {
        const verified = Boolean(checkResult.emailVerified);
        setEmailVerified(verified);
        if (verified) {
          setMessage("E-mail confirmado!");
        }
      }

      setInitializing(false);
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [authError, authErrorCode, authErrorDescription, code, intentIdFromQuery, router]);

  async function handleCheckEmail() {
    if (!intentId) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    const result = await refreshEmailVerification(intentId);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    const verified = Boolean(result.emailVerified);
    setEmailVerified(verified);
    setMessage(verified ? "E-mail confirmado!" : "E-mail ainda nao confirmado.");
  }

  async function handleResendEmail() {
    if (!intentId) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch("/api/signup/resend-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data?.error || "Nao foi possivel reenviar o e-mail.");
      return;
    }

    setEmailCooldown(60);
    setMessage("E-mail de confirmacao reenviado.");
  }

  const readyForCheckout = emailVerified && Boolean(intentId);
  const disableActions = loading || initializing || !intentId;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Verifique seu cadastro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!intentId ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Intent nao encontrado. Aguarde a identificacao automatica ou volte ao cadastro.
            </div>
          ) : null}

          <div className="space-y-2 rounded-lg border p-4">
            <div className="font-medium">1) Confirme seu e-mail</div>
            <p className="text-sm text-muted-foreground">
              Acesse sua caixa de entrada e clique no link de confirmacao.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleCheckEmail} disabled={disableActions}>
                Ja confirmei
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendEmail}
                disabled={disableActions || emailCooldown > 0}
              >
                {emailCooldown > 0 ? `Reenviar em ${emailCooldown}s` : "Reenviar e-mail"}
              </Button>
            </div>
            <div className="text-sm">Status: {emailVerified ? "Confirmado" : "Pendente"}</div>
          </div>

          {initializing ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Validando seu link de confirmacao...
            </div>
          ) : null}

          {message ? (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={!readyForCheckout}
            onClick={() => router.push(`/signup/billing?intentId=${intentId}`)}
          >
            Continuar para pagamento
          </Button>

          {!intentId ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/signup")}>
                Voltar ao cadastro
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/login")}>
                Ir para login
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
