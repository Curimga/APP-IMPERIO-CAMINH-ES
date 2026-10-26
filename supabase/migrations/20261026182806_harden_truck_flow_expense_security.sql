revoke execute on function public.create_truck_flow(uuid) from anon;
revoke execute on function public.complete_truck_flow_step(uuid,text,text) from anon;
revoke execute on function public.reopen_truck_flow_step(uuid,text,text) from anon;
revoke execute on function public.add_truck_flow_evidence(uuid,text,text,text,bigint) from anon;
revoke execute on function public.remove_truck_flow_evidence(uuid) from anon;
revoke execute on function public.submit_expense_approval(text,text,text,numeric,text,uuid,uuid,uuid,date,date,text,text,text,text) from anon;
revoke execute on function public.approve_expense_approval(uuid,text) from anon;
revoke execute on function public.return_expense_approval(uuid,text) from anon;
revoke execute on function public.resubmit_expense_approval(uuid,text,numeric,text) from anon;

create index expense_approval_events_actor_id_idx on public.expense_approval_events(actor_id);
create index expense_approval_events_request_id_idx on public.expense_approval_events(request_id);
create index expense_approval_requests_created_by_idx on public.expense_approval_requests(created_by);
create index expense_approval_requests_reviewed_by_idx on public.expense_approval_requests(reviewed_by);
create index expense_approval_requests_service_id_idx on public.expense_approval_requests(service_id);
create index expense_approval_requests_stock_movement_id_idx on public.expense_approval_requests(stock_movement_id);
create index expense_approval_requests_truck_id_idx on public.expense_approval_requests(truck_id);
create index truck_flow_events_actor_id_idx on public.truck_flow_events(actor_id);
create index truck_flow_events_flow_id_idx on public.truck_flow_events(flow_id);
create index truck_flow_events_step_id_idx on public.truck_flow_events(step_id);
create index truck_flow_evidence_flow_step_id_idx on public.truck_flow_evidence(flow_step_id);
create index truck_flow_evidence_uploaded_by_idx on public.truck_flow_evidence(uploaded_by);
create index truck_flow_steps_completed_by_idx on public.truck_flow_steps(completed_by);

drop policy "truck_flow_access_read_own" on public.truck_flow_access;
create policy "truck_flow_access_read_own" on public.truck_flow_access for select to authenticated
using (user_id = (select auth.uid()));
drop policy "expense_approval_access_read_own" on public.expense_approval_access;
create policy "expense_approval_access_read_own" on public.expense_approval_access for select to authenticated
using (user_id = (select auth.uid()));
drop policy "truck_flows_select_authorized" on public.truck_flows;
create policy "truck_flows_select_authorized" on public.truck_flows for select to authenticated
using (exists (select 1 from public.truck_flow_access a where a.user_id = (select auth.uid()) and a.access_level in ('editor','viewer')));
drop policy "truck_flow_steps_select_authorized" on public.truck_flow_steps;
create policy "truck_flow_steps_select_authorized" on public.truck_flow_steps for select to authenticated
using (exists (select 1 from public.truck_flows f join public.truck_flow_access a on a.user_id = (select auth.uid()) where f.id = truck_flow_steps.flow_id and a.access_level in ('editor','viewer')));
drop policy "truck_flow_evidence_select_authorized" on public.truck_flow_evidence;
create policy "truck_flow_evidence_select_authorized" on public.truck_flow_evidence for select to authenticated
using (exists (select 1 from public.truck_flow_steps s join public.truck_flow_access a on a.user_id = (select auth.uid()) where s.id = truck_flow_evidence.flow_step_id and a.access_level in ('editor','viewer')));
drop policy "truck_flow_events_select_authorized" on public.truck_flow_events;
create policy "truck_flow_events_select_authorized" on public.truck_flow_events for select to authenticated
using (exists (select 1 from public.truck_flows f join public.truck_flow_access a on a.user_id = (select auth.uid()) where f.id = truck_flow_events.flow_id and a.access_level in ('editor','viewer')));
drop policy "expense_requests_select_owner_or_approver" on public.expense_approval_requests;
create policy "expense_requests_select_owner_or_approver" on public.expense_approval_requests for select to authenticated
using (created_by = (select auth.uid()) or private.can_approve_expenses((select auth.uid())));
drop policy "expense_events_select_owner_or_approver" on public.expense_approval_events;
create policy "expense_events_select_owner_or_approver" on public.expense_approval_events for select to authenticated
using (exists (select 1 from public.expense_approval_requests r where r.id = expense_approval_events.request_id and (r.created_by = (select auth.uid()) or private.can_approve_expenses((select auth.uid())))));

drop policy "general_expenses read" on public.general_expenses;
drop policy "general_expenses insert" on public.general_expenses;
drop policy "general_expenses update" on public.general_expenses;
drop policy "general_expenses delete" on public.general_expenses;

create policy "general_expenses read" on public.general_expenses for select to authenticated
using (private.can_access_finance((select auth.uid())) or (coalesce(private.is_active((select auth.uid())), false) and created_by = (select auth.uid()) and truck_id is null and service_id is null and purchase_installment_id is null and stock_purchase_id is null and stock_movement_id is null and company_vehicle_id is null and warranty_id is null and inventory_item_id is null and employee_id is null and closing_id is null and closing_month is null and bank_account_id is null and closed_at is null));
create policy "general_expenses insert" on public.general_expenses for insert to authenticated
with check (private.can_access_finance((select auth.uid())) or (coalesce(private.is_active((select auth.uid())), false) and created_by = (select auth.uid()) and truck_id is null and service_id is null and purchase_installment_id is null and stock_purchase_id is null and stock_movement_id is null and company_vehicle_id is null and warranty_id is null and inventory_item_id is null and employee_id is null and closing_id is null and closing_month is null and bank_account_id is null and closed_at is null));
create policy "general_expenses update" on public.general_expenses for update to authenticated
using (private.can_access_finance((select auth.uid())) or (coalesce(private.is_active((select auth.uid())), false) and created_by = (select auth.uid()) and truck_id is null and service_id is null and purchase_installment_id is null and stock_purchase_id is null and stock_movement_id is null and company_vehicle_id is null and warranty_id is null and inventory_item_id is null and employee_id is null and closing_id is null and closing_month is null and bank_account_id is null and closed_at is null))
with check (private.can_access_finance((select auth.uid())) or (coalesce(private.is_active((select auth.uid())), false) and created_by = (select auth.uid()) and truck_id is null and service_id is null and purchase_installment_id is null and stock_purchase_id is null and stock_movement_id is null and company_vehicle_id is null and warranty_id is null and inventory_item_id is null and employee_id is null and closing_id is null and closing_month is null and bank_account_id is null and closed_at is null));
create policy "general_expenses delete" on public.general_expenses for delete to authenticated
using (private.can_access_finance((select auth.uid())) or (coalesce(private.is_active((select auth.uid())), false) and created_by = (select auth.uid()) and truck_id is null and service_id is null and purchase_installment_id is null and stock_purchase_id is null and stock_movement_id is null and company_vehicle_id is null and warranty_id is null and inventory_item_id is null and employee_id is null and closing_id is null and closing_month is null and bank_account_id is null and closed_at is null));
