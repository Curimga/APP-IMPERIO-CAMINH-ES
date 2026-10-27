-- Notifica o executivo quando uma etapa do fluxo de caminhão é concluída.
create or replace function public.fn_notify_executive_truck_flow_step()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_executive_id uuid;
  v_truck_id uuid;
  v_truck_label text;
  v_step_label text;
begin
  if new.event_type <> 'step_completed' then
    return new;
  end if;

  select p.id
    into v_executive_id
    from public.profiles p
   where lower(trim(p.full_name)) = 'eduardo luiz dos santos'
     and p.status = 'active'
     and exists (
       select 1
         from public.user_roles ur
        where ur.user_id = p.id
          and ur.role = 'admin'::public.app_role
     )
   order by p.created_at
   limit 1;

  if v_executive_id is null then
    return new;
  end if;

  select f.truck_id
    into v_truck_id
    from public.truck_flows f
   where f.id = new.flow_id;

  select concat_ws(' ', t.brand, t.model, nullif(t.plate, ''))
    into v_truck_label
    from public.trucks t
   where t.id = v_truck_id;

  v_step_label := case new.step_id is null
    when true then 'Etapa do fluxo'
    else (
      select case s.step_key
        when 'vistoria_despachante' then 'Vistoria despachante'
        when 'vistoria_josemar' then 'Vistoria Josemar'
        when 'orcamento_estetica' then 'Orçamento de estética interna e externa'
        when 'pecas_diana' then 'Solicitação de peças Diana'
        when 'virada_documento' then 'Virada de documento'
        when 'nf_entrada' then 'Emissão de nota fiscal de entrada'
        when 'lavagem_anuncio' then 'Lavagem para fotos e anúncio'
        when 'venda_nf_saida' then 'Venda e emissão de nota fiscal de saída'
        else s.step_key
      end
      from public.truck_flow_steps s
      where s.id = new.step_id
    )
  end;

  insert into public.notifications (user_id, type, priority, title, message, link)
  values (
    v_executive_id,
    'sistema'::public.notification_type,
    'alta'::public.notification_priority,
    'Checklist de caminhão atualizado',
    coalesce(v_truck_label, 'Caminhão') || ': ' || v_step_label || ' concluída.',
    '/fluxo-caminhao/' || v_truck_id::text
  );

  return new;
end;
$$;

revoke all on function public.fn_notify_executive_truck_flow_step() from public, anon, authenticated;

drop trigger if exists trg_notify_executive_truck_flow_step on public.truck_flow_events;
create trigger trg_notify_executive_truck_flow_step
  after insert on public.truck_flow_events
  for each row
  when (new.event_type = 'step_completed')
  execute function public.fn_notify_executive_truck_flow_step();
