import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { buildPermissions, PermissionSet } from "@/server/rbac/permissions";

export type ClinicContext = {
  userId: string;
  clinicId: string;
  role: "admin" | "dentist" | "assistant" | "receptionist";
  permissions: PermissionSet;
};

type Role = "admin" | "dentist" | "assistant" | "receptionist";

function asRole(value: unknown): Role {
  if (value === "admin" || value === "dentist" || value === "assistant" || value === "receptionist") {
    return value;
  }
  return "assistant";
}

export async function getClinicContext(): Promise<ClinicContext> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  const profileResponse = await supabase
    .from("profiles")
    .select("clinic_id, role, permissions")
    .eq("user_id", user.id)
    .single();
  let profile = profileResponse.data;

  if (profileResponse.error || !profile) {
    const admin = supabaseAdmin();
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("clinic_id, role, permissions")
      .eq("user_id", user.id)
      .single();
    profile = adminProfile ?? null;
  }

  if (!profile?.clinic_id) {
    throw new Error("Profile not provisioned");
  }

  let role = asRole(profile.role);
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("clinic_id", profile.clinic_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role) {
    role = asRole(membership.role);
  }

  return {
    userId: user.id,
    clinicId: profile.clinic_id,
    role,
    permissions: buildPermissions(role, profile.permissions ?? null),
  };
}
