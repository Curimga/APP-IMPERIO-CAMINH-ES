-- Compatibilidade com versões publicadas do frontend que ainda consultam
-- truck_flow_access para montar o menu do fluxo.
insert into public.truck_flow_access (user_id, access_level)
select u.id, 'editor'
  from auth.users u
  join public.profiles p on p.id = u.id
 where u.deleted_at is null
   and p.status = 'active'
on conflict (user_id) do update
  set access_level = excluded.access_level;
