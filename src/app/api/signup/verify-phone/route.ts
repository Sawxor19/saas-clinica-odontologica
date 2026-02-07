import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPhoneOtp } from "@/server/services/signup-intent.service";
import { checkRateLimit } from "@/server/services/rate-limit";

const schema = z.object({
  intentId: z.string().uuid(),
  otp: z.string().min(4),
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
  const limit = checkRateLimit(`otp-verify:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

  try {
    const result = await verifyPhoneOtp(parsed.data.intentId, parsed.data.otp, ip, userAgent ?? undefined);
    return NextResponse.json({ ok: true, emailVerified: result.emailVerified });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Falha ao verificar OTP." }, { status: 400 });
  }
}
