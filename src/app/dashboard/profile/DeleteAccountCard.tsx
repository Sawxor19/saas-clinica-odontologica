"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/server/db/supabaseClient";

const REQUIRED_CONFIRM_TEXT = "EXCLUIR MINHA CONTA";
const SAFETY_DELAY_SECONDS = 8;

type DeleteAccountCardProps = {
  email: string;
  canDeleteOwnAccount: boolean;
  membershipCount: number;
};

export function DeleteAccountCard({
  email,
  canDeleteOwnAccount,
  membershipCount,
}: DeleteAccountCardProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current === null) return null;
        return Math.max(0, current - 1);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const blockerMessage = useMemo(() => {
    if (!canDeleteOwnAccount) {
      return "Somente o admin dono da clinica pode excluir a conta.";
    }
    if (membershipCount > 1) {
      return "Remova os demais usuarios da clinica antes de excluir a conta.";
    }
    return null;
  }, [canDeleteOwnAccount, membershipCount]);

  const formReady =
    confirmEmail.trim().toLowerCase() === email.toLowerCase() &&
    confirmText.trim().toUpperCase() === REQUIRED_CONFIRM_TEXT &&
    password.length >= 8 &&
    acknowledged;

  const timerReady = secondsLeft === 0;
  const canSubmit = !blockerMessage && formReady && timerReady && !loading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const accepted = window.confirm(
      "Esta acao e permanente e removera conta, clinica e dados vinculados. Deseja continuar?"
    );
    if (!accepted) return;

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirmEmail,
          confirmText,
          acknowledged,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Nao foi possivel excluir a conta.");
        setLoading(false);
        return;
      }

      const supabase = supabaseClient();
      await supabase.auth.signOut();
      window.location.href = "/signup?deleted=1";
    } catch {
      setError("Falha de rede ao tentar excluir a conta.");
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        Esta acao exclui sua conta e todos os dados da clinica de forma irreversivel.
      </p>
      <p className="text-sm text-muted-foreground">
        Digite exatamente: <span className="font-semibold">{REQUIRED_CONFIRM_TEXT}</span>
      </p>
      <Input
        type="email"
        placeholder="Confirme seu e-mail"
        value={confirmEmail}
        onChange={(event) => setConfirmEmail(event.target.value)}
        disabled={Boolean(blockerMessage) || loading}
        required
      />
      <Input
        placeholder="Digite a frase de confirmacao"
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        disabled={Boolean(blockerMessage) || loading}
        required
      />
      <Input
        type="password"
        placeholder="Digite sua senha atual"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={Boolean(blockerMessage) || loading}
        required
        minLength={8}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          disabled={Boolean(blockerMessage) || loading}
        />
        Entendo que nao sera possivel recuperar os dados depois da exclusao.
      </label>

      {!timerReady ? (
        <Button
          type="button"
          variant="outline"
          disabled={!formReady || Boolean(blockerMessage) || loading}
          onClick={() => setSecondsLeft(SAFETY_DELAY_SECONDS)}
        >
          {secondsLeft && secondsLeft > 0
            ? `Aguarde ${secondsLeft}s para liberar exclusao`
            : "Iniciar temporizador de seguranca"}
        </Button>
      ) : null}

      {blockerMessage ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {blockerMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button type="submit" variant="destructive" disabled={!canSubmit}>
        {loading ? "Excluindo conta..." : "Excluir conta permanentemente"}
      </Button>
    </form>
  );
}
