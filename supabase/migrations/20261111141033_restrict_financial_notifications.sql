-- Notificações financeiras são restritas ao Executivo autorizado.
-- Josemar permanece bloqueado mesmo sendo admin; secretaria não recebe valores.

create or replace function public.fn_can_receive_financial_notification(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
      from auth.users u
     where u.id = p_user_id
       and u.deleted_at is null
       and lower(coalesce(u.email, '')) <> 'josemar.essing@gmail.com'
  )
  and exists (
    select 1
      from public.user_roles ur
     where ur.user_id = p_user_id
       and ur.role = 'admin'::public.app_role
  );
$$;

revoke all on function public.fn_can_receive_financial_notification(uuid) from public, anon;
grant execute on function public.fn_can_receive_financial_notification(uuid) to authenticated, service_role;

create or replace function public.fn_notify_all_payment_users(
  p_title text,
  p_message text,
  p_link text
)
returns void
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  insert into public.notifications (user_id, type, priority, title, message, link)
  select u.id, 'financeiro'::public.notification_type,
         'media'::public.notification_priority, p_title, p_message, p_link
    from auth.users u
   where u.deleted_at is null
     and public.fn_can_receive_financial_notification(u.id)
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

create or replace function public.fn_generate_payable_alerts()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inserted integer := 0;
  p record;
  e record;
  u record;
begin
  for p in
    select id, description, due_date, amount
      from public.payables
     where status <> 'pago'
       and due_date between v_today and v_today + 1
  loop
    for u in
      select id as user_id
        from auth.users
       where deleted_at is null
         and public.fn_can_receive_financial_notification(id)
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

create or replace function public.fn_notify_daily_expense_approvers()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.origin <> 'daily' or new.status <> 'pending' then
    return new;
  end if;

  insert into public.notifications (user_id, type, priority, title, message, link)
  select access.user_id,
         'financeiro'::public.notification_type,
         case when new.urgent then 'alta'::public.notification_priority
              else 'media'::public.notification_priority end,
         'Novo lançamento diário para aprovação',
         coalesce(new.supplier, 'Fornecedor não informado') || ' — R$ ' ||
           to_char(new.amount, 'FM999G999G990D00') || ' — ' ||
           coalesce(new.description, 'Despesa sem descrição'),
         '/secretaria/aprovacao-executivo'
    from public.expense_approval_access access
   where access.can_approve
     and public.fn_can_receive_financial_notification(access.user_id)
     and not exists (
       select 1 from public.notifications existing
        where existing.user_id = access.user_id
          and existing.type = 'financeiro'::public.notification_type
          and existing.link = '/secretaria/aprovacao-executivo'
          and existing.message = coalesce(new.supplier, 'Fornecedor não informado') || ' — R$ ' ||
            to_char(new.amount, 'FM999G999G990D00') || ' — ' ||
            coalesce(new.description, 'Despesa sem descrição')
     );
  return new;
end;
$$;

drop policy if exists "read own or admin" on public.notifications;
create policy "read permitted notifications"
on public.notifications
for select
to authenticated
using (
  (
    (user_id is null or user_id = auth.uid() or private.has_role(auth.uid(), 'admin'::public.app_role))
    and not (
      (type = 'financeiro'::public.notification_type or coalesce(link, '') like '/financeiro%' or link = '/secretaria/aprovacao-executivo')
      and not public.fn_can_receive_financial_notification(auth.uid())
    )
  )
);
