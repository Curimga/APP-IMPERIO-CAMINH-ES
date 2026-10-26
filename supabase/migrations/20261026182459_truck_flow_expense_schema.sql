-- ===========================================================================
-- Migration: truck_flow_expense_schema
-- Criado em: 2026-10-26
-- Objetivo: Fluxo de caminhão com acesso individual + confirmação de despesas
-- por aprovador autorizado; pendências ficam fora dos totais oficiais.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Habilita storage privado para evidências do fluxo
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'truck-flow-evidence',
  'truck-flow-evidence',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Tabelas de fluxo de caminhão
-- ---------------------------------------------------------------------------

create table if not exists public.truck_flow_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_level text not null check (access_level in ('editor','viewer')),
  created_at timestamptz not null default now()
);

alter table public.truck_flow_access enable row level security;

create table if not exists public.expense_approval_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_approve boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.expense_approval_access enable row level security;

create table if not exists public.truck_flows (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  status text not null check (status in ('in_progress','completed')) default 'in_progress',
  started_at timestamptz not null default now(),
  started_by uuid not null references auth.users(id),
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (truck_id)
);

alter table public.truck_flows enable row level security;

create table if not exists public.truck_flow_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.truck_flows(id) on delete cascade,
  step_key text not null,
  display_order smallint not null,
  status text not null check (status in ('pending','completed')) default 'pending',
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  notes text,
  unique (flow_id, step_key)
);

alter table public.truck_flow_steps enable row level security;

