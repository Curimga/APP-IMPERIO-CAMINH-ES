-- Campos estruturados do pequeno cadastro de lancamento diario.
alter table public.expense_approval_requests
  add column if not exists urgent boolean not null default false,
  add column if not exists bank text;

create or replace function public.submit_daily_expense(
  p_supplier text,
  p_amount numeric,
  p_payment_method text,
  p_description text,
  p_urgent boolean default false,
  p_bank text default null,
  p_occurred_at date default current_date,
  p_notes text default null
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
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'O valor deve ser maior que zero.';
  end if;
  if nullif(btrim(p_supplier), '') is null then
    raise exception 'O fornecedor é obrigatório.';
  end if;
  if nullif(btrim(p_description), '') is null then
    raise exception 'O referente é obrigatório.';
  end if;
  if nullif(btrim(p_payment_method), '') is null then
    raise exception 'A forma de pagamento é obrigatória.';
  end if;

  insert into public.expense_approval_requests (
    id, target_type, origin, status, created_by, proposed_category, amount,
    description, occurred_at, supplier, notes, payment_method, proposed_status,
    urgent, bank
  ) values (
    v_request_id, 'general_expense', 'daily', 'pending', v_user_id, 'outros',
    p_amount, btrim(p_description), coalesce(p_occurred_at, current_date),
    btrim(p_supplier), nullif(btrim(p_notes), ''), btrim(p_payment_method),
    'pago', coalesce(p_urgent, false), nullif(btrim(p_bank), '')
  );

  insert into public.expense_approval_events (request_id, event_type, actor_id)
  values (v_request_id, 'submitted', v_user_id);
  return v_request_id;
end;
$$;

revoke all on function public.submit_daily_expense(text, numeric, text, text, boolean, text, date, text) from public, anon;
grant execute on function public.submit_daily_expense(text, numeric, text, text, boolean, text, date, text) to authenticated;
