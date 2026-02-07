"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignupVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const intentId = useMemo(() => params.get("intentId") || "", [params]);

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
    setMessage(data.emailVerified ? "E-mail confirmado!" : "E-mail ainda não confirmado.");
  }

  async function handleSendOtp() {
    if (!intentId) return;
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
    setMessage("Código enviado. Verifique seu SMS/WhatsApp.");
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

  const readyForCheckout = emailVerified && phoneVerified;

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
              Acesse sua caixa de entrada e clique no link de confirmação.
            </p>
            <Button type="button" onClick={handleCheckEmail} disabled={loading || !intentId}>
              Já confirmei
            </Button>
            <div className="text-sm">
              Status: {emailVerified ? "Confirmado" : "Pendente"}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-4">
            <div className="font-medium">2) Verifique seu telefone</div>
            <p className="text-sm text-muted-foreground">
              Enviamos um código por SMS/WhatsApp para o telefone informado.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSendOtp} disabled={loading || cooldown > 0 || !intentId}>
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
              </Button>
            </div>
            <form className="mt-3 grid gap-2" onSubmit={handleVerifyOtp}>
              <Input
                name="otp"
                placeholder="Digite o código"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
              <Button type="submit" disabled={loading || !intentId}>
                Validar código
              </Button>
            </form>
            <div className="text-sm">
              Status: {phoneVerified ? "Verificado" : "Pendente"}
            </div>
          </div>

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
