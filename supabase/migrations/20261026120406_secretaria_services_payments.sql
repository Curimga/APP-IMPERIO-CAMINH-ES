-- Serviços e pagamentos operacionais para a Secretaria.
--
-- Complementa 20261026120340_restrict_secretaria_finance.sql:
--   * a Secretaria passa a VER e LANÇAR serviços, mas sem valores;
--   * a Secretaria passa a LANÇAR contas a pagar/receber em aberto, sem banco
--     nem vínculos com despesas/estoque (continua sem LER essas tabelas);
--   * despesas gerais da Secretaria ficam restritas a lançamentos totalmente
--     desvinculados (sem caminhão, serviço, compra, fechamento ou banco);
--   * estoque passa a usar view sem preço unitário e RPC de ajuste de saldo;
--   * fechamentos e rateios bancários viram financeiro (admin/financeiro).

-- ---------------------------------------------------------------------------
-- Views operacionais (leitura sem valores financeiros)
-- ---------------------------------------------------------------------------
create or replace view public.services_operational
with (security_invoker = false, security_barrier = true)
as
select
  s.id,
  s.truck_id,
  s.supplier_id,
  s.title,
  s.description,
  s.sent_at,
  s.expected_at,
  s.completed_at,
  s.status,
  s.attachment_url,
  s.notes,
  s.created_by,
  s.created_at,
  s.updated_at,
  s.truck_previous_status,
  s.category
from public.services s
where private.is_active(auth.uid());

comment on view public.services_operational is
  'Serviços sem valores financeiros. Somente leitura.';

revoke all on public.services_operational from public, anon;
grant select on public.services_operational to authenticated;
grant select on public.services_operational to service_role;

create or replace view public.inventory_items_operational
with (security_invoker = false, security_barrier = true)
as
select
  i.id,
  i.name,
  i.category,
  i.internal_code,
  i.description,
  i.unit,
  i.quantity,
  i.min_quantity,
  i.supplier_id,
  i.supplier_name,
  i.storage_location,
  i.notes,
  i.created_by,
  i.created_at,
  i.updated_at,
  i.initial_quantity,
  i.balance_reconciled_at
from public.inventory_items i
where private.is_active(auth.uid());

comment on view public.inventory_items_operational is
  'Itens de estoque sem preço/custo unitário. Somente leitura.';

revoke all on public.inventory_items_operational from public, anon;
grant select on public.inventory_items_operational to authenticated;
grant select on public.inventory_items_operational to service_role;

-- ---------------------------------------------------------------------------
-- Guardas de colunas financeiras
-- ---------------------------------------------------------------------------

