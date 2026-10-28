-- O pg_cron recebe uma única instrução agregadora.

create or replace function public.fn_generate_all_due_alerts()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_total integer;
begin
  v_total := public.fn_generate_payable_alerts();
  v_total := v_total + public.fn_generate_additional_due_alerts();
  return v_total;
end;
$$;

revoke all on function public.fn_generate_all_due_alerts() from public, anon, authenticated;
grant execute on function public.fn_generate_all_due_alerts() to service_role;

do $block$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'imperio-due-alerts';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
  perform cron.schedule('imperio-due-alerts', '0 * * * *', 'select public.fn_generate_all_due_alerts()');
end;
$block$;
