"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignupVerifyClient() {
  const router = useRouter();
  const params = useSearchParams();
  const intentId = useMemo(() => params.get("intentId") || "", [params]);

  const requirePhoneVerification = process.env.NEXT_PUBLIC_REQUIRE_PHONE_VERIFICATION === "true";

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(!requirePhoneVerification);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [cooldown]);
  useEffect(() => {
    if (!emailCooldown) return;
    const timer = setInterval(
      () => setEmailCooldown((value) => Math.max(0, value - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [emailCooldown]);


  async function handleCheckEmail() {
    if (!intentId) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    const response = await fetch("/api/signup/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data?.error || "Não foi possível verificar o e-mail.");
      return;
    }
    setEmailVerified(Boolean(data.emailVerified));
    setPhoneVerified(Boolean(data.phoneVerified));
    setMessage(data.emailVerified ? "Email confirmado!" : "E-mail ainda não confirmado.");
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
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data?.error || "Nao foi possivel reenviar o email.");
      return;
    }
    setEmailCooldown(60);
    setMessage("Email de confirmacao reenviado.");
  }

  async function handleSendOtp() {
    if (!intentId) return;
    if (!requirePhoneVerification) {
      setMessage("Verificacao de telefone desativada.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    const response = await fetch("/api/signup/send-phone-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data?.error || "Não foi possível enviar o código.");
      return;
    }
    setCooldown(60);
    if (data?.devOtp) {
      setOtp(String(data.devOtp));
      setMessage(`Codigo enviado (dev): ${data.devOtp}`);
      return;
    }
    setMessage("Codigo enviado. Verifique seu SMS/WhatsApp.");
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intentId) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    const response = await fetch("/api/signup/verify-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId, otp }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data?.error || "Código inválido.");
      return;
    }
    setPhoneVerified(true);
    setEmailVerified(Boolean(data.emailVerified));
    setMessage("Telefone verificado com sucesso.");
  }

  const readyForCheckout = emailVerified && (requirePhoneVerification ? phoneVerified : true);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Verifique seu cadastro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!intentId ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Intent não encontrado. Volte ao cadastro.
            </div>
          ) : null}

          <div className="space-y-2 rounded-lg border p-4">
            <div className="font-medium">1) Confirme seu e-mail</div>
            <p className="text-sm text-muted-foreground">
              Acesse sua caixa de entrada e clique no link de confirmacao.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleCheckEmail} disabled={loading || !intentId}>
                Ja confirmei
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendEmail}
                disabled={loading || !intentId || emailCooldown > 0}
              >
                {emailCooldown > 0 ? `Reenviar em ${emailCooldown}s` : "Reenviar email"}
              </Button>
            </div>
            <div className="text-sm">
              Status: {emailVerified ? "Confirmado" : "Pendente"}
            </div>
          </div>

          {requirePhoneVerification ? (
            <div className="space-y-2 rounded-lg border p-4">
              <div className="font-medium">2) Verifique seu telefone</div>
              <p className="text-sm text-muted-foreground">
                Enviamos um codigo por SMS/WhatsApp para o telefone informado.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || cooldown > 0 || !intentId}
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar codigo"}
                </Button>
              </div>
              <form className="mt-3 grid gap-2" onSubmit={handleVerifyOtp}>
                <Input
                  name="otp"
                  placeholder="Digite o codigo"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  required
                />
                <Button type="submit" disabled={loading || !intentId}>
                  Validar codigo
                </Button>
              </form>
              <div className="text-sm">
                Status: {phoneVerified ? "Verificado" : "Pendente"}
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border p-4">
              <div className="font-medium">2) Telefone</div>
              <p className="text-sm text-muted-foreground">
                A verificacao de telefone esta desativada.
              </p>
              <div className="text-sm">Status: Verificado</div>
            </div>
          )}

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
        </CardContent>
      </Card>
    </div>
  );
}
