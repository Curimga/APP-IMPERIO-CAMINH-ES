do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'inventory_movements'
  ) and not exists (
    select 1
    from pg_publication_tables pt
    where pt.pubname = 'supabase_realtime'
      and pt.schemaname = 'public'
      and pt.relname = 'inventory_movements'
  ) then
    alter publication supabase_realtime add table public.inventory_movements;
  end if;
end $$;
