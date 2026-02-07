import { NextResponse } from "next/server";
import { z } from "zod";
import { refreshEmailVerification } from "@/server/services/signup-intent.service";
import { checkRateLimit } from "@/server/services/rate-limit";

const schema = z.object({
  intentId: z.string().uuid(),
});

function getRequestContext(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : "unknown";
  return { ip };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { ip } = getRequestContext(request);
  const limit = checkRateLimit(`email-check:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas solicitações. Aguarde um minuto." }, { status: 429 });
  }

  try {
    const result = await refreshEmailVerification(parsed.data.intentId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Falha ao verificar email." }, { status: 400 });
  }
}
