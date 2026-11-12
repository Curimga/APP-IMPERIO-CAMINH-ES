-- Mantém no mesmo canal Realtime todas as tabelas que o app e o CRM usam.
do $do$
declare
  table_name text;
begin
  foreach table_name in array array[
    'truck_purchase_installments',
    'truck_warranties',
    'user_roles'
  ] loop
    if to_regclass('public.' || table_name) is not null
      and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
      ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$do$;

-- Uma transferência é uma única operação de negócio. Se qualquer insert falhar,
-- o Postgres desfaz os dois e o CRM nunca observa um saldo intermediário.
create or replace function public.create_bank_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_description text default null,
  p_created_by uuid default auth.uid(),
  p_occurred_at timestamptz default now()
)
returns void language plpgsql set search_path = public
as $function$
begin
  if not private.can_access_finance(auth.uid()) then
    raise exception 'Acesso financeiro não autorizado';
  end if;
  if p_from_account_id is null or p_to_account_id is null then
    raise exception 'As duas contas são obrigatórias';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception 'As contas da transferência devem ser diferentes';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'O valor da transferência deve ser maior que zero';
  end if;

  insert into public.bank_transactions
    (type, amount, bank_account_id, transfer_account_id, source, description, occurred_at, created_by)
  values
    ('saida', p_amount, p_from_account_id, p_to_account_id, 'transferencia',
     'Transferência - saída - ' || coalesce(nullif(trim(p_description), ''), 'Transferência entre contas'),
     p_occurred_at, coalesce(p_created_by, auth.uid()));

  insert into public.bank_transactions
    (type, amount, bank_account_id, transfer_account_id, source, description, occurred_at, created_by)
  values
    ('entrada', p_amount, p_to_account_id, p_from_account_id, 'transferencia',
     'Transferência - entrada - ' || coalesce(nullif(trim(p_description), ''), 'Transferência entre contas'),
     p_occurred_at, coalesce(p_created_by, auth.uid()));
end;
$function$;

revoke all on function public.create_bank_transfer(uuid, uuid, numeric, text, uuid, timestamptz) from public, anon;
grant execute on function public.create_bank_transfer(uuid, uuid, numeric, text, uuid, timestamptz) to authenticated;
