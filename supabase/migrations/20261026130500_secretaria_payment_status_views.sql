create or replace view public.payables_operational
with (security_invoker = false, security_barrier = true)
as
select
  p.id,
  p.description,
  p.due_date,
  p.status,
  p.paid_at,
  p.created_at
from public.payables p
where private.is_active(auth.uid());

create or replace view public.receivables_operational
with (security_invoker = false, security_barrier = true)
as
select
  r.id,
  r.description,
  r.due_date,
  r.status,
  r.received_at,
  r.created_at
from public.receivables r
where private.is_active(auth.uid());

comment on view public.payables_operational is
  'Contas a pagar para consulta operacional: sem valores, fornecedores ou vínculos financeiros.';
comment on view public.receivables_operational is
  'Contas a receber para consulta operacional: sem valores, clientes ou vínculos financeiros.';

revoke all on public.payables_operational, public.receivables_operational from public, anon;
grant select on public.payables_operational, public.receivables_operational to authenticated;
grant select on public.payables_operational, public.receivables_operational to service_role;
