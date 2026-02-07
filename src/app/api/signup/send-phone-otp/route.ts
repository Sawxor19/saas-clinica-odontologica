import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPhoneOtp } from "@/server/services/signup-intent.service";
import { checkRateLimit } from "@/server/services/rate-limit";

const schema = z.object({
  intentId: z.string().uuid(),
});

function getRequestContext(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : "unknown";
  const userAgent = request.headers.get("user-agent");
  return { ip, userAgent };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { ip, userAgent } = getRequestContext(request);
  const limit = checkRateLimit(`otp-send:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas solicitações. Aguarde um minuto." }, { status: 429 });
  }

  try {
    await sendPhoneOtp(parsed.data.intentId, ip, userAgent ?? undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Falha ao enviar OTP." }, { status: 400 });
  }
}
