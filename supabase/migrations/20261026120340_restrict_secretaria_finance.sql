-- Restringe dados financeiros da Secretaria.
--
-- Aplique esta migration SOMENTE depois que o app/CRM já estiver consultando
-- `public.trucks_operational` para perfis sem acesso financeiro.
--
-- Regra:
--   admin / financeiro  -> acesso financeiro (mantém o comportamento atual)
--   secretaria          -> sem valores de caminhão, despesas de caminhão,
--                          serviços, vendas, contas, bancos, comissões,
--                          parcelas de compra, metas, funcionários e
--                          formalizações. Continua com despesas GERAIS
--                          (general_expenses sem truck_id).

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------
create or replace function private.can_access_finance(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(private.is_active(_user_id), false)
     and (
       private.has_role(_user_id, 'admin'::app_role)
       or private.has_role(_user_id, 'financeiro'::app_role)
     );
$$;

revoke all on function private.can_access_finance(uuid) from public;
revoke all on function private.can_access_finance(uuid) from anon;
grant execute on function private.can_access_finance(uuid) to authenticated;
grant execute on function private.can_access_finance(uuid) to service_role;

-- UPDATE em tabela com RLS também exige uma policy SELECT na própria tabela.
-- Como a Secretaria lê somente a view operacional, as edições dela passam por
-- esta RPC com allowlist fechada. Nenhuma chave financeira é aceita.
create or replace function public.update_truck_operational(
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
    raise exception 'Usuário sem permissão para editar caminhões.' using errcode = '42501';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Alterações operacionais inválidas.' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if v_key not in (
      'brand', 'model', 'year', 'plate', 'color', 'chassis', 'mileage',
      'fuel', 'transmission', 'renavam', 'origin', 'supplier', 'consigned',
      'purchase_date', 'description', 'site_description', 'ai_description',
      'status', 'status_started_at', 'status_expected_end',
      'status_supplier_id', 'status_notes'
    ) then
      raise exception 'Campo não permitido na edição operacional: %', v_key
        using errcode = '42501';
    end if;
  end loop;

  if (p_patch ? 'brand' and nullif(btrim(p_patch ->> 'brand'), '') is null)
     or (p_patch ? 'model' and nullif(btrim(p_patch ->> 'model'), '') is null)
  then
    raise exception 'Marca e modelo são obrigatórios.' using errcode = '23502';
  end if;

  update public.trucks t
  set
    brand = case when p_patch ? 'brand' then btrim(p_patch ->> 'brand') else t.brand end,
    model = case when p_patch ? 'model' then btrim(p_patch ->> 'model') else t.model end,
    year = case when p_patch ? 'year' then (p_patch ->> 'year')::integer else t.year end,
    plate = case when p_patch ? 'plate' then p_patch ->> 'plate' else t.plate end,
    color = case when p_patch ? 'color' then p_patch ->> 'color' else t.color end,
    chassis = case when p_patch ? 'chassis' then p_patch ->> 'chassis' else t.chassis end,
    mileage = case when p_patch ? 'mileage' then (p_patch ->> 'mileage')::bigint else t.mileage end,
    fuel = case when p_patch ? 'fuel' then p_patch ->> 'fuel' else t.fuel end,
    transmission = case when p_patch ? 'transmission' then p_patch ->> 'transmission' else t.transmission end,
    renavam = case when p_patch ? 'renavam' then p_patch ->> 'renavam' else t.renavam end,
    origin = case when p_patch ? 'origin' then p_patch ->> 'origin' else t.origin end,
    supplier = case when p_patch ? 'supplier' then p_patch ->> 'supplier' else t.supplier end,
    consigned = case when p_patch ? 'consigned' then (p_patch ->> 'consigned')::boolean else t.consigned end,
    purchase_date = case when p_patch ? 'purchase_date' then (p_patch ->> 'purchase_date')::date else t.purchase_date end,
    description = case when p_patch ? 'description' then p_patch ->> 'description' else t.description end,
    site_description = case when p_patch ? 'site_description' then p_patch ->> 'site_description' else t.site_description end,
    ai_description = case when p_patch ? 'ai_description' then p_patch ->> 'ai_description' else t.ai_description end,
    status = case when p_patch ? 'status' then (p_patch ->> 'status')::truck_status else t.status end,
    status_started_at = case when p_patch ? 'status_started_at' then (p_patch ->> 'status_started_at')::timestamptz else t.status_started_at end,
    status_expected_end = case when p_patch ? 'status_expected_end' then (p_patch ->> 'status_expected_end')::date else t.status_expected_end end,
    status_supplier_id = case when p_patch ? 'status_supplier_id' then (p_patch ->> 'status_supplier_id')::uuid else t.status_supplier_id end,
    status_notes = case when p_patch ? 'status_notes' then p_patch ->> 'status_notes' else t.status_notes end,
    updated_at = now()
  where t.id = p_id;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Caminhão não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.update_truck_operational(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_truck_operational(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- calendar_events: a Secretaria lê a view sem valores/vínculos financeiros.
-- INSERT operacional permanece direto; UPDATE/DELETE usam RPCs seguras porque
-- a tabela-base deixa de ter uma policy SELECT para esse perfil.
-- ---------------------------------------------------------------------------
create or replace function private.guard_calendar_finance_fields()
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

drop trigger if exists guard_calendar_finance_fields on public.calendar_events;
create trigger guard_calendar_finance_fields
  before insert or update on public.calendar_events
  for each row execute function private.guard_calendar_finance_fields();

create or replace function public.update_calendar_event_operational(
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
    raise exception 'Usuário sem permissão para editar a agenda.' using errcode = '42501';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Alterações do compromisso são inválidas.' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if v_key not in (
      'title', 'description', 'type', 'priority', 'starts_at', 'ends_at',
      'all_day', 'reminder_minutes', 'recurrence', 'owner_id',
      'related_truck_id', 'related_company_vehicle_id'
    ) then
      raise exception 'Campo não permitido na edição operacional da agenda: %', v_key
        using errcode = '42501';
    end if;
  end loop;

  if p_patch ? 'title' and nullif(btrim(p_patch ->> 'title'), '') is null then
    raise exception 'Título é obrigatório.' using errcode = '23502';
  end if;

  update public.calendar_events e
  set
    title = case when p_patch ? 'title' then btrim(p_patch ->> 'title') else e.title end,
    description = case when p_patch ? 'description' then p_patch ->> 'description' else e.description end,
    type = case when p_patch ? 'type' then (p_patch ->> 'type')::event_type else e.type end,
    priority = case when p_patch ? 'priority' then (p_patch ->> 'priority')::deal_priority else e.priority end,
    starts_at = case when p_patch ? 'starts_at' then (p_patch ->> 'starts_at')::timestamptz else e.starts_at end,
    ends_at = case when p_patch ? 'ends_at' then (p_patch ->> 'ends_at')::timestamptz else e.ends_at end,
    all_day = case when p_patch ? 'all_day' then (p_patch ->> 'all_day')::boolean else e.all_day end,
    reminder_minutes = case when p_patch ? 'reminder_minutes' then (p_patch ->> 'reminder_minutes')::integer else e.reminder_minutes end,
    recurrence = case when p_patch ? 'recurrence' then p_patch ->> 'recurrence' else e.recurrence end,
    owner_id = case when p_patch ? 'owner_id' then (p_patch ->> 'owner_id')::uuid else e.owner_id end,
    related_truck_id = case when p_patch ? 'related_truck_id' then (p_patch ->> 'related_truck_id')::uuid else e.related_truck_id end,
    related_company_vehicle_id = case when p_patch ? 'related_company_vehicle_id' then (p_patch ->> 'related_company_vehicle_id')::uuid else e.related_company_vehicle_id end,
    updated_at = now()
  where e.id = p_id
    and e.amount is null
    and e.related_deal_id is null
    and e.related_service_id is null
    and e.related_payable_id is null;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Compromisso operacional não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_calendar_event_operational(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_count integer;
begin
  if coalesce(auth.role(), '') not in ('', 'service_role')
     and not coalesce(private.is_active(auth.uid()), false)
  then
    raise exception 'Usuário sem permissão para excluir da agenda.' using errcode = '42501';
  end if;

  delete from public.calendar_events e
  where e.id = p_id
    and e.amount is null
    and e.related_deal_id is null
    and e.related_service_id is null
    and e.related_payable_id is null;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Compromisso operacional não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.update_calendar_event_operational(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.delete_calendar_event_operational(uuid) from public, anon, authenticated;
grant execute on function public.update_calendar_event_operational(uuid, jsonb) to authenticated, service_role;
grant execute on function public.delete_calendar_event_operational(uuid) to authenticated, service_role;

drop policy if exists "active read events" on public.calendar_events;
drop policy if exists "active update events" on public.calendar_events;
drop policy if exists "active delete events" on public.calendar_events;

create policy "finance read events"
  on public.calendar_events for select
  to authenticated
  using (private.can_access_finance(auth.uid()));

create policy "finance update events"
  on public.calendar_events for update
  to authenticated
  using (private.can_access_finance(auth.uid()))
  with check (private.can_access_finance(auth.uid()));

create policy "finance delete events"
  on public.calendar_events for delete
  to authenticated
  using (private.can_access_finance(auth.uid()));

-- ---------------------------------------------------------------------------
-- trucks: SELECT financeiro; escrita operacional continua permitida.
-- A policy "secretaria manage trucks" era FOR ALL e, por ser permissiva,
-- liberava SELECT de todas as colunas financeiras. Precisa ser removida.
-- ---------------------------------------------------------------------------
drop policy if exists "secretaria manage trucks" on public.trucks;
drop policy if exists "active read trucks" on public.trucks;
drop policy if exists "active delete trucks" on public.trucks;

create policy "finance read trucks"
  on public.trucks for select
  to authenticated
  using (private.can_access_finance(auth.uid()));

create policy "finance delete trucks"
  on public.trucks for delete
  to authenticated
  using (private.can_access_finance(auth.uid()));

-- Trigger de proteção de colunas financeiras em INSERT/UPDATE.
-- Necessário porque as policies de INSERT/UPDATE continuam liberando a
-- Secretaria a cadastrar/editar o caminhão (dados operacionais).
create or replace function private.guard_truck_finance_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_jwt_role text := coalesce(auth.role(), '');
begin
  -- service_role, migrations e SQL editor (sem JWT) não são bloqueados.
  if v_jwt_role = 'service_role' or v_jwt_role = '' then
    return new;
  end if;

  if private.can_access_finance(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.purchase_price is not null
       or new.expected_price is not null
       or new.sold_price is not null
       or coalesce(new.purchase_total_paid, 0) <> 0
       or coalesce(new.purchase_total_pending, 0) <> 0
       or coalesce(new.expenses_total, 0) <> 0
       or coalesce(new.down_payment_value, 0) <> 0
       or new.purchase_payment_method is not null
       or coalesce(new.purchase_installments_count, 1) > 1
       or new.sale_type is not null
       or new.sale_notes is not null
       or new.sale_payment_method is not null
       or (new.down_payment_status is not null
           and new.down_payment_status <> 'pending'::down_payment_status)
    then
      raise exception 'Sem permissão para gravar valores financeiros do caminhão.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.purchase_price is distinct from old.purchase_price
     or new.expected_price is distinct from old.expected_price
     or new.sold_price is distinct from old.sold_price
     or new.expenses_total is distinct from old.expenses_total
     or new.purchase_total_paid is distinct from old.purchase_total_paid
     or new.purchase_total_pending is distinct from old.purchase_total_pending
     or new.down_payment_value is distinct from old.down_payment_value
     or new.down_payment_status is distinct from old.down_payment_status
     or new.down_payment_confirmed_at is distinct from old.down_payment_confirmed_at
     or new.down_payment_confirmed_by is distinct from old.down_payment_confirmed_by
     or new.down_payment_bank_account_id is distinct from old.down_payment_bank_account_id
     or new.purchase_payment_method is distinct from old.purchase_payment_method
     or new.purchase_installments_count is distinct from old.purchase_installments_count
     or new.sale_type is distinct from old.sale_type
     or new.sale_notes is distinct from old.sale_notes
     or new.sale_payment_method is distinct from old.sale_payment_method
  then
    raise exception 'Sem permissão para alterar valores financeiros do caminhão.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_truck_finance_fields() from public, anon, authenticated;

drop trigger if exists guard_truck_finance_fields on public.trucks;
create trigger guard_truck_finance_fields
  before insert or update on public.trucks
  for each row execute function private.guard_truck_finance_fields();

-- ---------------------------------------------------------------------------
-- truck_expenses (despesas do caminhão)
-- ---------------------------------------------------------------------------
drop policy if exists "secretaria manage truck expenses" on public.truck_expenses;
drop policy if exists "active delete truck_expenses" on public.truck_expenses;
drop policy if exists "active insert truck_expenses" on public.truck_expenses;
drop policy if exists "active read truck_expenses" on public.truck_expenses;
drop policy if exists "active update truck_expenses" on public.truck_expenses;

create policy "finance read truck_expenses"
  on public.truck_expenses for select to authenticated
  using (private.can_access_finance(auth.uid()));
create policy "finance insert truck_expenses"
  on public.truck_expenses for insert to authenticated
  with check (private.can_access_finance(auth.uid()));
create policy "finance update truck_expenses"
  on public.truck_expenses for update to authenticated
  using (private.can_access_finance(auth.uid()))
  with check (private.can_access_finance(auth.uid()));
create policy "finance delete truck_expenses"
  on public.truck_expenses for delete to authenticated
  using (private.can_access_finance(auth.uid()));

-- ---------------------------------------------------------------------------
-- services (a Secretaria não tem o módulo Serviços)
-- ---------------------------------------------------------------------------
drop policy if exists "active delete services" on public.services;
drop policy if exists "active insert services" on public.services;
drop policy if exists "active read services" on public.services;
drop policy if exists "active update services" on public.services;

create policy "finance read services"
  on public.services for select to authenticated
  using (private.can_access_finance(auth.uid()));
create policy "finance insert services"
  on public.services for insert to authenticated
  with check (private.can_access_finance(auth.uid()));
create policy "finance update services"
  on public.services for update to authenticated
  using (private.can_access_finance(auth.uid()))
  with check (private.can_access_finance(auth.uid()));
create policy "finance delete services"
  on public.services for delete to authenticated
  using (private.can_access_finance(auth.uid()));

-- ---------------------------------------------------------------------------
-- deals / deal_events (valores de negociação)
-- ---------------------------------------------------------------------------
drop policy if exists "active read deals" on public.deals;
drop policy if exists "active insert deals" on public.deals;
drop policy if exists "active update deals" on public.deals;

create policy "finance read deals"
  on public.deals for select to authenticated
  using (private.can_access_finance(auth.uid()));
create policy "finance insert deals"
  on public.deals for insert to authenticated
  with check (private.can_access_finance(auth.uid()));
create policy "finance update deals"
  on public.deals for update to authenticated
  using (private.can_access_finance(auth.uid()))
  with check (private.can_access_finance(auth.uid()));

drop policy if exists "active read deal_events" on public.deal_events;
drop policy if exists "active insert deal_events" on public.deal_events;

create policy "finance read deal_events"
  on public.deal_events for select to authenticated
  using (private.can_access_finance(auth.uid()));
create policy "finance insert deal_events"
  on public.deal_events for insert to authenticated
  with check (private.can_access_finance(auth.uid()));

-- ---------------------------------------------------------------------------
-- general_expenses: Secretaria somente linhas SEM vínculo com caminhão.
-- ---------------------------------------------------------------------------
drop policy if exists "active delete general_expenses" on public.general_expenses;
drop policy if exists "active insert general_expenses" on public.general_expenses;
drop policy if exists "active read general_expenses" on public.general_expenses;
drop policy if exists "active update general_expenses" on public.general_expenses;

create policy "general_expenses read"
  on public.general_expenses for select to authenticated
  using (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and purchase_installment_id is null
    )
  );
create policy "general_expenses insert"
  on public.general_expenses for insert to authenticated
  with check (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and purchase_installment_id is null
    )
  );
create policy "general_expenses update"
  on public.general_expenses for update to authenticated
  using (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and purchase_installment_id is null
    )
  )
  with check (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and purchase_installment_id is null
    )
  );
create policy "general_expenses delete"
  on public.general_expenses for delete to authenticated
  using (
    private.can_access_finance(auth.uid())
    or (
      coalesce(private.is_active(auth.uid()), false)
      and truck_id is null
      and purchase_installment_id is null
    )
  );

-- ---------------------------------------------------------------------------
-- Contas, bancos, comissões e parcelas de compra
-- ---------------------------------------------------------------------------
drop policy if exists "active read payables" on public.payables;
drop policy if exists "active insert payables" on public.payables;
drop policy if exists "active update payables" on public.payables;
drop policy if exists "active delete payables" on public.payables;
create policy "finance read payables" on public.payables for select to authenticated using (private.can_access_finance(auth.uid()));
create policy "finance insert payables" on public.payables for insert to authenticated with check (private.can_access_finance(auth.uid()));
create policy "finance update payables" on public.payables for update to authenticated using (private.can_access_finance(auth.uid())) with check (private.can_access_finance(auth.uid()));
create policy "finance delete payables" on public.payables for delete to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "active read receivables" on public.receivables;
drop policy if exists "active insert receivables" on public.receivables;
drop policy if exists "active update receivables" on public.receivables;
drop policy if exists "active delete receivables" on public.receivables;
create policy "finance read receivables" on public.receivables for select to authenticated using (private.can_access_finance(auth.uid()));
create policy "finance insert receivables" on public.receivables for insert to authenticated with check (private.can_access_finance(auth.uid()));
create policy "finance update receivables" on public.receivables for update to authenticated using (private.can_access_finance(auth.uid())) with check (private.can_access_finance(auth.uid()));
create policy "finance delete receivables" on public.receivables for delete to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "admin delete bank_accounts" on public.bank_accounts;
drop policy if exists "active read bank_accounts" on public.bank_accounts;
drop policy if exists "active insert bank_accounts" on public.bank_accounts;
drop policy if exists "active update bank_accounts" on public.bank_accounts;
create policy "finance read bank_accounts" on public.bank_accounts for select to authenticated using (private.can_access_finance(auth.uid()));
create policy "finance insert bank_accounts" on public.bank_accounts for insert to authenticated with check (private.can_access_finance(auth.uid()));
create policy "finance update bank_accounts" on public.bank_accounts for update to authenticated using (private.can_access_finance(auth.uid())) with check (private.can_access_finance(auth.uid()));
create policy "finance delete bank_accounts" on public.bank_accounts for delete to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "admin delete bank_tx" on public.bank_transactions;
drop policy if exists "active read bank_tx" on public.bank_transactions;
drop policy if exists "active insert bank_tx" on public.bank_transactions;
drop policy if exists "active update bank_tx" on public.bank_transactions;
create policy "finance read bank_tx" on public.bank_transactions for select to authenticated using (private.can_access_finance(auth.uid()));
create policy "finance insert bank_tx" on public.bank_transactions for insert to authenticated with check (private.can_access_finance(auth.uid()));
create policy "finance update bank_tx" on public.bank_transactions for update to authenticated using (private.can_access_finance(auth.uid())) with check (private.can_access_finance(auth.uid()));
create policy "finance delete bank_tx" on public.bank_transactions for delete to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "admin delete commissions" on public.commissions;
drop policy if exists "active read commissions" on public.commissions;
drop policy if exists "active insert commissions" on public.commissions;
drop policy if exists "active update commissions" on public.commissions;
create policy "finance read commissions" on public.commissions for select to authenticated using (private.can_access_finance(auth.uid()));
create policy "finance insert commissions" on public.commissions for insert to authenticated with check (private.can_access_finance(auth.uid()));
create policy "finance update commissions" on public.commissions for update to authenticated using (private.can_access_finance(auth.uid())) with check (private.can_access_finance(auth.uid()));
create policy "finance delete commissions" on public.commissions for delete to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "Active staff manage purchase installments" on public.truck_purchase_installments;
create policy "finance read truck_purchase_installments" on public.truck_purchase_installments for select to authenticated using (private.can_access_finance(auth.uid()));
create policy "finance insert truck_purchase_installments" on public.truck_purchase_installments for insert to authenticated with check (private.can_access_finance(auth.uid()));
create policy "finance update truck_purchase_installments" on public.truck_purchase_installments for update to authenticated using (private.can_access_finance(auth.uid())) with check (private.can_access_finance(auth.uid()));
create policy "finance delete truck_purchase_installments" on public.truck_purchase_installments for delete to authenticated using (private.can_access_finance(auth.uid()));

-- ---------------------------------------------------------------------------
-- Metas e funcionários (leitura financeira; escrita admin continua igual)
-- ---------------------------------------------------------------------------
drop policy if exists "active read goals" on public.goals;
create policy "finance read goals" on public.goals for select to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "active read employees" on public.employees;
create policy "finance read employees" on public.employees for select to authenticated using (private.can_access_finance(auth.uid()));

-- ---------------------------------------------------------------------------
-- Compras de estoque e despesas de estoque (custos)
-- ---------------------------------------------------------------------------
drop policy if exists "stock_purchases_all" on public.stock_purchases;
create policy "finance read stock_purchases" on public.stock_purchases for select to authenticated using (private.can_access_finance(auth.uid()));
create policy "finance insert stock_purchases" on public.stock_purchases for insert to authenticated with check (private.can_access_finance(auth.uid()));
create policy "finance update stock_purchases" on public.stock_purchases for update to authenticated using (private.can_access_finance(auth.uid())) with check (private.can_access_finance(auth.uid()));
create policy "finance delete stock_purchases" on public.stock_purchases for delete to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "admin delete inventory_expenses" on public.inventory_expenses;
drop policy if exists "active read inventory_expenses" on public.inventory_expenses;
drop policy if exists "active insert inventory_expenses" on public.inventory_expenses;
drop policy if exists "active update inventory_expenses" on public.inventory_expenses;
create policy "finance read inventory_expenses" on public.inventory_expenses for select to authenticated using (private.can_access_finance(auth.uid()));
create policy "finance insert inventory_expenses" on public.inventory_expenses for insert to authenticated with check (private.can_access_finance(auth.uid()));
create policy "finance update inventory_expenses" on public.inventory_expenses for update to authenticated using (private.can_access_finance(auth.uid())) with check (private.can_access_finance(auth.uid()));
create policy "finance delete inventory_expenses" on public.inventory_expenses for delete to authenticated using (private.can_access_finance(auth.uid()));

-- ---------------------------------------------------------------------------
-- Formalizações (contratos e assinaturas)
-- ---------------------------------------------------------------------------
drop policy if exists "Active staff read formalizations" on public.sale_formalizations;
create policy "finance read sale_formalizations" on public.sale_formalizations for select to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "Active staff read signatures" on public.sale_signatures;
create policy "finance read sale_signatures" on public.sale_signatures for select to authenticated using (private.can_access_finance(auth.uid()));

drop policy if exists "Admins can view all formalization logs" on public.sale_formalization_logs;
create policy "admin read sale_formalization_logs"
  on public.sale_formalization_logs for select to authenticated
  using (
    coalesce(private.is_active(auth.uid()), false)
    and private.has_role(auth.uid(), 'admin'::app_role)
  );

-- ---------------------------------------------------------------------------
-- Funções RPC sensíveis: remover grant implícito de PUBLIC (que libera anon)
-- ---------------------------------------------------------------------------
revoke execute on function public.confirm_down_payment(text, uuid, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.confirm_down_payment(text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_down_payment(text, uuid, jsonb, uuid) to authenticated, service_role;
grant execute on function public.confirm_down_payment(text, uuid, uuid, uuid) to authenticated, service_role;

revoke execute on function public.ensure_sale_formalization(uuid, uuid, contract_type, timestamp with time zone, text) from public, anon, authenticated;
revoke execute on function public.finalize_formalization(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.ensure_sale_formalization(uuid, uuid, contract_type, timestamp with time zone, text) to service_role;
grant execute on function public.finalize_formalization(uuid, text, text, text, text) to service_role;

revoke execute on function public.fn_generate_payable_alerts() from public, anon, authenticated;
revoke execute on function public.fn_recalc_truck_purchase_totals() from public, anon, authenticated;
revoke execute on function public.fn_truck_expenses_total(uuid) from public, anon, authenticated;
grant execute on function public.fn_generate_payable_alerts() to authenticated, service_role;
grant execute on function public.fn_recalc_truck_purchase_totals() to authenticated, service_role;
grant execute on function public.fn_truck_expenses_total(uuid) to authenticated, service_role;

revoke execute on function public.fn_general_expense_effective_amount(boolean, numeric, numeric) from public, anon, authenticated;
grant execute on function public.fn_general_expense_effective_amount(boolean, numeric, numeric) to authenticated, service_role;
