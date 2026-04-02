"use server";

import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

type SignupState = { error?: string };
type SignupIntentLite = {
  id: string;
  checkout_session_id: string | null;
  status: string | null;
};

function getSignupResumeRoute(intent: SignupIntentLite) {
  if (intent.status === "CHECKOUT_STARTED" || intent.checkout_session_id) {
    return `/signup/billing?intentId=${intent.id}`;
  }
  return `/signup/verify?intentId=${intent.id}`;
}

export async function signupAction(_: SignupState, _formData: FormData) {
  void _;
  void _formData;
  return { error: "Use o fluxo /signup para concluir cadastro com provisionamento seguro." };
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    redirect("/login?error=Informe%20email%20e%20senha.");
  }

  const supabase = await supabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    let { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.clinic_id) {
      const admin = supabaseAdmin();
      const { data: intentByUser } = await admin
        .from("signup_intents")
        .select("id, checkout_session_id, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const intent =
        intentByUser ??
        (
          await admin
            .from("signup_intents")
            .select("id, checkout_session_id, status")
            .eq("email", user.email ?? "")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data;

      if (intent?.checkout_session_id) {
        try {
          const { reconcileProvisioningFromCheckoutSessionId } = await import(
            "@/server/services/provisioning.service"
          );
          await reconcileProvisioningFromCheckoutSessionId(intent.checkout_session_id);
        } catch {
          // Best effort recovery; fallback redirects below.
        }

        const { data: recoveredProfile } = await admin
          .from("profiles")
          .select("clinic_id, stripe_customer_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (recoveredProfile?.clinic_id) {
          profile = recoveredProfile;
        } else if (intent.id) {
          redirect(getSignupResumeRoute(intent as SignupIntentLite));
        }
      }

      if (!profile?.clinic_id) {
        const { data: intentFallback } = await admin
        .from("signup_intents")
        .select("id, checkout_session_id, status")
        .eq("email", user.email ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        if (intentFallback?.id) {
          redirect(getSignupResumeRoute(intentFallback as SignupIntentLite));
        }
        redirect("/signup");
      }
    }

    const clinicResponse = await supabase
      .from("clinics")
      .select("subscription_status, current_period_end")
      .eq("id", profile.clinic_id)
      .single();
    let clinic = clinicResponse.data;

    if (clinicResponse.error) {
      redirect(`/login?error=${encodeURIComponent(clinicResponse.error.message)}`);
    }

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
        const { syncSubscriptionByCustomerId } = await import("@/server/billing/service");
        await syncSubscriptionByCustomerId(profile.stripe_customer_id);
        const refreshed = await supabase
          .from("clinics")
          .select("subscription_status, current_period_end")
          .eq("id", profile.clinic_id)
          .single();
        if (refreshed.error) {
          redirect(`/login?error=${encodeURIComponent(refreshed.error.message)}`);
        }
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
    redirect("/forgot-password?error=Informe%20o%20email.");
  }

  const { getAppUrl } = await import("@/server/config/app-url");
  const redirectTo = `${getAppUrl()}/reset-password`;
  const supabase = await supabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?sent=1");
}
