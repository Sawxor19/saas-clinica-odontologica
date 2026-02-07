-- 020_add_clinic_timezone.sql
alter table clinics add column if not exists timezone text not null default 'America/Sao_Paulo';
