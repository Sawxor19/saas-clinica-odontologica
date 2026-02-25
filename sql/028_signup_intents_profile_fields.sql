-- 028_signup_intents_profile_fields.sql
alter table signup_intents add column if not exists document_type text;
alter table signup_intents add column if not exists document_number text;
alter table signup_intents add column if not exists address text;
alter table signup_intents add column if not exists cep text;
alter table signup_intents add column if not exists timezone text;

update signup_intents
set document_type = 'cpf'
where document_type is null
  and cpf_hash is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'signup_intents_document_type_check'
  ) then
    alter table signup_intents
      add constraint signup_intents_document_type_check
      check (document_type in ('cpf', 'cnpj') or document_type is null);
  end if;
end
$$;
