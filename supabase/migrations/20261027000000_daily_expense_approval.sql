-- Espelha no app o fluxo de lancamento diario do CRM.
alter table public.expense_approval_requests
  drop constraint if exists expense_approval_requests_origin_check;

alter table public.expense_approval_requests
  add constraint expense_approval_requests_origin_check
  check (origin = any (array['manual', 'service', 'inventory', 'daily']));

create or replace function public.submit_expense_approval(
  p_target_type text,
  p_origin text,
  p_proposed_category text,
  p_amount numeric,
  p_description text,
  p_truck_id uuid default null,
  p_service_id uuid default null,
  p_stock_movement_id uuid default null,
  p_occurred_at date default null,
  p_due_date date default null,
  p_supplier text default null,
  p_notes text default null,
  p_payment_method text default null,
  p_proposed_status text default null
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
  if p_target_type not in ('general_expense', 'truck_expense', 'payable') then
    raise exception 'Tipo de despesa inválido.';
  end if;
  if p_origin not in ('manual', 'service', 'inventory', 'daily') then
    raise exception 'Origem da despesa inválida.';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'O valor deve ser maior que zero.';
  end if;
  if nullif(btrim(p_description), '') is null then
    raise exception 'A descrição é obrigatória.';
  end if;
  if p_target_type = 'truck_expense' and p_truck_id is null then
    raise exception 'Caminhão obrigatório para despesa de caminhão.';
  end if;
  if p_target_type = 'payable' and p_due_date is null then
    raise exception 'Vencimento obrigatório para conta a pagar.';
  end if;

  insert into public.expense_approval_requests (
    id, target_type, origin, status, created_by, proposed_category, amount,
    description, truck_id, service_id, stock_movement_id, occurred_at,
    due_date, supplier, notes, payment_method, proposed_status
  ) values (
    v_request_id, p_target_type, p_origin, 'pending', v_user_id,
    nullif(btrim(p_proposed_category), ''), p_amount, btrim(p_description),
    p_truck_id, p_service_id, p_stock_movement_id, p_occurred_at, p_due_date,
    nullif(btrim(p_supplier), ''), nullif(btrim(p_notes), ''),
    nullif(btrim(p_payment_method), ''), nullif(btrim(p_proposed_status), '')
  );

  insert into public.expense_approval_events (request_id, event_type, actor_id)
  values (v_request_id, 'submitted', v_user_id);
  return v_request_id;
end;
$$;
