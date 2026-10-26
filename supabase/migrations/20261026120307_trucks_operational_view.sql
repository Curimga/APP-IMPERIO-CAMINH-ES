-- View operacional de caminhões.
--
-- Objetivo: permitir que perfis sem acesso financeiro (Secretaria) consultem a
-- garagem sem receber preço de compra/venda, custo, lucro, parcelas ou totais.
--
-- A view roda com os privilégios do owner (security_invoker = false) para poder
-- ler `public.trucks` mesmo depois que o SELECT direto for revogado da
-- Secretaria. Por isso o filtro de usuário ativo é aplicado explicitamente e a
-- lista de colunas é fechada (allowlist): nunca usar `select *` nesta view.
--
-- As fotos são entregues como JSON para evitar depender de "embedding" do
-- PostgREST em uma view (não há FK para relacionamento).
--
-- Esta migration é ADITIVA e pode ser aplicada antes do deploy do app.

create or replace view public.trucks_operational
with (security_invoker = false, security_barrier = true)
as
select
  t.id,
  t.brand,
  t.model,
  t.plate,
  t.renavam,
  t.chassis,
  t.year,
  t.color,
  t.mileage,
  t.fuel,
  t.transmission,
  t.origin,
  t.consigned,
  t.supplier,
  t.status,
  t.purchase_date,
  t.description,
  t.ai_description,
  t.created_by,
  t.created_at,
  t.updated_at,
  t.status_started_at,
  t.status_expected_end,
  t.status_supplier_id,
  t.status_notes,
  t.sold_at,
  t.sold_customer_id,
  t.warranty_end,
  t.site_description,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'url', p.url,
          'is_cover', p.is_cover,
          'position', p.position,
          'created_at', p.created_at
        )
        order by p.is_cover desc, p.position asc, p.created_at asc
      )
      from public.truck_photos p
      where p.truck_id = t.id
    ),
    '[]'::jsonb
  ) as truck_photos
from public.trucks t
where private.is_active(auth.uid());

comment on view public.trucks_operational is
  'Colunas operacionais de trucks (sem valores financeiros) + fotos em JSON. Somente leitura.';

revoke all on public.trucks_operational from anon;
grant select on public.trucks_operational to authenticated;
grant select on public.trucks_operational to service_role;

-- Agenda operacional. Eventos originados por contas, serviços ou negócios são
-- omitidos por inteiro, em vez de apenas mascarar o valor, para não expor a
-- existência nem os identificadores de registros financeiros.
create or replace view public.calendar_events_operational
with (security_invoker = false, security_barrier = true)
as
select
  e.id,
  e.title,
  e.description,
  e.type,
  e.priority,
  e.starts_at,
  e.ends_at,
  e.all_day,
  e.reminder_minutes,
  e.recurrence,
  e.owner_id,
  e.related_truck_id,
  e.related_company_vehicle_id,
  e.created_at,
  e.updated_at
from public.calendar_events e
where private.is_active(auth.uid())
  and e.amount is null
  and e.related_deal_id is null
  and e.related_service_id is null
  and e.related_payable_id is null;

comment on view public.calendar_events_operational is
  'Eventos operacionais sem valores nem vínculos com negócios, serviços ou contas. Somente leitura.';

revoke all on public.calendar_events_operational from public, anon;
grant select on public.calendar_events_operational to authenticated;
grant select on public.calendar_events_operational to service_role;

-- RPCs operacionais também são aditivas. Elas precisam existir antes do deploy
-- do frontend que passa a usá-las, enquanto as policies antigas ainda vigoram.
create or replace function public.update_truck_operational(p_id uuid, p_patch jsonb)
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

create or replace function public.update_calendar_event_operational(p_id uuid, p_patch jsonb)
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

revoke execute on function public.update_truck_operational(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.update_calendar_event_operational(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.delete_calendar_event_operational(uuid) from public, anon, authenticated;
grant execute on function public.update_truck_operational(uuid, jsonb) to authenticated, service_role;
grant execute on function public.update_calendar_event_operational(uuid, jsonb) to authenticated, service_role;
grant execute on function public.delete_calendar_event_operational(uuid) to authenticated, service_role;
