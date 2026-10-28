-- Inclui recebimentos e parcelas de compra na rotina D-1/D0 já agendada.

create or replace function public.fn_generate_additional_due_alerts()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inserted integer := 0;
  r record;
  i record;
  u record;
begin
  for r in select id, description, due_date, amount, installment_number, installment_total
      from public.receivables
     where status::text not in ('recebido', 'cancelado')
       and due_date between v_today and v_today + 1 loop
    for u in select id as user_id from auth.users where deleted_at is null loop
      insert into public.notifications (user_id, type, priority, title, message, link)
      select u.user_id, 'financeiro'::public.notification_type, 'media'::public.notification_priority,
        case when r.due_date = v_today then 'Recebimento vence hoje' else 'Recebimento vence amanhã' end,
        coalesce(r.description, 'Recebimento') ||
          case when r.installment_number is not null then ' — Parcela ' || r.installment_number || '/' || coalesce(r.installment_total, r.installment_number) else '' end ||
          ' — R$ ' || to_char(r.amount, 'FM999G999G990D00') || ' — vence ' || to_char(r.due_date, 'DD/MM/YYYY'),
        '/financeiro/contas-receber?id=' || r.id::text
       where not exists (
         select 1 from public.notifications n
          where n.user_id = u.user_id
            and n.link = '/financeiro/contas-receber?id=' || r.id::text
            and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today
       );
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;

  for i in select id, truck_id, installment_number, total_installments, amount, due_date
      from public.truck_purchase_installments
     where status <> 'pago' and due_date between v_today and v_today + 1 loop
    for u in select id as user_id from auth.users where deleted_at is null loop
      insert into public.notifications (user_id, type, priority, title, message, link)
      select u.user_id, 'financeiro'::public.notification_type, 'media'::public.notification_priority,
        case when i.due_date = v_today then 'Parcela de compra vence hoje' else 'Parcela de compra vence amanhã' end,
        'Parcela ' || i.installment_number || '/' || i.total_installments || ' — R$ ' ||
          to_char(i.amount, 'FM999G999G990D00') || ' — vence ' || to_char(i.due_date, 'DD/MM/YYYY'),
        '/garagem/' || i.truck_id::text
       where not exists (
         select 1 from public.notifications n
          where n.user_id = u.user_id
            and n.link = '/garagem/' || i.truck_id::text
            and n.title in ('Parcela de compra vence hoje', 'Parcela de compra vence amanhã')
            and n.message like 'Parcela ' || i.installment_number || '/%'
            and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today
       );
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;
  return v_inserted;
end;
$$;

revoke all on function public.fn_generate_additional_due_alerts() from public, anon, authenticated;
grant execute on function public.fn_generate_additional_due_alerts() to service_role;

do $block$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'imperio-due-alerts';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
  perform cron.schedule(
    'imperio-due-alerts',
    '0 * * * *',
    $job$select public.fn_generate_payable_alerts(); select public.fn_generate_additional_due_alerts();$job$
  );
end;
$block$;
