-- =====================================================================
-- LEMBRETES REPETIDOS DE AVISOS PENDENTES — proposal de migration
-- =====================================================================
-- Status: PROPOSTA. NÃO APLICAR sem autorização explícita do dono do app.
--
-- Objetivo
--   Adicionar a preferência individual "quantos lembretes repetidos eu recebo
--   por dia para cada aviso que continua pendente" (0, 1, 2 ou 3).
--   O aviso original continua saindo uma única vez (push-send, via webhook na
--   inserção de `notifications`). Esta migration cria a estrutura para os
--   LEMBRETES: preferência por usuário, plano de ocorrências por aviso/dispositivo
--   e o agendador que dispara a Edge Function `push-reminders`.
--
-- O que esta migration NÃO faz (deliberadamente)
--   - não altera nenhuma tabela/tela/política do CRM;
--   - não mexe em `fn_generate_payable_alerts`, no webhook do push-send, no
--     segredo `PUSH_WEBHOOK_SECRET` nem nas chaves VAPID;
--   - não amplia permissões: quem não pode receber aviso financeiro continua
--     não recebendo (a Edge Function revalida com as mesmas regras do push-send);
--   - não cria trigger de notificação para agenda/serviços (isso muda o
--     comportamento do CRM e está isolado no arquivo parte2, opcional).
--
-- Pré-requisitos
--   1. Edge Function `push-reminders` implantada (supabase/functions/push-reminders)
--      com as mesmas variáveis de ambiente do `push-send`
--      (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
--       PUSH_FINANCE_INDIVIDUAL_USER_IDS).
--   2. `pg_cron` habilitado no projeto (Dashboard > Database > Extensions).
--      O papel `postgres` deste projeto NÃO é superuser e não consegue
--      habilitar a extensão — é um passo de plataforma.
--
-- Aplicação
--   - via Supabase Dashboard > SQL Editor, ou `supabase db push` (CLI).
--   - Blocos comentados exigem ação manual (pg_cron) ou autorização extra.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Preferência por usuário
-- ---------------------------------------------------------------------
create table if not exists public.push_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reminders_per_day smallint not null default 0 check (reminders_per_day between 0 and 3),
  updated_at timestamptz not null default now()
);

comment on table public.push_preferences is
  'Preferência individual: lembretes repetidos por dia para cada aviso pendente (0..3).';

alter table public.push_preferences enable row level security;

drop policy if exists "users read own push preferences" on public.push_preferences;
create policy "users read own push preferences"
  on public.push_preferences for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users insert own push preferences" on public.push_preferences;
create policy "users insert own push preferences"
  on public.push_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users update own push preferences" on public.push_preferences;
create policy "users update own push preferences"
  on public.push_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2) Plano de ocorrências (um por aviso + dispositivo)
-- ---------------------------------------------------------------------
create table if not exists public.push_reminder_plans (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  per_day smallint not null default 0 check (per_day between 0 and 3),
  anchor_at timestamptz not null default now(),
  planned_at timestamptz[] not null default '{}'::timestamptz[],
  status text not null default 'planned'
    check (status in ('planned', 'active', 'sent', 'cancelled', 'expired')),
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, subscription_id)
);

comment on table public.push_reminder_plans is
  'Ocorrências de lembrete por aviso e por dispositivo (occurrence 1..N).';

alter table public.push_reminder_plans enable row level security;

-- O app só consulta o próprio plano; escrita é do servidor (service_role).
drop policy if exists "users read own push reminder plans" on public.push_reminder_plans;
create policy "users read own push reminder plans"
  on public.push_reminder_plans for select
  to authenticated
  using (user_id = auth.uid());

create index if not exists push_reminder_plans_pending_idx
  on public.push_reminder_plans (status, anchor_at);

-- ---------------------------------------------------------------------
-- 3) Entregas: distinguir aviso original (0) de lembrete (1..N)
-- ---------------------------------------------------------------------
-- A restrição atual (notification_id, subscription_id) impede qualquer
-- repetição. Passamos a permitir uma entrega por ocorrência.
alter table public.push_deliveries
  add column if not exists occurrence integer not null default 0;

