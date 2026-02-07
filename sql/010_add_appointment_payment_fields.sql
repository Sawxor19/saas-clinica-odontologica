-- 010_add_appointment_payment_fields.sql
alter table appointments add column if not exists payment_status text default 'unpaid';
alter table appointments add column if not exists payment_method text;
alter table appointments add column if not exists paid_at timestamptz;
