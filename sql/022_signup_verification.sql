-- 022_signup_verification.sql
alter table signup_intents alter column plan drop not null;
alter table signup_intents alter column password_cipher drop not null;

alter table signup_intents add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table signup_intents add column if not exists cpf_hash text;
alter table signup_intents add column if not exists phone_e164 text;
alter table signup_intents add column if not exists phone_hash text;
alter table signup_intents add column if not exists email_verified boolean default false;
alter table signup_intents add column if not exists phone_verified_at timestamptz;
alter table signup_intents add column if not exists cpf_validated_at timestamptz;
alter table signup_intents add column if not exists otp_hash text;
alter table signup_intents add column if not exists otp_expires_at timestamptz;
alter table signup_intents add column if not exists otp_attempts integer default 0;
alter table signup_intents add column if not exists otp_last_sent_at timestamptz;
alter table signup_intents add column if not exists otp_locked_until timestamptz;
alter table signup_intents add column if not exists otp_send_count integer default 0;
alter table signup_intents add column if not exists otp_send_window_start timestamptz;
alter table signup_intents add column if not exists status text default 'PENDING';
alter table signup_intents add column if not exists checkout_session_id text;
alter table signup_intents add column if not exists updated_at timestamptz default now();

create unique index if not exists signup_intents_cpf_hash_idx on signup_intents (cpf_hash);
create unique index if not exists signup_intents_phone_hash_idx on signup_intents (phone_hash);
create index if not exists signup_intents_email_idx on signup_intents (email);

alter table profiles add column if not exists cpf_hash text;
alter table profiles add column if not exists phone_e164 text;
alter table profiles add column if not exists phone_verified_at timestamptz;

create table if not exists signup_audit_logs (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid references signup_intents(id) on delete cascade,
  action text not null,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signup_audit_logs_intent_idx on signup_audit_logs (intent_id);
