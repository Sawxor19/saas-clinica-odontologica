import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { supabaseServerClient } from "@/server/db/supabaseServer";

const ACTIVE_SIGNUP_STATUSES = ["PENDING", "PENDING_VERIFICATIONS", "VERIFIED", "CHECKOUT_STARTED"];

type SignupIntentRecord = {
  id: string;
  user_id: string | null;
  email: string;
  email_verified: boolean | null;
  status: string | null;
};

async function findLatestIntentByUserId(userId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("signup_intents")
    .select("id,user_id,email,email_verified,status")
    .eq("user_id", userId)
    .in("status", ACTIVE_SIGNUP_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as SignupIntentRecord | null;
}

async function findLatestIntentByEmail(email: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("signup_intents")
    .select("id,user_id,email,email_verified,status")
    .eq("email", email)
    .in("status", ACTIVE_SIGNUP_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as SignupIntentRecord | null;
}

export async function POST() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessao ausente. Abra novamente o link do e-mail." }, { status: 401 });
  }

  let intent = await findLatestIntentByUserId(user.id);

  if (!intent && user.email) {
    intent = await findLatestIntentByEmail(user.email);
    if (intent && !intent.user_id) {
      await supabaseAdmin()
        .from("signup_intents")
        .update({ user_id: user.id, updated_at: new Date().toISOString() })
        .eq("id", intent.id)
        .is("user_id", null);
      intent = { ...intent, user_id: user.id };
    }
  }

  if (!intent) {
    return NextResponse.json({ error: "Nao foi possivel localizar seu cadastro pendente." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    intentId: intent.id,
    emailVerified: Boolean(intent.email_verified),
    status: intent.status,
  });
}
