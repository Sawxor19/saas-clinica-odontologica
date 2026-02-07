"use server";

import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { syncSubscriptionByCustomerId } from "@/server/billing/service";
import { z } from "zod";

const signupSchema = z.object({
  clinicName: z.string().min(2, "Informe o nome da clínica."),
  adminName: z.string().min(2, "Informe o nome do admin."),
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
  whatsappNumber: z.string().min(8, "Informe um WhatsApp válido."),
});

type SignupState = { error?: string };

export async function signupAction(_: SignupState, formData: FormData) {
  const parsed = signupSchema.safeParse({
    clinicName: formData.get("clinicName"),
    adminName: formData.get("adminName"),
    email: formData.get("email"),
    password: formData.get("password"),
    whatsappNumber: formData.get("whatsappNumber"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Dados inválidos." };
  }

  const values = parsed.data;

  const supabase = await supabaseServerClient();
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
    },
  });

  if (signupError || !signupData?.user) {
    return { error: signupError?.message || "Falha ao criar usuário." };
  }

  const admin = supabaseAdmin();

  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .insert({
      name: values.clinicName,
      whatsapp_number: values.whatsappNumber,
      subscription_status: "inactive",
      current_period_end: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    return { error: clinicError?.message || "Falha ao criar clínica." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: signupData.user.id,
    clinic_id: clinic.id,
    full_name: values.adminName,
    role: "admin",
  });

  if (profileError) {
    return { error: profileError.message };
  }

  await admin.from("subscriptions").insert({
    clinic_id: clinic.id,
    plan: "monthly",
    status: "inactive",
    current_period_end: new Date().toISOString(),
    stripe_subscription_id: null,
  });

  redirect("/signup/plans");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const supabase = await supabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.clinic_id) {
      const admin = supabaseAdmin();
      const { data: intent } = await admin
        .from("signup_intents")
        .select("id")
        .eq("email", user.email ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (intent?.id) {
        redirect(`/signup/verify?intentId=${intent.id}`);
      }
      redirect("/signup");
    }

    let { data: clinic } = await supabase
      .from("clinics")
      .select("subscription_status, current_period_end")
      .eq("id", profile.clinic_id)
      .single();

    const now = new Date();
    const periodEnd = clinic?.current_period_end
      ? new Date(clinic.current_period_end)
      : null;
    const isActive =
      clinic?.subscription_status === "active" ||
      clinic?.subscription_status === "trialing";
    const notExpired = periodEnd ? periodEnd > now : false;

    if (!isActive || !notExpired) {
      if (profile.stripe_customer_id) {
        await syncSubscriptionByCustomerId(profile.stripe_customer_id);
        const refreshed = await supabase
          .from("clinics")
          .select("subscription_status, current_period_end")
          .eq("id", profile.clinic_id)
          .single();
        clinic = refreshed.data ?? clinic;
      }

      const refreshedEnd = clinic?.current_period_end
        ? new Date(clinic.current_period_end)
        : null;
      const refreshedActive =
        clinic?.subscription_status === "active" ||
        clinic?.subscription_status === "trialing";
      const refreshedNotExpired = refreshedEnd ? refreshedEnd > now : false;

      if (!refreshedActive || !refreshedNotExpired) {
      redirect("/billing/plans");
      }
    }
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await supabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) {
    return { error: "Informe o email." };
  }

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`;
  const supabase = await supabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { error: error.message };
  }

  redirect("/forgot-password?sent=1");
}
