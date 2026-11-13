-- Cadastro estruturado do lancamento diario, mantendo paridade com o CRM.
alter table public.expense_approval_requests
  add column if not exists registration_type text,
  add column if not exists category text,
  add column if not exists supplier_id uuid references public.suppliers(id),
  add column if not exists employee_id uuid references public.employees(id),
  add column if not exists inventory_item_id uuid references public.inventory_items(id),
  add column if not exists bank_account_id uuid references public.bank_accounts(id),
  add column if not exists shared boolean not null default false;

create or replace function public.submit_daily_expense(
  p_supplier text,
  p_amount numeric,
  p_payment_method text,
  p_description text,
  p_urgent boolean default false,
  p_bank text default null,
  p_occurred_at date default current_date,
  p_notes text default null,
  p_registration_type text default null,
  p_category text default null,
  p_supplier_id uuid default null,
  p_bank_account_id uuid default null,
  p_employee_id uuid default null,
  p_inventory_item_id uuid default null,
  p_truck_id uuid default null,
  p_shared boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid := gen_random_uuid();
begin
  if v_user_id is null or not coalesce(private.is_active(v_user_id), false) then
    raise exception 'Usuário não autorizado.';
  end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'O valor deve ser maior que zero.'; end if;
  if nullif(btrim(p_supplier), '') is null then raise exception 'O fornecedor é obrigatório.'; end if;
  if nullif(btrim(p_description), '') is null then raise exception 'O referente é obrigatório.'; end if;
  if nullif(btrim(p_payment_method), '') is null then raise exception 'A forma de pagamento é obrigatória.'; end if;
  if lower(coalesce(p_category, '')) = 'caminhao' and p_truck_id is null then
    raise exception 'Selecione o caminhão para a categoria Caminhão.';
  end if;

  insert into public.expense_approval_requests (
    id, target_type, origin, status, created_by, proposed_category, category, amount,
    description, occurred_at, supplier, supplier_id, bank, bank_account_id, employee_id,
    inventory_item_id, truck_id, shared, notes, payment_method, proposed_status, urgent,
    registration_type
  ) values (
    v_request_id, 'general_expense', 'daily', 'pending', v_user_id,
    coalesce(nullif(btrim(p_category), ''), 'outros'), nullif(btrim(p_category), ''), p_amount,
    btrim(p_description), coalesce(p_occurred_at, current_date), btrim(p_supplier), p_supplier_id,
    nullif(btrim(p_bank), ''), p_bank_account_id, p_employee_id, p_inventory_item_id, p_truck_id,
    coalesce(p_shared, false), nullif(btrim(p_notes), ''), btrim(p_payment_method), 'pago',
    coalesce(p_urgent, false), nullif(btrim(p_registration_type), '')
  );
  insert into public.expense_approval_events (request_id, event_type, actor_id)
  values (v_request_id, 'submitted', v_user_id);
  return v_request_id;
end;
$$;

revoke all on function public.submit_daily_expense(text, numeric, text, text, boolean, text, date, text, text, text, uuid, uuid, uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.submit_daily_expense(text, numeric, text, text, boolean, text, date, text, text, text, uuid, uuid, uuid, uuid, uuid, boolean) to authenticated;
