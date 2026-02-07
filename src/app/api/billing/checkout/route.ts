import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession } from "@/server/billing/service";
import { PlanKey } from "@/server/billing/plans";
import { checkRateLimit } from "@/server/services/rate-limit";

const schema = z.object({
  intentId: z.string().uuid(),
  plan: z.enum(["trial", "monthly", "quarterly", "semiannual", "annual"]),
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
  const limit = checkRateLimit(`checkout:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas solicitações. Aguarde um minuto." }, { status: 429 });
  }

  try {
    const url = await createCheckoutSession({
      intentId: parsed.data.intentId,
      plan: parsed.data.plan as PlanKey,
    });
    if (!url) {
      return NextResponse.json({ error: "Sessão de checkout indisponível." }, { status: 400 });
    }
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Falha ao iniciar checkout." }, { status: 400 });
  }
}
