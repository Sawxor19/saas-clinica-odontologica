-- 023_signup_verification_rls.sql
alter table signup_audit_logs enable row level security;
-- signup_audit_logs is service-role only; no policies.

-- signup_intents already has RLS enabled in 002_rls.sql (service-role only).