alter table public.push_deliveries
  drop constraint if exists push_deliveries_notification_id_subscription_id_key;

create unique index if not exists push_deliveries_notification_subscription_occurrence_uniq
  on public.push_deliveries (notification_id, subscription_id, occurrence);

-- ---------------------------------------------------------------------
-- 4) Segredo do agendador (fica no banco, nunca no app)
-- ---------------------------------------------------------------------
create table if not exists public.push_scheduler_secret (
  id boolean primary key default true check (id),
  secret text not null,
  created_at timestamptz not null default now()
);

comment on table public.push_scheduler_secret is
  'Segredo do agendador de lembretes. Somente service_role pode ler.';

alter table public.push_scheduler_secret enable row level security;
revoke all on public.push_scheduler_secret from anon, authenticated;
grant select on public.push_scheduler_secret to service_role;

insert into public.push_scheduler_secret (id, secret)
values (true, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 5) Trigger: cria o plano quando nasce um aviso com usuário
-- ---------------------------------------------------------------------
-- Só cria plano para quem TEM device inscrito e JÁ pediu lembretes
-- (preference > 0). Quem prefere 0 não gera nada.
create or replace function public.fn_push_plan_reminders() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := new.user_id;
  v_per_day smallint;
begin
  if v_user is null then
    return new; -- aviso geral (sem dono): sem lembretes
  end if;

  select p.reminders_per_day into v_per_day
  from public.push_preferences p
  where p.user_id = v_user;

  if coalesce(v_per_day, 0) < 1 then
    return new; -- usuário não pediu lembretes
  end if;

  insert into public.push_reminder_plans (
    notification_id, user_id, subscription_id, per_day, anchor_at
  )
  select new.id, v_user, s.id, v_per_day, coalesce(new.created_at, now())
  from public.push_subscriptions s
  where s.user_id = v_user
  on conflict (notification_id, subscription_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_push_plan_reminders on public.notifications;
create trigger trg_push_plan_reminders
  after insert on public.notifications
  for each row execute function public.fn_push_plan_reminders();

-- ---------------------------------------------------------------------
-- 6) Sincronização da preferência entre aparelhos (Realtime)
-- ---------------------------------------------------------------------
-- O app assina push_preferences; se a tabela não entrar na publicação, o app
-- continua funcionando (a preferência é lida ao abrir a tela).
-- alter publication supabase_realtime add table public.push_preferences;

-- ---------------------------------------------------------------------
-- 7) Agendador (exige pg_cron habilitado — passo de plataforma)
-- ---------------------------------------------------------------------
-- A cada 10 minutos a Edge Function `push-reminders` é chamada. Ela envia no
-- máximo UM lembrete por plano (distribuição durante o dia, nunca tudo junto)
-- e só entrega o que já venceu dentro da janela (9h, 12h, 15h, 18h, 20h no
-- fuso America/Sao_Paulo).
--
-- select cron.schedule(
--   'push-reminders-a-cada-10-min',
--   '*/10 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://lzortptqkhpapzegdftz.supabase.co/functions/v1/push-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-scheduler-secret', (select secret from public.push_scheduler_secret where id)
--     ),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 5000
--   );
--   $$
-- );

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- select cron.unschedule('push-reminders-a-cada-10-min');
-- drop trigger if exists trg_push_plan_reminders on public.notifications;
-- drop function if exists public.fn_push_plan_reminders();
-- drop table if exists public.push_reminder_plans;
-- drop table if exists public.push_preferences;
-- drop table if exists public.push_scheduler_secret;
-- alter table public.push_deliveries drop column if exists occurrence;
-- alter table public.push_deliveries
--   add constraint push_deliveries_notification_id_subscription_id_key
--   unique (notification_id, subscription_id);
-- alter publication supabase_realtime drop table public.push_preferences;
