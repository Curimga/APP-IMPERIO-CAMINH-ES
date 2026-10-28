-- Notify authorized executives when a daily expense reaches the approval queue.

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
     and not exists (
       select 1
         from public.notifications existing
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

revoke all on function public.fn_notify_daily_expense_approvers() from public, anon, authenticated;

drop trigger if exists trg_notify_daily_expense_approvers on public.expense_approval_requests;
create trigger trg_notify_daily_expense_approvers
after insert on public.expense_approval_requests
for each row execute function public.fn_notify_daily_expense_approvers();

-- Deliver the pending queue that was created before this trigger existed.
insert into public.notifications (user_id, type, priority, title, message, link)
select access.user_id,
       'financeiro'::public.notification_type,
       case when request.urgent then 'alta'::public.notification_priority
            else 'media'::public.notification_priority end,
       'Novo lançamento diário para aprovação',
       coalesce(request.supplier, 'Fornecedor não informado') || ' — R$ ' ||
         to_char(request.amount, 'FM999G999G990D00') || ' — ' ||
         coalesce(request.description, 'Despesa sem descrição'),
       '/secretaria/aprovacao-executivo'
  from public.expense_approval_requests request
  cross join public.expense_approval_access access
 where request.origin = 'daily'
   and request.status = 'pending'
   and access.can_approve
   and not exists (
     select 1
       from public.notifications existing
      where existing.user_id = access.user_id
        and existing.type = 'financeiro'::public.notification_type
        and existing.link = '/secretaria/aprovacao-executivo'
        and existing.message = coalesce(request.supplier, 'Fornecedor não informado') || ' — R$ ' ||
          to_char(request.amount, 'FM999G999G990D00') || ' — ' ||
          coalesce(request.description, 'Despesa sem descrição')
   );
