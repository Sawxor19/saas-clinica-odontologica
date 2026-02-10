-- 026_relax_patient_intake_phone.sql
alter table patient_intake_links alter column phone drop not null;
