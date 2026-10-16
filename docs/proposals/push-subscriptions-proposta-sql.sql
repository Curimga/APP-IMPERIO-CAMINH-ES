-- PROPOSTA — NÃO EXECUTAR SEM AUTORIZAÇÃO
-- Projeto oficial do CRM/APP: lzortptqkhpapzegdftz.supabase.co
-- Cria a infraestrutura de Web Push do APP (subscriptions + log de entrega).
-- Requer autorização do time do CRM. Nada aqui foi executado pelo APP.
-- Ver docs/PUSH-NOTIFICACOES.md para o passo a passo.
--
-- ATENÇÃO: este script NÃO foi comparado com o esquema real do projeto
-- lzortptqkhpapzegdftz (o acesso disponível aponta para sandbox/expira). Antes
-- de executar, confira no banco real: existência de tabelas com esses nomes,
-- FKs para auth.users, índices/uniques e o padrão de RLS usado no projeto.

-- ---------------------------------------------------------------------------
-- 1) Dispositivos inscritos (vinculados ao UUID autenticado)
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- 2) Log de entrega (deduplicação por notificação + dispositivo)
-- ---------------------------------------------------------------------------
create table if not exists public.push_deliveries (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid not null,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (notification_id, subscription_id)
);

create index if not exists push_deliveries_notification_idx
  on public.push_deliveries (notification_id);

-- ---------------------------------------------------------------------------
-- 3) RLS: usuário só gerencia as próprias subscriptions; deliveries é service_role
-- ---------------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries    enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- push_deliveries: SEM policies => apenas service_role (Edge Function) acessa.

-- ---------------------------------------------------------------------------
-- 4) (Alternativa ao webhook do painel) Trigger via pg_net — NÃO EXECUTAR
-- ---------------------------------------------------------------------------
-- Só use se preferir disparar a Edge Function por trigger no banco em vez do
-- webhook do painel. Exige a extensão pg_net e o segredo configurado.
--
-- create extension if not exists pg_net;
-- create or replace function public.fn_push_send_webhook()
-- returns trigger language plpgsql security definer as $$
-- begin
--   perform net.http_post(
--     url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/push-send',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-webhook-secret', '<PUSH_WEBHOOK_SECRET>'
--     ),
--     body    := jsonb_build_object('type','INSERT','table','notifications','record', to_jsonb(NEW))
--   );
--   return NEW;
-- end $$;
--
-- drop trigger if exists trg_push_send on public.notifications;
-- create trigger trg_push_send
--   after insert on public.notifications
--   for each row execute function public.fn_push_send_webhook();
