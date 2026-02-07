"use server";

import { redirect } from "next/navigation";
import {
  cancelSubscriptionForClinic,
  createBillingPortalSession,
  createCheckoutSessionForClinic,
} from "@/server/billing/service";
import { PlanKey } from "@/server/billing/plans";

export async function openBillingPortal() {
  const url = await createBillingPortalSession();
  redirect(url);
}

export async function startCheckoutAction(formData: FormData) {
  const plan = String(formData.get("plan") || "") as PlanKey;
  if (!plan) return;
  const { supabaseServerClient } = await import("@/server/db/supabaseServer");
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const url = await createCheckoutSessionForClinic(plan);
  redirect(url || "/billing/plans");
}

export async function cancelSubscriptionAction() {
  await cancelSubscriptionForClinic({ atPeriodEnd: true });
  redirect("/billing");
}