create table if not exists public.truck_flow_evidence (
  id uuid primary key default gen_random_uuid(),
  flow_step_id uuid not null references public.truck_flow_steps(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.truck_flow_evidence enable row level security;

create table if not exists public.truck_flow_events (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.truck_flows(id) on delete cascade,
  step_id uuid references public.truck_flow_steps(id) on delete set null,
  event_type text not null check (event_type in ('created','step_completed','step_reopened','flow_completed','flow_reopened','evidence_added','evidence_removed')),
  reason text,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.truck_flow_events enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Tabelas de confirmação de despesas
-- ---------------------------------------------------------------------------

create table if not exists public.expense_approval_requests (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('general_expense','truck_expense','payable')),
  origin text not null check (origin in ('manual','service','inventory')),
  status text not null check (status in ('pending','returned','approved')) default 'pending',
  created_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  correction_note text,
  proposed_category text,
  final_category text,
  amount numeric not null default 0,
  description text not null,
  occurred_at date,
  due_date date,
  supplier text,
  notes text,
  payment_method text,
  proposed_status text,
  truck_id uuid references public.trucks(id),
  service_id uuid references public.services(id),
  stock_movement_id uuid references public.inventory_movements(id),
  resulting_table text,
  resulting_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expense_approval_requests enable row level security;

create table if not exists public.expense_approval_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.expense_approval_requests(id) on delete cascade,
  event_type text not null check (event_type in ('submitted','corrected','returned','resubmitted','approved','cancelled')),
  actor_id uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

alter table public.expense_approval_events enable row level security;

create or replace function private.can_approve_expenses(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    _user_id is not null
    and (auth.uid() is null or _user_id = auth.uid())
    and coalesce(private.is_active(_user_id), false)
    and exists (
      select 1
      from public.expense_approval_access access
      where access.user_id = _user_id
        and access.can_approve
    );
$$;

revoke all on function private.can_approve_expenses(uuid) from public;
grant execute on function private.can_approve_expenses(uuid) to authenticated;

create or replace function private.can_edit_truck_flow(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    _user_id is not null
    and (auth.uid() is null or _user_id = auth.uid())
    and coalesce(private.is_active(_user_id), false)
    and exists (
      select 1
      from public.truck_flow_access access
      where access.user_id = _user_id
        and access.access_level = 'editor'
    );
$$;

revoke all on function private.can_edit_truck_flow(uuid) from public;
grant execute on function private.can_edit_truck_flow(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS — truck_flow_access
-- ---------------------------------------------------------------------------

create policy "truck_flow_access_read_own"
on public.truck_flow_access for select
to authenticated
using (user_id = auth.uid());

create policy "truck_flow_access_insert_service_role"
on public.truck_flow_access for insert
to service_role
with check (true);

create policy "truck_flow_access_update_service_role"
on public.truck_flow_access for update
to service_role
using (true);

create policy "expense_approval_access_read_own"
on public.expense_approval_access for select
to authenticated
using (user_id = auth.uid());

create policy "expense_approval_access_insert_service_role"
on public.expense_approval_access for insert
to service_role
with check (true);

create policy "expense_approval_access_update_service_role"
on public.expense_approval_access for update
to service_role
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- 5. RLS — truck_flows
-- ---------------------------------------------------------------------------

create policy "truck_flows_select_authorized"
on public.truck_flows for select
to authenticated
using (
  exists (
    select 1 from public.truck_flow_access a
    where a.user_id = auth.uid()
      and a.access_level in ('editor','viewer')
  )
);

create policy "truck_flows_insert_editor"
on public.truck_flows for insert
to authenticated
with check (
  exists (
    select 1 from public.truck_flow_access a
    where a.user_id = auth.uid()
      and a.access_level = 'editor'
  )
);

create policy "truck_flows_update_editor"
on public.truck_flows for update
to authenticated
using (
  exists (
    select 1 from public.truck_flow_access a
    where a.user_id = auth.uid()
      and a.access_level = 'editor'
  )
);

create policy "truck_flows_delete_editor"
on public.truck_flows for delete
to authenticated
using (
  exists (
    select 1 from public.truck_flow_access a
    where a.user_id = auth.uid()
      and a.access_level = 'editor'
  )
);

-- ---------------------------------------------------------------------------
-- 6. RLS — truck_flow_steps
-- ---------------------------------------------------------------------------

create policy "truck_flow_steps_select_authorized"
on public.truck_flow_steps for select
to authenticated
using (
  exists (
    select 1 from public.truck_flows f
    join public.truck_flow_access a on a.user_id = auth.uid()
    where f.id = truck_flow_steps.flow_id
      and a.access_level in ('editor','viewer')
  )
);

create policy "truck_flow_steps_insert_editor"
on public.truck_flow_steps for insert
to authenticated
with check (
  exists (
    select 1 from public.truck_flows f
    join public.truck_flow_access a on a.user_id = auth.uid()
    where f.id = truck_flow_steps.flow_id
      and a.access_level = 'editor'
  )
);

create policy "truck_flow_steps_update_editor"
on public.truck_flow_steps for update
to authenticated
using (
  exists (
    select 1 from public.truck_flows f
    join public.truck_flow_access a on a.user_id = auth.uid()
    where f.id = truck_flow_steps.flow_id
      and a.access_level = 'editor'
  )
);

-- ---------------------------------------------------------------------------
-- 7. RLS — truck_flow_evidence
-- ---------------------------------------------------------------------------

create policy "truck_flow_evidence_select_authorized"
on public.truck_flow_evidence for select
to authenticated
using (
  exists (
    select 1 from public.truck_flow_steps s
    join public.truck_flows f on f.id = s.flow_id
    join public.truck_flow_access a on a.user_id = auth.uid()
    where s.id = truck_flow_evidence.flow_step_id
      and a.access_level in ('editor','viewer')
  )
);

create policy "truck_flow_evidence_insert_editor"
on public.truck_flow_evidence for insert
to authenticated
with check (
  exists (
    select 1 from public.truck_flow_steps s
    join public.truck_flows f on f.id = s.flow_id
    join public.truck_flow_access a on a.user_id = auth.uid()
    where s.id = truck_flow_evidence.flow_step_id
      and a.access_level = 'editor'
  )
);

create policy "truck_flow_evidence_delete_editor"
on public.truck_flow_evidence for delete
to authenticated
using (
  exists (
    select 1 from public.truck_flow_steps s
    join public.truck_flows f on f.id = s.flow_id
    join public.truck_flow_access a on a.user_id = auth.uid()
    where s.id = truck_flow_evidence.flow_step_id
      and a.access_level = 'editor'
  )
);

-- ---------------------------------------------------------------------------
-- 8. RLS — truck_flow_events
-- ---------------------------------------------------------------------------

create policy "truck_flow_events_select_authorized"
on public.truck_flow_events for select
to authenticated
using (
  exists (
    select 1 from public.truck_flows f
    join public.truck_flow_access a on a.user_id = auth.uid()
    where f.id = truck_flow_events.flow_id
      and a.access_level in ('editor','viewer')
  )
);

create policy "truck_flow_events_insert_editor"
on public.truck_flow_events for insert
to authenticated
with check (
  exists (
    select 1 from public.truck_flows f
    join public.truck_flow_access a on a.user_id = auth.uid()
    where f.id = truck_flow_events.flow_id
      and a.access_level = 'editor'
  )
);

-- Mutações do fluxo são exclusivamente pelas RPCs abaixo, garantindo que
-- mudanças de estado e eventos de auditoria pertençam à mesma transação.
drop policy if exists "truck_flows_insert_editor" on public.truck_flows;
drop policy if exists "truck_flows_update_editor" on public.truck_flows;
drop policy if exists "truck_flows_delete_editor" on public.truck_flows;
drop policy if exists "truck_flow_steps_insert_editor" on public.truck_flow_steps;
drop policy if exists "truck_flow_steps_update_editor" on public.truck_flow_steps;
drop policy if exists "truck_flow_evidence_insert_editor" on public.truck_flow_evidence;
drop policy if exists "truck_flow_evidence_delete_editor" on public.truck_flow_evidence;
drop policy if exists "truck_flow_events_insert_editor" on public.truck_flow_events;

create or replace function public.create_truck_flow(p_truck_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_flow_id uuid;
begin
  if not coalesce(private.can_edit_truck_flow(v_user_id), false) then
    raise exception 'Usuário não autorizado a criar fluxos.';
  end if;
  if not exists (select 1 from public.trucks where id = p_truck_id) then
    raise exception 'Caminhão não encontrado.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_truck_id::text, 0));
  select id into v_flow_id from public.truck_flows where truck_id = p_truck_id;
  if v_flow_id is not null then return v_flow_id; end if;

  insert into public.truck_flows (truck_id, started_by)
  values (p_truck_id, v_user_id)
  returning id into v_flow_id;

  insert into public.truck_flow_steps (flow_id, step_key, display_order)
  values
    (v_flow_id, 'crm_add', 1),
    (v_flow_id, 'vistoria_marcelo', 2),
    (v_flow_id, 'necessidades', 3),
    (v_flow_id, 'retorno_servico', 4),
    (v_flow_id, 'vistoria_banco', 5),
    (v_flow_id, 'documentacao', 6);

  insert into public.truck_flow_events (flow_id, event_type, actor_id)
  values (v_flow_id, 'created', v_user_id);
  return v_flow_id;
end;
$$;

create or replace function public.complete_truck_flow_step(
  p_flow_id uuid,
  p_step_key text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_flow public.truck_flows%rowtype;
  v_step public.truck_flow_steps%rowtype;
begin
  if not coalesce(private.can_edit_truck_flow(v_user_id), false) then
    raise exception 'Usuário não autorizado a concluir etapas.';
  end if;
  if p_step_key not in ('crm_add','vistoria_marcelo','necessidades','retorno_servico','vistoria_banco','documentacao') then
    raise exception 'Etapa inválida.';
  end if;
  if p_step_key = 'necessidades' and nullif(btrim(p_notes), '') is null then
    raise exception 'A descrição do que precisa ser feito é obrigatória.';
  end if;

  select * into v_flow from public.truck_flows where id = p_flow_id for update;
  if not found then raise exception 'Fluxo não encontrado.'; end if;
  select * into v_step
  from public.truck_flow_steps
  where flow_id = p_flow_id and step_key = p_step_key
  for update;
  if not found then raise exception 'Etapa não encontrada.'; end if;
  if v_step.status <> 'pending' then raise exception 'Etapa já concluída.'; end if;

  update public.truck_flow_steps
  set status = 'completed', completed_at = now(), completed_by = v_user_id,
      notes = nullif(btrim(p_notes), '')
  where id = v_step.id;

  insert into public.truck_flow_events (flow_id, step_id, event_type, actor_id)
  values (p_flow_id, v_step.id, 'step_completed', v_user_id);

  if not exists (
    select 1 from public.truck_flow_steps
    where flow_id = p_flow_id and status <> 'completed'
  ) then
    update public.truck_flows
    set status = 'completed', completed_at = now(), completed_by = v_user_id, updated_at = now()
    where id = p_flow_id;
    insert into public.truck_flow_events (flow_id, event_type, actor_id)
    values (p_flow_id, 'flow_completed', v_user_id);
  else
    update public.truck_flows set updated_at = now() where id = p_flow_id;
  end if;
end;
$$;

create or replace function public.reopen_truck_flow_step(
  p_flow_id uuid,
  p_step_key text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_flow public.truck_flows%rowtype;
  v_step public.truck_flow_steps%rowtype;
begin
  if not coalesce(private.can_edit_truck_flow(v_user_id), false) then
    raise exception 'Usuário não autorizado a reabrir etapas.';
  end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'O motivo da reabertura é obrigatório.'; end if;
  if p_step_key not in ('crm_add','vistoria_marcelo','necessidades','retorno_servico','vistoria_banco','documentacao') then
    raise exception 'Etapa inválida.';
  end if;

  select * into v_flow from public.truck_flows where id = p_flow_id for update;
  if not found then raise exception 'Fluxo não encontrado.'; end if;
  select * into v_step
  from public.truck_flow_steps
  where flow_id = p_flow_id and step_key = p_step_key
  for update;
  if not found then raise exception 'Etapa não encontrada.'; end if;
  if v_step.status <> 'completed' then raise exception 'Etapa não está concluída.'; end if;

  update public.truck_flow_steps
  set status = 'pending', completed_at = null, completed_by = null, notes = null
  where id = v_step.id;
  update public.truck_flows
  set status = 'in_progress', completed_at = null, completed_by = null, updated_at = now()
  where id = p_flow_id;

  insert into public.truck_flow_events (flow_id, step_id, event_type, reason, actor_id)
  values (p_flow_id, v_step.id, 'step_reopened', btrim(p_reason), v_user_id);
  if v_flow.status = 'completed' then
    insert into public.truck_flow_events (flow_id, event_type, reason, actor_id)
    values (p_flow_id, 'flow_reopened', btrim(p_reason), v_user_id);
  end if;
end;
$$;

create or replace function public.add_truck_flow_evidence(
  p_flow_step_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_flow_id uuid;
  v_evidence_id uuid;
begin
  if not coalesce(private.can_edit_truck_flow(v_user_id), false) then
    raise exception 'Usuário não autorizado a anexar evidências.';
  end if;
  select flow_id into v_flow_id from public.truck_flow_steps where id = p_flow_step_id;
  if v_flow_id is null then raise exception 'Etapa não encontrada.'; end if;
  if p_storage_path not like (p_flow_step_id::text || '/%') then raise exception 'Caminho de arquivo inválido.'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp','application/pdf') then raise exception 'Tipo de arquivo inválido.'; end if;
  if nullif(btrim(p_file_name), '') is null then raise exception 'Nome de arquivo obrigatório.'; end if;
  if p_size_bytes <= 0 or p_size_bytes > 10485760 then raise exception 'Tamanho de arquivo inválido.'; end if;

  insert into public.truck_flow_evidence (
    flow_step_id, storage_path, file_name, mime_type, size_bytes, uploaded_by
  ) values (
    p_flow_step_id, p_storage_path, p_file_name, p_mime_type, p_size_bytes, v_user_id
  ) returning id into v_evidence_id;
  insert into public.truck_flow_events (flow_id, step_id, event_type, actor_id)
  values (v_flow_id, p_flow_step_id, 'evidence_added', v_user_id);
  return v_evidence_id;
end;
$$;

create or replace function public.remove_truck_flow_evidence(p_evidence_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_evidence public.truck_flow_evidence%rowtype;
  v_flow_id uuid;
begin
  if not coalesce(private.can_edit_truck_flow(v_user_id), false) then
    raise exception 'Usuário não autorizado a remover evidências.';
  end if;
  select * into v_evidence
  from public.truck_flow_evidence
  where id = p_evidence_id
  for update;
  if not found then raise exception 'Evidência não encontrada.'; end if;
  select flow_id into v_flow_id from public.truck_flow_steps where id = v_evidence.flow_step_id;

  delete from public.truck_flow_evidence where id = p_evidence_id;
  insert into public.truck_flow_events (flow_id, step_id, event_type, actor_id)
  values (v_flow_id, v_evidence.flow_step_id, 'evidence_removed', v_user_id);
  return v_evidence.storage_path;
end;
$$;

revoke all on function public.create_truck_flow(uuid) from public;
revoke all on function public.complete_truck_flow_step(uuid,text,text) from public;
revoke all on function public.reopen_truck_flow_step(uuid,text,text) from public;
revoke all on function public.add_truck_flow_evidence(uuid,text,text,text,bigint) from public;
revoke all on function public.remove_truck_flow_evidence(uuid) from public;
grant execute on function public.create_truck_flow(uuid) to authenticated;
grant execute on function public.complete_truck_flow_step(uuid,text,text) to authenticated;
grant execute on function public.reopen_truck_flow_step(uuid,text,text) to authenticated;
grant execute on function public.add_truck_flow_evidence(uuid,text,text,text,bigint) to authenticated;
grant execute on function public.remove_truck_flow_evidence(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. RLS — expense_approval_requests
-- ---------------------------------------------------------------------------

create policy "expense_requests_select_owner_or_approver"
on public.expense_approval_requests for select
to authenticated
using (
  created_by = auth.uid()
  or private.can_approve_expenses(auth.uid())
);

-- Mutações são exclusivamente pelas RPCs abaixo, para que solicitação,
-- despesa resultante e evento de auditoria sejam gravados na mesma transação.

-- ---------------------------------------------------------------------------
-- 10. RLS — expense_approval_events
-- ---------------------------------------------------------------------------

create policy "expense_events_select_owner_or_approver"
on public.expense_approval_events for select
to authenticated
using (
  exists (
    select 1 from public.expense_approval_requests r
    where r.id = expense_approval_events.request_id
      and (r.created_by = auth.uid()
           or private.can_approve_expenses(auth.uid()))
  )
);

-- ---------------------------------------------------------------------------
-- 11. Operações atômicas da confirmação de despesas
-- ---------------------------------------------------------------------------

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
  if p_origin not in ('manual', 'service', 'inventory') then
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
    p_truck_id, p_service_id, p_stock_movement_id, p_occurred_at,
    p_due_date, nullif(btrim(p_supplier), ''), nullif(btrim(p_notes), ''),
    nullif(btrim(p_payment_method), ''), nullif(btrim(p_proposed_status), '')
  );

  insert into public.expense_approval_events (request_id, event_type, actor_id)
  values (v_request_id, 'submitted', v_user_id);

  return v_request_id;
end;
$$;

create or replace function public.approve_expense_approval(
  p_request_id uuid,
  p_final_category text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.expense_approval_requests%rowtype;
  v_result_id uuid := gen_random_uuid();
begin
  if not coalesce(private.can_approve_expenses(v_user_id), false) then
    raise exception 'Usuário não autorizado a aprovar despesas.';
  end if;

  select * into v_request
  from public.expense_approval_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_request.created_by = v_user_id then
    raise exception 'O solicitante não pode aprovar a própria despesa.';
  end if;
  if v_request.status <> 'pending' or v_request.resulting_id is not null then
    raise exception 'A solicitação não está pendente.';
  end if;
  if nullif(btrim(p_final_category), '') is null then
    raise exception 'A categoria final é obrigatória.';
  end if;

  if v_request.target_type = 'general_expense' then
    insert into public.general_expenses (
      id, description, category, supplier, amount, occurred_at, shared,
      imperio_amount, notes, created_by, truck_id, payment_method, due_date, status
    ) values (
      v_result_id, v_request.description, btrim(p_final_category), v_request.supplier,
      v_request.amount, coalesce(v_request.occurred_at, current_date), false,
      v_request.amount, v_request.notes, v_request.created_by, v_request.truck_id,
      v_request.payment_method, v_request.due_date,
      coalesce(v_request.proposed_status, 'aberto')
    );
  elsif v_request.target_type = 'truck_expense' then
    insert into public.truck_expenses (
      id, truck_id, kind, description, amount, occurred_at, created_by,
      service_id, supplier, notes, due_date, status, stock_movement_id
    ) values (
      v_result_id, v_request.truck_id,
      btrim(p_final_category)::public.expense_kind,
      v_request.description, v_request.amount,
      coalesce(v_request.occurred_at, current_date), v_request.created_by,
      v_request.service_id, v_request.supplier, v_request.notes,
      v_request.due_date, coalesce(v_request.proposed_status, 'pago'),
      v_request.stock_movement_id
    );
  elsif v_request.target_type = 'payable' then
    insert into public.payables (
      id, description, amount, due_date, status, supplier, notes, truck_id,
      created_by, occurred_at, payment_method
    ) values (
      v_result_id, v_request.description, v_request.amount, v_request.due_date,
      'aberto'::public.payable_status, v_request.supplier, v_request.notes,
      v_request.truck_id, v_request.created_by, v_request.occurred_at,
      case when v_request.payment_method is null then null
           else v_request.payment_method::public.payment_method end
    );
  end if;

  update public.expense_approval_requests
  set status = 'approved', final_category = btrim(p_final_category),
      reviewed_by = v_user_id, reviewed_at = now(),
      correction_note = null, resulting_table =
        case v_request.target_type
          when 'general_expense' then 'general_expenses'
          when 'truck_expense' then 'truck_expenses'
          else 'payables'
        end,
      resulting_id = v_result_id, updated_at = now()
  where id = p_request_id;

  insert into public.expense_approval_events (request_id, event_type, actor_id, note)
  values (p_request_id, 'approved', v_user_id, 'Categoria confirmada: ' || btrim(p_final_category));

  return v_result_id;
end;
$$;

create or replace function public.return_expense_approval(
  p_request_id uuid,
  p_correction_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.expense_approval_requests%rowtype;
begin
  if not coalesce(private.can_approve_expenses(v_user_id), false) then
    raise exception 'Usuário não autorizado a devolver despesas.';
  end if;
  if nullif(btrim(p_correction_note), '') is null then
    raise exception 'O motivo da devolução é obrigatório.';
  end if;

  select * into v_request
  from public.expense_approval_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_request.created_by = v_user_id then
    raise exception 'O solicitante não pode revisar a própria despesa.';
  end if;
  if v_request.status <> 'pending' or v_request.resulting_id is not null then
    raise exception 'A solicitação não está pendente.';
  end if;

  update public.expense_approval_requests
  set status = 'returned', correction_note = btrim(p_correction_note),
      reviewed_by = v_user_id, reviewed_at = now(), updated_at = now()
  where id = p_request_id;

  insert into public.expense_approval_events (request_id, event_type, actor_id, note)
  values (p_request_id, 'returned', v_user_id, btrim(p_correction_note));
end;
$$;

create or replace function public.resubmit_expense_approval(
  p_request_id uuid,
  p_proposed_category text,
  p_amount numeric,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.expense_approval_requests%rowtype;
begin
  if v_user_id is null or not coalesce(private.is_active(v_user_id), false) then
    raise exception 'Usuário não autorizado.';
  end if;
  select * into v_request
  from public.expense_approval_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  if v_request.created_by <> v_user_id then raise exception 'Solicitação pertence a outro usuário.'; end if;
  if v_request.status <> 'returned' then raise exception 'Solicitação não está devolvida.'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'O valor deve ser maior que zero.'; end if;
  if nullif(btrim(p_description), '') is null then raise exception 'A descrição é obrigatória.'; end if;

  update public.expense_approval_requests
  set status = 'pending', proposed_category = nullif(btrim(p_proposed_category), ''),
      amount = p_amount, description = btrim(p_description), reviewed_by = null,
      reviewed_at = null, correction_note = null, updated_at = now()
  where id = p_request_id;

  insert into public.expense_approval_events (request_id, event_type, actor_id, note)
  values (p_request_id, 'resubmitted', v_user_id, 'Corrigido e reenviado para confirmação');
end;
$$;

revoke all on function public.submit_expense_approval(text,text,text,numeric,text,uuid,uuid,uuid,date,date,text,text,text,text) from public;
revoke all on function public.approve_expense_approval(uuid,text) from public;
revoke all on function public.return_expense_approval(uuid,text) from public;
revoke all on function public.resubmit_expense_approval(uuid,text,numeric,text) from public;
grant execute on function public.submit_expense_approval(text,text,text,numeric,text,uuid,uuid,uuid,date,date,text,text,text,text) to authenticated;
grant execute on function public.approve_expense_approval(uuid,text) to authenticated;
grant execute on function public.return_expense_approval(uuid,text) to authenticated;
grant execute on function public.resubmit_expense_approval(uuid,text,numeric,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Sementes de acesso individual aprovadas
-- ---------------------------------------------------------------------------

insert into public.truck_flow_access (user_id, access_level) values
  ('3448577c-8f44-41d0-83a8-ea88549d7d84', 'editor'),
  ('7d0cedbe-b0af-42a4-817d-6ab28e0f1002', 'viewer')
on conflict (user_id) do update set access_level = excluded.access_level;

insert into public.expense_approval_access (user_id, can_approve) values
  ('7d0cedbe-b0af-42a4-817d-6ab28e0f1002', true)
on conflict (user_id) do update set can_approve = excluded.can_approve;

-- Bucket privado: somente usuários autorizados ao fluxo podem ler, e apenas
-- editores podem gravar/remover objetos vinculados a etapas existentes.
create policy "truck_flow_evidence_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'truck-flow-evidence'
  and exists (
    select 1
    from public.truck_flow_evidence evidence
    join public.truck_flow_steps step on step.id = evidence.flow_step_id
    join public.truck_flow_access access on access.user_id = auth.uid()
    where evidence.storage_path = name
      and access.access_level in ('editor', 'viewer')
  )
);

create policy "truck_flow_evidence_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'truck-flow-evidence'
  and exists (
    select 1
    from public.truck_flow_steps step
    join public.truck_flow_access access on access.user_id = auth.uid()
    where step.id::text = (storage.foldername(name))[1]
      and access.access_level = 'editor'
  )
);

create policy "truck_flow_evidence_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'truck-flow-evidence'
  and exists (
    select 1
    from public.truck_flow_evidence evidence
    join public.truck_flow_access access on access.user_id = auth.uid()
    where evidence.storage_path = name
      and access.access_level = 'editor'
  )
);

-- ---------------------------------------------------------------------------
-- 13. Realtime: publicar novas tabelas
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.truck_flows;
alter publication supabase_realtime add table public.truck_flow_access;
alter publication supabase_realtime add table public.truck_flow_steps;
alter publication supabase_realtime add table public.truck_flow_evidence;
alter publication supabase_realtime add table public.truck_flow_events;
alter publication supabase_realtime add table public.expense_approval_requests;
alter publication supabase_realtime add table public.expense_approval_events;
alter publication supabase_realtime add table public.expense_approval_access;
