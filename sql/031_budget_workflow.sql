-- 031_budget_workflow.sql

create index if not exists budgets_clinic_created_idx
  on budgets (clinic_id, created_at desc);

create index if not exists budget_items_budget_idx
  on budget_items (budget_id);

drop policy if exists budgets_update on budgets;
drop policy if exists budgets_delete on budgets;

create policy budgets_update on budgets
  for update using (clinic_id = public.get_current_clinic_id())
  with check (clinic_id = public.get_current_clinic_id());

create policy budgets_delete on budgets
  for delete using (clinic_id = public.get_current_clinic_id());