-- Eventos financeiros criados por gatilhos internos (ex.: conta a pagar ->
-- compromisso) são permitidos; a escrita direta do usuário não é.
create or replace function private.guard_calendar_finance_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if v_jwt_role in ('', 'service_role') or private.can_access_finance(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.amount is not null
       or new.related_deal_id is not null
       or new.related_service_id is not null
       or new.related_payable_id is not null
    then
      raise exception 'Sem permissão para gravar dados financeiros na agenda.'
        using errcode = '42501';
    end if;
  elsif new.amount is distinct from old.amount
     or new.related_deal_id is distinct from old.related_deal_id
     or new.related_service_id is distinct from old.related_service_id
     or new.related_payable_id is distinct from old.related_payable_id
  then
    raise exception 'Sem permissão para alterar dados financeiros na agenda.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_calendar_finance_fields() from public, anon, authenticated;

create or replace function private.guard_service_finance_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if v_jwt_role in ('', 'service_role') or private.can_access_finance(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.value, 0) <> 0
       or coalesce(new.total_value, 0) <> 0
       or coalesce(new.down_payment, 0) <> 0
       or new.bank_account_id is not null
       or new.down_payment_bank_account_id is not null
       or new.down_payment_confirmed_at is not null
       or new.down_payment_confirmed_by is not null
       or (new.down_payment_status is not null and new.down_payment_status <> 'pending')
    then
      raise exception 'Sem permissão para gravar valores no serviço.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.value is distinct from old.value
     or new.total_value is distinct from old.total_value
     or new.down_payment is distinct from old.down_payment
     or new.bank_account_id is distinct from old.bank_account_id
     or new.down_payment_bank_account_id is distinct from old.down_payment_bank_account_id
     or new.down_payment_status is distinct from old.down_payment_status
     or new.down_payment_confirmed_at is distinct from old.down_payment_confirmed_at
     or new.down_payment_confirmed_by is distinct from old.down_payment_confirmed_by
  then
    raise exception 'Sem permissão para alterar valores do serviço.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_service_finance_fields() from public, anon, authenticated;

drop trigger if exists guard_service_finance_fields on public.services;
create trigger guard_service_finance_fields
  before insert or update on public.services
  for each row execute function private.guard_service_finance_fields();

-- Despesas criadas pelos gatilhos de conclusão de serviço/estoque são
-- permitidas; o lançamento manual da Secretaria só aceita linhas desvinculadas.
create or replace function private.guard_general_expense_finance_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if v_jwt_role in ('', 'service_role') or private.can_access_finance(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.truck_id is not null
       or new.service_id is not null
       or new.purchase_installment_id is not null
       or new.stock_purchase_id is not null
       or new.stock_movement_id is not null
       or new.company_vehicle_id is not null
       or new.warranty_id is not null
       or new.inventory_item_id is not null
       or new.employee_id is not null
       or new.closing_id is not null
       or new.closing_month is not null
       or new.bank_account_id is not null
       or new.closed_at is not null
    then
      raise exception 'A Secretaria só pode lançar despesas gerais sem vínculos financeiros.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.truck_id is distinct from old.truck_id
     or new.service_id is distinct from old.service_id
     or new.purchase_installment_id is distinct from old.purchase_installment_id
     or new.stock_purchase_id is distinct from old.stock_purchase_id
     or new.stock_movement_id is distinct from old.stock_movement_id
     or new.company_vehicle_id is distinct from old.company_vehicle_id
     or new.warranty_id is distinct from old.warranty_id
     or new.inventory_item_id is distinct from old.inventory_item_id
     or new.employee_id is distinct from old.employee_id
     or new.closing_id is distinct from old.closing_id
     or new.closing_month is distinct from old.closing_month
     or new.bank_account_id is distinct from old.bank_account_id
     or new.closed_at is distinct from old.closed_at
  then
    raise exception 'A Secretaria não pode alterar vínculos financeiros da despesa.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_general_expense_finance_fields() from public, anon, authenticated;

drop trigger if exists guard_general_expense_finance_fields on public.general_expenses;
create trigger guard_general_expense_finance_fields
  before insert or update on public.general_expenses
  for each row execute function private.guard_general_expense_finance_fields();

-- ---------------------------------------------------------------------------
-- RPCs operacionais
-- ---------------------------------------------------------------------------
create or replace function public.update_service_operational(
  p_id uuid,
  p_patch jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_key text;
  v_count integer;
begin
  if coalesce(auth.role(), '') not in ('', 'service_role')
     and not coalesce(private.is_active(auth.uid()), false)
  then
    raise exception 'Usuário sem permissão para editar serviços.' using errcode = '42501';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Alterações operacionais inválidas.' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if v_key not in (
      'truck_id', 'supplier_id', 'title', 'description', 'sent_at',
      'expected_at', 'completed_at', 'status', 'attachment_url', 'notes',
      'truck_previous_status', 'category'
    ) then
      raise exception 'Campo não permitido na edição operacional do serviço: %', v_key
        using errcode = '42501';
    end if;
  end loop;

  if p_patch ? 'title' and nullif(btrim(p_patch ->> 'title'), '') is null then
    raise exception 'Título é obrigatório.' using errcode = '23502';
  end if;

  update public.services s
  set
    truck_id = case when p_patch ? 'truck_id' then (p_patch ->> 'truck_id')::uuid else s.truck_id end,
    supplier_id = case when p_patch ? 'supplier_id' then (p_patch ->> 'supplier_id')::uuid else s.supplier_id end,
    title = case when p_patch ? 'title' then btrim(p_patch ->> 'title') else s.title end,
    description = case when p_patch ? 'description' then p_patch ->> 'description' else s.description end,
    sent_at = case when p_patch ? 'sent_at' then (p_patch ->> 'sent_at')::date else s.sent_at end,
    expected_at = case when p_patch ? 'expected_at' then (p_patch ->> 'expected_at')::date else s.expected_at end,
    completed_at = case when p_patch ? 'completed_at' then (p_patch ->> 'completed_at')::date else s.completed_at end,
    status = case when p_patch ? 'status' then (p_patch ->> 'status')::service_status else s.status end,
    attachment_url = case when p_patch ? 'attachment_url' then p_patch ->> 'attachment_url' else s.attachment_url end,
    notes = case when p_patch ? 'notes' then p_patch ->> 'notes' else s.notes end,
    truck_previous_status = case when p_patch ? 'truck_previous_status' then p_patch ->> 'truck_previous_status' else s.truck_previous_status end,
    category = case when p_patch ? 'category' then p_patch ->> 'category' else s.category end,
    updated_at = now()
  where s.id = p_id;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Serviço não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.update_service_operational(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_service_operational(uuid, jsonb) to authenticated, service_role;

create or replace function public.adjust_inventory_quantity(p_id uuid, p_delta numeric)
returns numeric
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_current numeric;
  v_next numeric;
begin
  if coalesce(auth.role(), '') not in ('', 'service_role')
     and not coalesce(private.is_active(auth.uid()), false)
  then
    raise exception 'Usuário sem permissão para ajustar o estoque.' using errcode = '42501';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception 'Ajuste inválido.' using errcode = '22023';
  end if;

  select i.quantity into v_current
    from public.inventory_items i
   where i.id = p_id
   for update;

  if not found then
    raise exception 'Item de estoque não encontrado.' using errcode = 'P0002';
  end if;

  v_next := greatest(0, round(coalesce(v_current, 0) + p_delta));

  update public.inventory_items
     set quantity = v_next,
         updated_at = now()
   where id = p_id;

  return v_next;
end;
$$;

revoke execute on function public.adjust_inventory_quantity(uuid, numeric) from public, anon, authenticated;
grant execute on function public.adjust_inventory_quantity(uuid, numeric) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Policies: serviços
-- ---------------------------------------------------------------------------
drop policy if exists "secretaria insert services" on public.services;
create policy "secretaria insert services"
  on public.services for insert
  to authenticated
  with check (
    coalesce(private.is_active(auth.uid()), false)
    and not private.can_access_finance(auth.uid())
    and coalesce(value, 0) = 0
    and coalesce(total_value, 0) = 0
    and coalesce(down_payment, 0) = 0
    and bank_account_id is null
    and down_payment_bank_account_id is null
    and down_payment_confirmed_at is null
    and down_payment_confirmed_by is null
    and (down_payment_status is null or down_payment_status = 'pending'::down_payment_status)
  );

-- ---------------------------------------------------------------------------
-- Policies: despesas gerais
-- ---------------------------------------------------------------------------
drop policy if exists "general_expenses read" on public.general_expenses;
drop policy if exists "general_expenses insert" on public.general_expenses;
drop policy if exists "general_expenses update" on public.general_expenses;
drop policy if exists "general_expenses delete" on public.general_expenses;

create policy "general_expenses read"
  on public.general_expenses for select
  to authenticated
  using (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and service_id is null
      and purchase_installment_id is null
      and stock_purchase_id is null
      and stock_movement_id is null
      and company_vehicle_id is null
      and warranty_id is null
      and inventory_item_id is null
      and employee_id is null
      and closing_id is null
      and closing_month is null
      and bank_account_id is null
      and closed_at is null
    )
  );

create policy "general_expenses insert"
  on public.general_expenses for insert
  to authenticated
  with check (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and service_id is null
      and purchase_installment_id is null
      and stock_purchase_id is null
      and stock_movement_id is null
      and company_vehicle_id is null
      and warranty_id is null
      and inventory_item_id is null
      and employee_id is null
      and closing_id is null
      and closing_month is null
      and bank_account_id is null
      and closed_at is null
    )
  );

create policy "general_expenses update"
  on public.general_expenses for update
  to authenticated
  using (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and service_id is null
      and purchase_installment_id is null
      and stock_purchase_id is null
      and stock_movement_id is null
      and company_vehicle_id is null
      and warranty_id is null
      and inventory_item_id is null
      and employee_id is null
      and closing_id is null
      and closing_month is null
      and bank_account_id is null
      and closed_at is null
    )
  )
  with check (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and service_id is null
      and purchase_installment_id is null
      and stock_purchase_id is null
      and stock_movement_id is null
      and company_vehicle_id is null
      and warranty_id is null
      and inventory_item_id is null
      and employee_id is null
      and closing_id is null
      and closing_month is null
      and bank_account_id is null
      and closed_at is null
    )
  );

