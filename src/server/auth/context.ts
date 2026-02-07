import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { buildPermissions, PermissionSet } from "@/server/rbac/permissions";

export type ClinicContext = {
  userId: string;
  clinicId: string;
  role: "admin" | "dentist" | "assistant" | "receptionist";
  permissions: PermissionSet;
};

export async function getClinicContext(): Promise<ClinicContext> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("clinic_id, role, permissions")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    const admin = supabaseAdmin();
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("clinic_id, role, permissions")
      .eq("user_id", user.id)
      .single();
    profile = adminProfile ?? null;
  }

  if (!profile) {
    const admin = supabaseAdmin();
    const email = user.email || "admin";
    const nameSeed = email.split("@")[0] || "Clínica";
    const clinicName = `Clínica ${nameSeed}`;

    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .insert({
        name: clinicName,
        subscription_status: "inactive",
        current_period_end: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (clinicError || !clinic) {
      throw new Error("Profile not found");
    }

    const fullName =
      (user.user_metadata?.full_name as string | undefined) || email;

    const { error: profileInsertError } = await admin.from("profiles").insert({
      user_id: user.id,
      clinic_id: clinic.id,
      full_name: fullName,
      role: "admin",
    });

    if (profileInsertError) {
      throw new Error("Profile not found");
    }

    await admin.from("subscriptions").insert({
      clinic_id: clinic.id,
      plan: "monthly",
      status: "inactive",
      current_period_end: new Date().toISOString(),
      stripe_subscription_id: null,
    });

    profile = { clinic_id: clinic.id, role: "admin", permissions: null };
  }

  return {
    userId: user.id,
    clinicId: profile.clinic_id,
    role: profile.role,
    permissions: buildPermissions(profile.role, profile.permissions ?? null),
  };
}
