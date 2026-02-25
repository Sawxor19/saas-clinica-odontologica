import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildPermissions, can } from "@/server/rbac/permissions";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/signup",
  "/signup/verify",
  "/signup/billing",
  "/signup/plans",
  "/signup/success",
  "/signup/cancelled",
  "/api/signup",
  "/api/account/delete",
  "/api/billing/checkout",
  "/api/stripe/webhook",
  "/patient-intake",
  "/p/anamnese",
];

const ROLE_GUARDS: Array<{ prefix: string; permission: keyof ReturnType<typeof can> }> = [
  { prefix: "/anamneses", permission: "readPatients" },
  { prefix: "/dashboard/records", permission: "readClinical" },
  { prefix: "/dashboard/materials", permission: "manageInventory" },
  { prefix: "/dashboard/procedures", permission: "manageProcedures" },
  { prefix: "/dashboard/finance", permission: "readFinance" },
  { prefix: "/dashboard/audit", permission: "viewAudit" },
  { prefix: "/dashboard/billing", permission: "manageBilling" },
  { prefix: "/dashboard/users", permission: "manageUsers" },
  { prefix: "/billing", permission: "manageBilling" },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Parameters<typeof response.cookies.set>[2] }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, role, permissions, phone, cpf, address, cep")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const { data: clinicInfo } = await supabase
    .from("clinics")
    .select("whatsapp_number")
    .eq("id", profile.clinic_id)
    .single();

  const needsClinicSetup =
    !clinicInfo?.whatsapp_number || !profile.cpf || !profile.address || !profile.cep;
  if (needsClinicSetup && !pathname.startsWith("/dashboard/profile")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/profile";
    return NextResponse.redirect(url);
  }

  if (!pathname.startsWith("/billing") && !pathname.startsWith("/dashboard/profile")) {
    const { data: clinic } = await supabase
      .from("clinics")
      .select("subscription_status, current_period_end")
      .eq("id", profile.clinic_id)
      .single();

    const now = new Date();
    const periodEnd = clinic?.current_period_end ? new Date(clinic.current_period_end) : null;
    const isActive =
      clinic?.subscription_status === "active" ||
      clinic?.subscription_status === "trialing";
    const notExpired = periodEnd ? periodEnd > now : false;

    if (!isActive || !notExpired) {
      const url = request.nextUrl.clone();
      url.pathname = "/billing/plans";
      return NextResponse.redirect(url);
    }
  }

  const guard = ROLE_GUARDS.find(
    (rule) => pathname.startsWith(rule.prefix) && !pathname.startsWith("/billing/blocked")
  );
  const permissions = buildPermissions(profile.role, profile.permissions ?? null);
  if (guard && !permissions[guard.permission]) {
    const url = request.nextUrl.clone();
    url.pathname = "/403";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
