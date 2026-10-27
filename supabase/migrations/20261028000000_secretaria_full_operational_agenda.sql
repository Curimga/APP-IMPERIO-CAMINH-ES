-- A Secretaria pode consultar toda a agenda operacional, sem valores ou
-- identificadores de negócio/contas que revelem dados financeiros.
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
  e.recurrence_until,
  e.owner_id,
  e.related_truck_id,
  e.related_company_vehicle_id,
  e.created_at,
  e.updated_at
from public.calendar_events e
where private.is_active(auth.uid());

comment on view public.calendar_events_operational is
  'Agenda completa sem valores, negócios ou vínculos financeiros.';

revoke all on public.calendar_events_operational from public, anon;
grant select on public.calendar_events_operational to authenticated;
grant select on public.calendar_events_operational to service_role;
