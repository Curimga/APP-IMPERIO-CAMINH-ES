-- Notifica pagamentos e recebimentos confirmados de todas as origens financeiras.

create or replace function public.fn_notify_all_payment_users(
  p_title text,
  p_message text,
  p_link text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notifications (user_id, type, priority, title, message, link)
  select u.id, 'financeiro'::public.notification_type,
         'media'::public.notification_priority, p_title, p_message, p_link
    from auth.users u
   where u.deleted_at is null
     and not exists (
       select 1
         from public.notifications n
        where n.user_id = u.id
          and n.type = 'financeiro'::public.notification_type
          and n.title = p_title
          and n.message = p_message
          and n.link = p_link
     );
$$;

revoke all on function public.fn_notify_all_payment_users(text, text, text) from public, anon, authenticated;
grant execute on function public.fn_notify_all_payment_users(text, text, text) to service_role;

create or replace function public.tg_notify_payable_paid_all_users()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status::text = 'pago' or new.status::text <> 'pago' then
    return new;
  end if;

  perform public.fn_notify_all_payment_users(
    'Pagamento confirmado',
    coalesce(new.description, 'Boleto/conta') || ' — R$ ' ||
      to_char(new.amount, 'FM999G999G990D00') ||
      coalesce(' — ' || new.payment_method::text, '') ||
      ' — pago em ' || to_char(coalesce(new.paid_at, current_date), 'DD/MM/YYYY'),
    '/financeiro/contas-pagar?id=' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_payable_paid_all_users on public.payables;
create trigger trg_notify_payable_paid_all_users
  after update of status, paid_at, payment_method on public.payables
  for each row execute function public.tg_notify_payable_paid_all_users();

revoke all on function public.tg_notify_payable_paid_all_users() from public, anon, authenticated;

create or replace function public.tg_notify_receivable_received_all_users()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kind text := case when new.check_status is not null then 'Cheque' else 'Recebimento' end;
  v_truck text;
begin
  if old.status::text = 'recebido' or new.status::text <> 'recebido' then
    return new;
  end if;

  select trim(coalesce(t.brand, '') || ' ' || coalesce(t.model, '') ||
              coalesce(' · ' || nullif(t.plate, ''), ''))
    into v_truck
    from public.trucks t
   where t.id = new.truck_id;

  perform public.fn_notify_all_payment_users(
    v_kind || ' confirmado',
    coalesce(new.description, v_kind) ||
      case when nullif(v_truck, '') is not null then ' — Caminhão: ' || v_truck else '' end ||
      ' — R$ ' || to_char(new.amount, 'FM999G999G990D00') ||
      coalesce(' — ' || new.payment_method::text, '') ||
      ' — recebido em ' || to_char(coalesce(new.received_at, current_date), 'DD/MM/YYYY'),
    '/financeiro/contas-receber?id=' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_receivable_received_all_users on public.receivables;
create trigger trg_notify_receivable_received_all_users
  after update of status, received_at, payment_method, check_status on public.receivables
  for each row execute function public.tg_notify_receivable_received_all_users();

revoke all on function public.tg_notify_receivable_received_all_users() from public, anon, authenticated;

create or replace function public.tg_notify_purchase_installment_paid_all_users()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_truck text;
begin
  if old.status = 'pago' or new.status <> 'pago' then
    return new;
  end if;

  select trim(coalesce(t.brand, '') || ' ' || coalesce(t.model, '') ||
              coalesce(' · ' || nullif(t.plate, ''), ''))
    into v_truck
    from public.trucks t
   where t.id = new.truck_id;

  perform public.fn_notify_all_payment_users(
    'Parcela de compra paga',
    'Parcela ' || new.installment_number || '/' || new.total_installments ||
      case when nullif(v_truck, '') is not null then ' — Caminhão: ' || v_truck else '' end ||
      ' — R$ ' || to_char(coalesce(new.paid_amount, new.amount), 'FM999G999G990D00') ||
      ' — pago em ' || to_char(coalesce(new.paid_at::date, current_date), 'DD/MM/YYYY'),
    '/garagem/' || new.truck_id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_purchase_installment_paid_all_users on public.truck_purchase_installments;
create trigger trg_notify_purchase_installment_paid_all_users
  after update of status, paid_at, paid_amount on public.truck_purchase_installments
  for each row execute function public.tg_notify_purchase_installment_paid_all_users();

revoke all on function public.tg_notify_purchase_installment_paid_all_users() from public, anon, authenticated;

create or replace function public.tg_notify_truck_down_payment_confirmed_all_users()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kind text := case when new.sold_at is not null or new.sale_payment_method is not null then 'venda' else 'compra' end;
  v_truck text := trim(coalesce(new.brand, '') || ' ' || coalesce(new.model, '') || coalesce(' · ' || nullif(new.plate, ''), ''));
begin
  if old.down_payment_status::text = 'confirmed' or new.down_payment_status::text <> 'confirmed' then
    return new;
  end if;

  perform public.fn_notify_all_payment_users(
    'Entrada de ' || v_kind || ' confirmada',
    'Caminhão: ' || coalesce(nullif(v_truck, ''), 'não identificado') ||
      ' — R$ ' || to_char(new.down_payment_value, 'FM999G999G990D00') ||
      ' — confirmado em ' || to_char(coalesce(new.down_payment_confirmed_at::date, current_date), 'DD/MM/YYYY'),
    '/garagem/' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_truck_down_payment_confirmed_all_users on public.trucks;
create trigger trg_notify_truck_down_payment_confirmed_all_users
  after update of down_payment_status, down_payment_confirmed_at on public.trucks
  for each row execute function public.tg_notify_truck_down_payment_confirmed_all_users();

revoke all on function public.tg_notify_truck_down_payment_confirmed_all_users() from public, anon, authenticated;

-- Os avisos financeiros já são globais; não duplicar no espelhamento antigo.
create or replace function public.fn_mirror_notification_to_executive()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_executive_id uuid;
begin
  if new.user_id is null or new.type in ('financeiro'::public.notification_type, 'agenda'::public.notification_type) then
    return new;
  end if;

  select p.id into v_executive_id
    from public.profiles p
   where lower(trim(p.full_name)) = 'eduardo luiz dos santos'
     and p.status = 'active'
     and exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role = 'admin'::public.app_role)
   order by p.created_at limit 1;

  if v_executive_id is null or new.user_id = v_executive_id then return new; end if;

  insert into public.notifications (user_id, type, priority, title, message, link)
  select v_executive_id, new.type, new.priority, new.title, new.message, new.link
   where not exists (
     select 1 from public.notifications n
      where n.user_id = v_executive_id and n.type = new.type
        and n.title is not distinct from new.title
        and n.message is not distinct from new.message and n.link is not distinct from new.link
   );
  return new;
end;
$$;

-- Estende a rotina horária D-1/D0 para recebimentos e parcelas de compra.
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
  r record;
  i record;
  e record;
  u record;
begin
  for p in select id, description, due_date, amount from public.payables
    where status::text not in ('pago', 'cancelado') and due_date between v_today and v_today + 1 loop
    for u in select id as user_id from auth.users where deleted_at is null loop
      insert into public.notifications (user_id, type, priority, title, message, link)
      select u.user_id, 'financeiro'::public.notification_type, 'media'::public.notification_priority,
        case when p.due_date = v_today then 'Pagamento vence hoje' else 'Pagamento vence amanhã' end,
        coalesce(p.description, 'Boleto/conta') || ' — R$ ' || to_char(p.amount, 'FM999G999G990D00') || ' — vence ' || to_char(p.due_date, 'DD/MM/YYYY'),
        '/financeiro/contas-pagar?id=' || p.id::text
      where not exists (select 1 from public.notifications n where n.user_id=u.user_id and n.link='/financeiro/contas-pagar?id='||p.id::text and (n.created_at at time zone 'America/Sao_Paulo')::date=v_today);
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;

  for r in select id, description, due_date, amount, installment_number, installment_total from public.receivables
    where status::text not in ('recebido', 'cancelado') and due_date between v_today and v_today + 1 loop
    for u in select id as user_id from auth.users where deleted_at is null loop
      insert into public.notifications (user_id, type, priority, title, message, link)
      select u.user_id, 'financeiro'::public.notification_type, 'media'::public.notification_priority,
        case when r.due_date = v_today then 'Recebimento vence hoje' else 'Recebimento vence amanhã' end,
        coalesce(r.description, 'Recebimento') || case when r.installment_number is not null then ' — Parcela '||r.installment_number||'/'||coalesce(r.installment_total, r.installment_number) else '' end || ' — R$ ' || to_char(r.amount, 'FM999G999G990D00') || ' — vence ' || to_char(r.due_date, 'DD/MM/YYYY'),
        '/financeiro/contas-receber?id=' || r.id::text
      where not exists (select 1 from public.notifications n where n.user_id=u.user_id and n.link='/financeiro/contas-receber?id='||r.id::text and (n.created_at at time zone 'America/Sao_Paulo')::date=v_today);
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;

  for i in select id, truck_id, installment_number, total_installments, amount, due_date from public.truck_purchase_installments
    where status <> 'pago' and due_date between v_today and v_today + 1 loop
    for u in select id as user_id from auth.users where deleted_at is null loop
      insert into public.notifications (user_id, type, priority, title, message, link)
      select u.user_id, 'financeiro'::public.notification_type, 'media'::public.notification_priority,
        case when i.due_date = v_today then 'Parcela de compra vence hoje' else 'Parcela de compra vence amanhã' end,
        'Parcela '||i.installment_number||'/'||i.total_installments||' — R$ '||to_char(i.amount,'FM999G999G990D00')||' — vence '||to_char(i.due_date,'DD/MM/YYYY'),
        '/garagem/'||i.truck_id::text
      where not exists (select 1 from public.notifications n where n.user_id=u.user_id and n.link='/garagem/'||i.truck_id::text and n.title in ('Parcela de compra vence hoje','Parcela de compra vence amanhã') and n.message like 'Parcela '||i.installment_number||'/%' and (n.created_at at time zone 'America/Sao_Paulo')::date=v_today);
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;

  for e in select id, title, description, starts_at from public.calendar_events
    where (starts_at at time zone 'America/Sao_Paulo')::date between v_today and v_today + 1 loop
    for u in select id as user_id from auth.users where deleted_at is null loop
      insert into public.notifications (user_id, type, priority, title, message, link)
      select u.user_id, 'agenda'::public.notification_type, 'media'::public.notification_priority,
        case when (e.starts_at at time zone 'America/Sao_Paulo')::date=v_today then 'Compromisso hoje' else 'Compromisso amanhã' end,
        coalesce(nullif(e.title,''),'Compromisso')||' — '||to_char(e.starts_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')||coalesce(' — '||nullif(e.description,''),''), '/agenda?id='||e.id::text
      where not exists (select 1 from public.notifications n where n.user_id=u.user_id and n.link='/agenda?id='||e.id::text and (n.created_at at time zone 'America/Sao_Paulo')::date=v_today);
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;
  return v_inserted;
end;
$$;

revoke all on function public.fn_generate_payable_alerts() from public, anon, authenticated;
grant execute on function public.fn_generate_payable_alerts() to service_role;
