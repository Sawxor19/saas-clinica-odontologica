-- 011_add_appointment_procedure_and_charge.sql
alter table appointments add column if not exists procedure_id uuid references procedures(id);
alter table appointments add column if not exists charge_amount numeric(10,2) default 0;
