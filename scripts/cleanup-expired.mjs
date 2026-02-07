import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const now = new Date();
const signupCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const { error: intakeError } = await supabase
  .from("patient_intake_links")
  .delete()
  .or(`expires_at.lt.${now.toISOString()},used_at.not.is.null`);

const { error: signupError } = await supabase
  .from("signup_intents")
  .delete()
  .lt("created_at", signupCutoff.toISOString());

if (intakeError || signupError) {
  console.error("Cleanup failed", {
    intake: intakeError?.message,
    signup: signupError?.message,
  });
  process.exit(1);
}

console.log("Cleanup complete");