create policy "general_expenses delete"
  on public.general_expenses for delete
  to authenticated
  using (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and service_id is null
      and purchase_installment_id is null
      and stock_purchase_id is null
      and stock_movement_id is null
      and company_vehicle_id is null
      and warranty_id is null
      and inventory_item_id is null
      and employee_id is null
      and closing_id is null
      and closing_month is null
      and bank_account_id is null
      and closed_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- Policies: estoque
-- ---------------------------------------------------------------------------
drop policy if exists "active read inventory_items" on public.inventory_items;
drop policy if exists "active insert inventory_items" on public.inventory_items;
drop policy if exists "active update inventory_items" on public.inventory_items;
drop policy if exists "admin delete inventory_items" on public.inventory_items;

create policy "finance read inventory_items"
  on public.inventory_items for select
  to authenticated
  using (private.can_access_finance(auth.uid()));
create policy "finance insert inventory_items"
  on public.inventory_items for insert
  to authenticated
  with check (private.can_access_finance(auth.uid()));
create policy "finance update inventory_items"
  on public.inventory_items for update
  to authenticated
  using (private.can_access_finance(auth.uid()))
  with check (private.can_access_finance(auth.uid()));
create policy "finance delete inventory_items"
  on public.inventory_items for delete
  to authenticated
  using (private.can_access_finance(auth.uid()));

create policy "secretaria insert inventory_items"
  on public.inventory_items for insert
  to authenticated
  with check (
    coalesce(private.is_active(auth.uid()), false)
    and not private.can_access_finance(auth.uid())
    and coalesce(unit_price, 0) = 0
  );

-- ---------------------------------------------------------------------------
-- Policies: contas a pagar/receber — Secretaria apenas lança em aberto
-- ---------------------------------------------------------------------------
drop policy if exists "secretaria insert payables" on public.payables;
create policy "secretaria insert payables"
  on public.payables for insert
  to authenticated
  with check (
    coalesce(private.is_active(auth.uid()), false)
    and not private.can_access_finance(auth.uid())
    and status = 'aberto'::payable_status
    and paid_at is null
    and bank_account_id is null
    and general_expense_id is null
    and stock_purchase_id is null
  );

drop policy if exists "secretaria insert receivables" on public.receivables;
create policy "secretaria insert receivables"
  on public.receivables for insert
  to authenticated
  with check (
    coalesce(private.is_active(auth.uid()), false)
    and not private.can_access_finance(auth.uid())
    and status = 'aberto'::receivable_status
    and received_at is null
    and bank_account_id is null
    and deal_id is null
    and check_status is null
  );

-- ---------------------------------------------------------------------------
-- Fechamentos e rateios bancários: financeiro
-- ---------------------------------------------------------------------------
drop policy if exists "active read closings" on public.general_expense_closings;
drop policy if exists "active insert closings" on public.general_expense_closings;
drop policy if exists "admin delete closings" on public.general_expense_closings;
drop policy if exists "finance read closings" on public.general_expense_closings;
drop policy if exists "finance insert closings" on public.general_expense_closings;
drop policy if exists "finance update closings" on public.general_expense_closings;
drop policy if exists "finance delete closings" on public.general_expense_closings;

create policy "finance read closings"
  on public.general_expense_closings for select to authenticated
  using (private.can_access_finance(auth.uid()));
create policy "finance insert closings"
  on public.general_expense_closings for insert to authenticated
  with check (private.can_access_finance(auth.uid()));
create policy "finance update closings"
  on public.general_expense_closings for update to authenticated
  using (private.can_access_finance(auth.uid()))
  with check (private.can_access_finance(auth.uid()));
create policy "finance delete closings"
  on public.general_expense_closings for delete to authenticated
  using (private.can_access_finance(auth.uid()));

drop policy if exists "active read receivable_bank_splits" on public.receivable_bank_splits;
drop policy if exists "active insert receivable_bank_splits" on public.receivable_bank_splits;
drop policy if exists "active update receivable_bank_splits" on public.receivable_bank_splits;
drop policy if exists "active delete receivable_bank_splits" on public.receivable_bank_splits;

create policy "finance read receivable_bank_splits"
  on public.receivable_bank_splits for select to authenticated
  using (private.can_access_finance(auth.uid()));
create policy "finance insert receivable_bank_splits"
  on public.receivable_bank_splits for insert to authenticated
  with check (private.can_access_finance(auth.uid()));
create policy "finance update receivable_bank_splits"
  on public.receivable_bank_splits for update to authenticated
  using (private.can_access_finance(auth.uid()))
  with check (private.can_access_finance(auth.uid()));
create policy "finance delete receivable_bank_splits"
  on public.receivable_bank_splits for delete to authenticated
  using (private.can_access_finance(auth.uid()));

-- ---------------------------------------------------------------------------
-- Views de auditoria não precisam ser legíveis pelo app. Elas expõem custos
-- (unit_price) e ficavam com SELECT concedido a anon/authenticated.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'v'
       and c.relname like 'v_audit_estoque%'
  loop
    execute format('revoke all on public.%I from public, anon, authenticated', r.relname);
    execute format('grant select on public.%I to service_role', r.relname);
  end loop;
end;
$$;

revoke all on public.consolidated_truck_expenses from public, anon;
