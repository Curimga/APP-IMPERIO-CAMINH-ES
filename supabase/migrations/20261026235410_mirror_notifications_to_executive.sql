-- Mirror every user-directed notification to the executive account.
-- The recipient is resolved by the active admin profile instead of storing a
-- generated UUID in the migration.
create or replace function public.fn_mirror_notification_to_executive()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_executive_id uuid;
begin
  if new.user_id is null then
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

  if v_executive_id is null or new.user_id = v_executive_id then
    return new;
  end if;

  insert into public.notifications (user_id, type, priority, title, message, link)
  select v_executive_id, new.type, new.priority, new.title, new.message, new.link
   where not exists (
     select 1
       from public.notifications n
      where n.user_id = v_executive_id
        and n.type = new.type
        and n.priority = new.priority
        and n.title is not distinct from new.title
        and n.message is not distinct from new.message
        and n.link is not distinct from new.link
        and n.created_at = new.created_at
   );

  return new;
end;
$$;

revoke all on function public.fn_mirror_notification_to_executive() from public, anon, authenticated;

drop trigger if exists trg_mirror_notification_to_executive on public.notifications;
create trigger trg_mirror_notification_to_executive
  after insert on public.notifications
  for each row execute function public.fn_mirror_notification_to_executive();
