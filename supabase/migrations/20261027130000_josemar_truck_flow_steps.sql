-- Substitui o fluxo operacional antigo pelo fluxo de preparação e venda.
-- As etapas existentes são reaproveitadas para manter evidências e histórico.

update public.truck_flow_steps
set step_key = case step_key
  when 'crm_add' then 'vistoria_despachante'
  when 'vistoria_marcelo' then 'vistoria_josemar'
  when 'necessidades' then 'orcamento_estetica'
  when 'retorno_servico' then 'pecas_diana'
  when 'vistoria_banco' then 'virada_documento'
  when 'documentacao' then 'nf_entrada'
  else step_key
end
where step_key in ('crm_add', 'vistoria_marcelo', 'necessidades', 'retorno_servico', 'vistoria_banco', 'documentacao');

insert into public.truck_flow_steps (flow_id, step_key, display_order)
select flows.id, steps.step_key, steps.display_order
from public.truck_flows flows
cross join (values
  ('lavagem_anuncio', 7),
  ('venda_nf_saida', 8)
) as steps(step_key, display_order)
where not exists (
  select 1 from public.truck_flow_steps existing
  where existing.flow_id = flows.id and existing.step_key = steps.step_key
);

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
    (v_flow_id, 'vistoria_despachante', 1),
    (v_flow_id, 'vistoria_josemar', 2),
    (v_flow_id, 'orcamento_estetica', 3),
    (v_flow_id, 'pecas_diana', 4),
    (v_flow_id, 'virada_documento', 5),
    (v_flow_id, 'nf_entrada', 6),
    (v_flow_id, 'lavagem_anuncio', 7),
    (v_flow_id, 'venda_nf_saida', 8);

  insert into public.truck_flow_events (flow_id, event_type, actor_id)
  values (v_flow_id, 'created', v_user_id);
  return v_flow_id;
end;
$$;

create or replace function public.complete_truck_flow_step(
  p_flow_id uuid, p_step_key text, p_notes text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_flow public.truck_flows%rowtype;
  v_step public.truck_flow_steps%rowtype;
begin
  if not coalesce(private.can_edit_truck_flow(v_user_id), false) then raise exception 'Usuário não autorizado a concluir etapas.'; end if;
  if p_step_key not in ('vistoria_despachante','vistoria_josemar','orcamento_estetica','pecas_diana','virada_documento','nf_entrada','lavagem_anuncio','venda_nf_saida') then raise exception 'Etapa inválida.'; end if;
  if p_step_key in ('orcamento_estetica','pecas_diana') and nullif(btrim(p_notes), '') is null then raise exception 'A descrição desta etapa é obrigatória.'; end if;
  select * into v_flow from public.truck_flows where id = p_flow_id for update;
  if not found then raise exception 'Fluxo não encontrado.'; end if;
  select * into v_step from public.truck_flow_steps where flow_id = p_flow_id and step_key = p_step_key for update;
  if not found then raise exception 'Etapa não encontrada.'; end if;
  if v_step.status <> 'pending' then raise exception 'Etapa já concluída.'; end if;
  update public.truck_flow_steps set status = 'completed', completed_at = now(), completed_by = v_user_id, notes = nullif(btrim(p_notes), '') where id = v_step.id;
  insert into public.truck_flow_events (flow_id, step_id, event_type, actor_id) values (p_flow_id, v_step.id, 'step_completed', v_user_id);
  if not exists (select 1 from public.truck_flow_steps where flow_id = p_flow_id and status <> 'completed') then
    update public.truck_flows set status = 'completed', completed_at = now(), completed_by = v_user_id, updated_at = now() where id = p_flow_id;
    insert into public.truck_flow_events (flow_id, event_type, actor_id) values (p_flow_id, 'flow_completed', v_user_id);
  else
    update public.truck_flows set updated_at = now() where id = p_flow_id;
  end if;
end;
$$;

create or replace function public.reopen_truck_flow_step(p_flow_id uuid, p_step_key text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_flow public.truck_flows%rowtype; v_step public.truck_flow_steps%rowtype;
begin
  if not coalesce(private.can_edit_truck_flow(v_user_id), false) then raise exception 'Usuário não autorizado a reabrir etapas.'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'O motivo da reabertura é obrigatório.'; end if;
  if p_step_key not in ('vistoria_despachante','vistoria_josemar','orcamento_estetica','pecas_diana','virada_documento','nf_entrada','lavagem_anuncio','venda_nf_saida') then raise exception 'Etapa inválida.'; end if;
  select * into v_flow from public.truck_flows where id = p_flow_id for update;
  if not found then raise exception 'Fluxo não encontrado.'; end if;
  select * into v_step from public.truck_flow_steps where flow_id = p_flow_id and step_key = p_step_key for update;
  if not found then raise exception 'Etapa não encontrada.'; end if;
  if v_step.status <> 'completed' then raise exception 'Etapa não está concluída.'; end if;
  update public.truck_flow_steps set status = 'pending', completed_at = null, completed_by = null, notes = null where id = v_step.id;
  update public.truck_flows set status = 'in_progress', completed_at = null, completed_by = null, updated_at = now() where id = p_flow_id;
  insert into public.truck_flow_events (flow_id, step_id, event_type, reason, actor_id) values (p_flow_id, v_step.id, 'step_reopened', btrim(p_reason), v_user_id);
  if v_flow.status = 'completed' then insert into public.truck_flow_events (flow_id, event_type, reason, actor_id) values (p_flow_id, 'flow_reopened', btrim(p_reason), v_user_id); end if;
end;
$$;
