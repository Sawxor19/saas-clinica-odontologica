-- 003_seed.sql
insert into clinic_features (clinic_id, feature_key, enabled)
select id, 'reports', true from clinics
on conflict do nothing;

insert into clinic_features (clinic_id, feature_key, enabled)
select id, 'budgets', true from clinics
on conflict do nothing;
