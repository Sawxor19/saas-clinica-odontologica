import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const clinicName = "Clinic SaaS Demo";

let user = null;
const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
if (!listErr) {
  user = usersList.users.find((u) => u.email === email) ?? null;
}

if (!user) {
  const { data: userRes, error: userErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userErr || !userRes?.user) {
    console.error("Failed to create user", userErr?.message);
    process.exit(1);
  }
  user = userRes.user;
}

const { data: clinic, error: clinicErr } = await supabase
  .from("clinics")
  .insert({
    name: clinicName,
    subscription_status: "active",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })
  .select("id")
  .single();

if (clinicErr || !clinic) {
  console.error("Failed to create clinic", clinicErr?.message);
  process.exit(1);
}

const { error: profileErr } = await supabase.from("profiles").insert({
  user_id: user.id,
  clinic_id: clinic.id,
  full_name: "Admin",
  role: "admin",
});

if (profileErr) {
  console.error("Failed to create profile", profileErr.message);
  process.exit(1);
}

const { error: membershipErr } = await supabase.from("memberships").upsert(
  {
    clinic_id: clinic.id,
    user_id: user.id,
    role: "admin",
  },
  { onConflict: "clinic_id,user_id" }
);

if (membershipErr) {
  console.error("Failed to create membership", membershipErr.message);
  process.exit(1);
}

const { error: subErr } = await supabase.from("subscriptions").insert({
  clinic_id: clinic.id,
  stripe_subscription_id: null,
  plan: "trial",
  status: "active",
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});

if (subErr) {
  console.error("Failed to create subscription", subErr.message);
  process.exit(1);
}

console.log("Admin user created");
