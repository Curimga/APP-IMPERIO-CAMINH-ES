-- Notificações de compromissos e pagamentos: somente D-1 e D0.
-- O job roda no servidor para que o app fechado também receba o aviso.

create or replace function public.fn_generate_payable_alerts()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inserted integer := 0;
  p record;
  e record;
  u record;
begin
  -- Pagamentos: hoje e amanhã. O destinatário é todo usuário ativo.
  for p in
    select id, description, due_date, amount
      from public.payables
     where status <> 'pago'
       and due_date between v_today and v_today + 1
  loop
    for u in
      select id as user_id from auth.users where deleted_at is null
    loop
      insert into public.notifications (user_id, type, priority, title, message, link)
      select u.user_id,
             'financeiro'::public.notification_type,
             'media'::public.notification_priority,
             case when p.due_date = v_today then 'Pagamento vence hoje'
                  else 'Pagamento vence amanhã' end,
             coalesce(p.description, 'Conta a pagar') || ' — R$ ' ||
               to_char(p.amount, 'FM999G999G990D00') || ' — vence ' ||
               to_char(p.due_date, 'DD/MM/YYYY'),
             '/financeiro/contas-pagar?id=' || p.id::text
       where not exists (
         select 1 from public.notifications n
          where n.user_id = u.user_id
            and n.link = '/financeiro/contas-pagar?id=' || p.id::text
            and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today
       );
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;

  -- Compromissos: hoje e amanhã, também para todos os usuários ativos.
  for e in
    select id, title, description, starts_at
      from public.calendar_events
     where (starts_at at time zone 'America/Sao_Paulo')::date between v_today and v_today + 1
  loop
    for u in
      select id as user_id from auth.users where deleted_at is null
    loop
      insert into public.notifications (user_id, type, priority, title, message, link)
      select u.user_id,
             'agenda'::public.notification_type,
             'media'::public.notification_priority,
             case when (e.starts_at at time zone 'America/Sao_Paulo')::date = v_today
                  then 'Compromisso hoje' else 'Compromisso amanhã' end,
             coalesce(nullif(e.title, ''), 'Compromisso') || ' — ' ||
               to_char(e.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') ||
               coalesce(' — ' || nullif(e.description, ''), ''),
             '/agenda?id=' || e.id::text
       where not exists (
         select 1 from public.notifications n
          where n.user_id = u.user_id
            and n.link = '/agenda?id=' || e.id::text
            and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today
       );
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.fn_generate_payable_alerts() from public, anon, authenticated;
grant execute on function public.fn_generate_payable_alerts() to service_role;

-- O compromisso não deve gerar aviso no momento do cadastro.
drop trigger if exists trg_notify_calendar_event on public.calendar_events;

-- Esses avisos já são emitidos exatamente em D-1/D0; não criar lembretes
-- adicionais conforme a preferência antiga de lembretes repetidos.
create or replace function public.fn_push_plan_reminders()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.type in ('agenda'::public.notification_type, 'financeiro'::public.notification_type) then
    return new;
  end if;
  return new;
end;
$$;

revoke all on function public.fn_push_plan_reminders() from public, anon, authenticated;

update public.push_reminder_plans rp
   set status = 'cancelled',
       cancel_reason = 'janela_d1_d0',
       updated_at = now()
  from public.notifications n
 where n.id = rp.notification_id
   and n.type in ('agenda'::public.notification_type, 'financeiro'::public.notification_type)
   and rp.status in ('planned', 'active');

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'imperio-due-alerts';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
  perform cron.schedule(
    'imperio-due-alerts',
    '0 * * * *',
    $job$select public.fn_generate_payable_alerts()$job$
  );
end;
$$;
