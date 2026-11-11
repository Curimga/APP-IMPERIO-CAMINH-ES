-- Libera o fluxo de caminhão para todos os usuários ativos autenticados.
-- O registro em truck_flow_access deixa de ser necessário para este fluxo.

create or replace function private.can_access_truck_flow(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    _user_id is not null
    and (auth.uid() is null or _user_id = auth.uid())
    and exists (
      select 1
        from public.profiles p
       where p.id = _user_id
         and p.status = 'active'
    );
$$;

revoke all on function private.can_access_truck_flow(uuid) from public;
grant execute on function private.can_access_truck_flow(uuid) to authenticated;

create or replace function private.can_edit_truck_flow(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.can_access_truck_flow(_user_id), false);
$$;

drop policy if exists "truck_flows_select_authorized" on public.truck_flows;
create policy "truck_flows_select_active_users"
on public.truck_flows for select
to authenticated
using (private.can_access_truck_flow(auth.uid()));

drop policy if exists "truck_flow_steps_select_authorized" on public.truck_flow_steps;
create policy "truck_flow_steps_select_active_users"
on public.truck_flow_steps for select
to authenticated
using (private.can_access_truck_flow(auth.uid()));

drop policy if exists "truck_flow_evidence_select_authorized" on public.truck_flow_evidence;
create policy "truck_flow_evidence_select_active_users"
on public.truck_flow_evidence for select
to authenticated
using (private.can_access_truck_flow(auth.uid()));

drop policy if exists "truck_flow_events_select_authorized" on public.truck_flow_events;
create policy "truck_flow_events_select_active_users"
on public.truck_flow_events for select
to authenticated
using (private.can_access_truck_flow(auth.uid()));

create or replace function public.fn_notify_executive_truck_flow_step()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'auth', 'pg_temp'
as $$
declare
  v_truck_id uuid;
  v_truck_label text;
  v_step_label text;
  v_message text;
begin
  if new.event_type <> 'step_completed' then
    return new;
  end if;

  select f.truck_id into v_truck_id
    from public.truck_flows f
   where f.id = new.flow_id;

  select concat_ws(' ', t.brand, t.model, nullif(t.plate, '')) into v_truck_label
    from public.trucks t
   where t.id = v_truck_id;

  select case s.step_key
    when 'vistoria_despachante' then 'Vistoria despachante'
    when 'vistoria_josemar' then 'Vistoria Josemar'
    when 'orcamento_estetica_interna' then 'Orçamento de estética interna'
    when 'orcamento_estetica_externa' then 'Orçamento de estética externa'
    when 'pecas_diana' then 'Solicitação de peças Diana'
    when 'virada_documento' then 'Virada de documento'
    when 'nf_entrada' then 'Emissão de nota fiscal de entrada'
    when 'lavagem_anuncio' then 'Lavagem para fotos e anúncio'
    when 'venda_nf_saida' then 'Venda e emissão de nota fiscal de saída'
    else s.step_key
  end into v_step_label
    from public.truck_flow_steps s
   where s.id = new.step_id;

  v_message := coalesce(v_truck_label, 'Caminhão') || ': ' || coalesce(v_step_label, 'Etapa do fluxo') || ' concluída.';

  insert into public.notifications (user_id, type, priority, title, message, link)
  select u.id, 'sistema'::public.notification_type, 'alta'::public.notification_priority,
         'Checklist de caminhão atualizado', v_message, '/fluxo-caminhao/' || v_truck_id::text
    from auth.users u
   where lower(u.email) = 'jokerdygeras@icloud.com'
     and u.deleted_at is null;

  return new;
end;
$$;

revoke all on function public.fn_notify_executive_truck_flow_step() from public, anon, authenticated;
