import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import {
  createSignupIntent,
  validateSignupIntentEligibility,
} from "@/server/services/signup-intent.service";
import { getAppUrl } from "@/server/config/app-url";
import {
  documentTypeLabel,
  validateDocumentByType,
} from "@/utils/validation/document";
import { isStrongPassword } from "@/utils/validation/password";

const schema = z.object({
  adminName: z.string().min(2, "Informe o nome do responsavel."),
  email: z.string().email("Email invalido."),
  password: z
    .string()
    .min(8, "A senha deve ter no minimo 8 caracteres.")
    .refine(isStrongPassword, {
      message: "Use senha forte com maiuscula, minuscula, 8 caracteres e especial.",
    }),
  documentType: z.enum(["cpf", "cnpj"]),
  documentNumber: z.string().min(11, "CPF/CNPJ invalido."),
  phone: z.string().min(8, "Informe um telefone valido."),
  timezone: z.string().min(3, "Informe a timezone da clinica."),
  address: z.string().min(5, "Informe o endereco da clinica."),
  cep: z.string().min(8, "Informe um CEP valido."),
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

  const {
    adminName,
    email,
    password,
    documentNumber,
    documentType,
    phone,
    timezone,
    address,
    cep,
  } = parsed.data;

  if (!validateDocumentByType(documentNumber, documentType)) {
    return NextResponse.json(
      { error: `${documentTypeLabel(documentType)} invalido.` },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { ip, userAgent } = getRequestContext(request);
  const appUrl = getAppUrl();

  try {
    await validateSignupIntentEligibility({
      email: normalizedEmail,
      documentType,
      documentNumber,
      phone,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Falha ao validar cadastro." },
      { status: 400 }
    );
  }

  const supabase = await supabaseServerClient();
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${appUrl}/signup/verify`,
    },
  });

  if (signupError || !signupData?.user) {
    return NextResponse.json(
      { error: signupError?.message || "Falha ao criar usuario." },
      { status: 400 }
    );
  }

  try {
    const intent = await createSignupIntent({
      email: normalizedEmail,
      userId: signupData.user.id,
      documentType,
      documentNumber,
      phone,
      clinicName: "Clinica",
      adminName,
      whatsappNumber: phone,
      timezone,
      address,
      cep,
      ip,
      userAgent,
    });

    return NextResponse.json({ intentId: intent.id, next: "verify-email-and-phone" });
  } catch (error) {
    await supabaseAdmin().auth.admin.deleteUser(signupData.user.id);
    return NextResponse.json(
      { error: (error as Error).message || "Falha ao iniciar cadastro." },
      { status: 400 }
    );
  }
}
