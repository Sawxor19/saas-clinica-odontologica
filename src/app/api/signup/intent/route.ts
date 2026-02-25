import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import {
  createSignupIntent,
  validateSignupIntentEligibility,
} from "@/server/services/signup-intent.service";
import { getAppUrl } from "@/server/config/app-url";

const schema = z.object({
  clinicName: z.string().min(2, "Informe o nome da clínica."),
  adminName: z.string().min(2, "Informe o nome do admin."),
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
  cpf: z.string().min(11, "CPF inválido."),
  phone: z.string().min(8, "Informe um telefone válido."),
});

function getRequestContext(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : null;
  const userAgent = request.headers.get("user-agent");
  return { ip, userAgent };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const { clinicName, adminName, email, password, cpf, phone } = parsed.data;
  const { ip, userAgent } = getRequestContext(request);
  const appUrl = getAppUrl();

  try {
    await validateSignupIntentEligibility({ email, cpf, phone });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Falha ao validar cadastro." },
      { status: 400 }
    );
  }

  const supabase = await supabaseServerClient();
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/signup/verify`,
    },
  });

  if (signupError || !signupData?.user) {
    return NextResponse.json({ error: signupError?.message || "Falha ao criar usuário." }, { status: 400 });
  }

  try {
    const intent = await createSignupIntent({
      email,
      userId: signupData.user.id,
      cpf,
      phone,
      clinicName,
      adminName,
      whatsappNumber: phone,
      ip,
      userAgent,
    });

    return NextResponse.json({ intentId: intent.id, next: "verify-email-and-phone" });
  } catch (error) {
    await supabaseAdmin().auth.admin.deleteUser(signupData.user.id);
    return NextResponse.json({ error: (error as Error).message || "Falha ao iniciar cadastro." }, { status: 400 });
  }
}
