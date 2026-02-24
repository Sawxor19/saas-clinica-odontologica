"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function maskCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
}

function maskCEP(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

type CaptchaPayload = {
  a: number;
  b: number;
  token: string;
};

export function PatientIntakeForm({
  action,
  captcha,
}: {
  action: (formData: FormData) => void;
  captcha: CaptchaPayload;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const lastCepRef = useRef("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [signatureData, setSignatureData] = useState("");
  const [signatureError, setSignatureError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      const context = canvas.getContext("2d");
      if (context) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.lineWidth = 2;
        context.lineCap = "round";
        context.strokeStyle = "#111";
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      return;
    }
    if (digits === lastCepRef.current) return;
    lastCepRef.current = digits;
    queueMicrotask(() => setCepStatus("loading"));

    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((response) => response.json())
      .then((data) => {
        if (data?.erro) {
          setCepStatus("error");
          return;
        }
        const parts = [data.logradouro, data.bairro, data.localidade, data.uf]
          .filter(Boolean)
          .join(" - ");
        setAddress(parts);
        setCepStatus(parts ? "success" : "idle");
      })
      .catch(() => setCepStatus("error"));
  }, [cep]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    context.beginPath();
    context.moveTo(x, y);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    setSignatureError(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    context.lineTo(x, y);
    context.stroke();
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(event.pointerId);
    setSignatureData(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
    setSignatureError(null);
  };

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      action={action}
      onSubmit={(event) => {
        if (!signatureData) {
          event.preventDefault();
          setSignatureError("Assinatura obrigatória");
        }
      }}
    >
      <Input name="full_name" placeholder="Nome completo" required />
      <Input
        name="birth_date"
        placeholder="Data de nascimento (DD/MM/AAAA)"
        required
        value={birthDate}
        onChange={(event) => setBirthDate(maskDate(event.target.value))}
      />
      <Input
        name="cpf"
        placeholder="CPF"
        required
        value={cpf}
        onChange={(event) => setCpf(maskCPF(event.target.value))}
      />
      <Input
        name="phone"
        placeholder="Telefone"
        required
        value={phone}
        onChange={(event) => setPhone(maskPhone(event.target.value))}
      />
      <Input name="email" type="email" placeholder="Email" required />
      <Input
        name="cep"
        placeholder="CEP"
        required
        value={cep}
        onChange={(event) => {
          const masked = maskCEP(event.target.value);
          setCep(masked);
          if (masked.replace(/\D/g, "").length !== 8) {
            lastCepRef.current = "";
            setCepStatus("idle");
          }
        }}
      />
      <Input
        name="address"
        placeholder="Endereço"
        required
        value={address}
        onChange={(event) => setAddress(event.target.value)}
      />
      <Input
        name="emergency_contact"
        placeholder="Contato de emergência"
        required
        value={emergencyContact}
        onChange={(event) => setEmergencyContact(maskPhone(event.target.value))}
      />

      <div className="md:col-span-2 text-xs text-muted-foreground">
        {cepStatus === "loading" ? "Buscando endereço pelo CEP..." : null}
        {cepStatus === "success" ? "Endereço preenchido automaticamente." : null}
        {cepStatus === "error" ? "CEP não encontrado." : null}
      </div>

      <div className="md:col-span-2 grid gap-2">
        <label className="text-sm font-medium">Captcha</label>
        <div className="text-sm text-muted-foreground">
          Quanto é {captcha.a} + {captcha.b}?
        </div>
        <Input name="captcha_answer" placeholder="Resposta" required />
        <input type="hidden" name="captcha_a" value={captcha.a} />
        <input type="hidden" name="captcha_b" value={captcha.b} />
        <input type="hidden" name="captcha_token" value={captcha.token} />
      </div>

      <div className="md:col-span-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <p className="text-sm font-medium text-foreground">Sigilo e LGPD</p>
        <p className="mt-2">
          Seus dados são protegidos por sigilo profissional e tratados conforme a
          Lei Geral de Proteção de Dados (LGPD).
        </p>
        <p className="mt-2">
          Usamos suas informações apenas para atendimento, prontuário e comunicação
          da clínica. Você pode solicitar acesso, correção ou exclusão dos dados
          a qualquer momento.
        </p>
      </div>

      <div className="md:col-span-2 grid gap-2">
        <label className="text-sm font-medium">Assinatura digital</label>
        <div className="rounded-md border border-dashed p-2">
          <canvas
            ref={canvasRef}
            className="h-32 w-full touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
        <input type="hidden" name="signature_data" value={signatureData} />
        {signatureError ? (
          <p className="text-xs text-destructive">{signatureError}</p>
        ) : null}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
            Limpar assinatura
          </Button>
        </div>
      </div>

      <div className="md:col-span-2">
        <Button type="submit" className="w-full">
          Confirmar
        </Button>
      </div>
    </form>
  );
}
