alter table public.calendar_events
  add column if not exists recurrence_until date;

comment on column public.calendar_events.recurrence_until is
  'Data limite inclusiva para a série de recorrência do evento.';

drop view if exists public.calendar_events_operational;

create view public.calendar_events_operational
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
  e.recurrence_until,
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
      'all_day', 'reminder_minutes', 'recurrence', 'recurrence_until', 'owner_id',
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
    recurrence_until = case when p_patch ? 'recurrence_until' then (p_patch ->> 'recurrence_until')::date else e.recurrence_until end,
    owner_id = case when p_patch ? 'owner_id' then (p_patch ->> 'owner_id')::uuid else e.owner_id end,
    related_truck_id = case when p_patch ? 'related_truck_id' then (p_patch ->> 'related_truck_id')::uuid else e.related_truck_id end,
    related_company_vehicle_id = case when p_patch ? 'related_company_vehicle_id' then (p_patch ->> 'related_company_vehicle_id')::uuid else e.related_company_vehicle_id end,
    updated_at = now()
  where e.id = p_id;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Compromisso não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on public.calendar_events_operational from public, anon;
grant select on public.calendar_events_operational to authenticated;
grant select on public.calendar_events_operational to service_role;
