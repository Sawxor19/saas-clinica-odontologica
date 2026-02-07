-- 008_add_rooms_and_appointments_fields.sql
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table rooms enable row level security;

alter table appointments add column if not exists room_id uuid references rooms(id);