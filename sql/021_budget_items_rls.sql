-- 021_budget_items_rls.sql
alter table budget_items enable row level security;

drop policy if exists budget_items_select on budget_items;
drop policy if exists budget_items_insert on budget_items;
drop policy if exists budget_items_update on budget_items;
drop policy if exists budget_items_delete on budget_items;

create policy budget_items_select on budget_items
  for select using (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  );

create policy budget_items_insert on budget_items
  for insert with check (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  );

create policy budget_items_update on budget_items
  for update using (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  )
  with check (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  );

create policy budget_items_delete on budget_items
  for delete using (
    budget_id in (select id from budgets where clinic_id = public.get_current_clinic_id())
  );
