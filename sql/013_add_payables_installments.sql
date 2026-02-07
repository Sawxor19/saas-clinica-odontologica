-- 013_add_payables_installments.sql
alter table payables add column if not exists installments integer;
