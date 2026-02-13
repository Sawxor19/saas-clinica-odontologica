import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { supabaseServerClient } from "@/server/db/supabaseServer";
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
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const { ip } = getRequestContext(request);
  const limit = checkRateLimit(`email-resend:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas solicitacoes. Aguarde um minuto." }, { status: 429 });
  }

  const admin = supabaseAdmin();
  const { data: intent, error } = await admin
    .from("signup_intents")
    .select("email")
    .eq("id", parsed.data.intentId)
    .single();

  if (error || !intent?.email) {
    return NextResponse.json({ error: "Intent invalido." }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const { error: resendError } = await supabase.auth.resend({
    type: "signup",
    email: intent.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/signup/verify`,
    },
  });

  if (resendError) {
    return NextResponse.json(
      { error: resendError.message || "Falha ao reenviar email." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
