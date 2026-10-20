-- ===========================================================================
-- PROPOSTA — PARTE 1 de 3 — SQL DE TRIGGERS DE EVENTOS
-- NÃO EXECUTAR SEM AUTORIZAÇÃO DO TIME DO CRM
-- Projeto: lzortptqkhpapzegdftz.supabase.co
-- Revisão final somente-leitura: 20/10/2026
-- ===========================================================================
--
-- OBJETIVO
--   Criar notificações (linhas em public.notifications) para 3 tipos de evento:
--     1.1) compromissos  -> calendar_events  (INSERT / alteração relevante)
--     1.2) serviços      -> services.status  passa a 'concluido'
--     1.3) pagamentos    -> payables.status  passa a 'pago'
--
-- O QUE JÁ EXISTE NO CRM (confirmado por leitura)
--   - Único gerador de notificação: public.fn_generate_payable_alerts(),
--     para payables "a vencer" (3 dias). NÃO cobre calendar_events, services
--     nem payables pagos.
--   - NÃO há triggers em calendar_events, services, payables, receivables,
--     notifications (pg_trigger retornou vazio para essas tabelas).
--   - NÃO há webhook ligando notifications -> push-send.
--   => Hoje nenhum destes 3 eventos gera notificação alguma.
--
-- DESTINATÁRIOS (correção importante aplicada nesta revisão)
--   A Edge Function push-send implantada (v1) autoriza push FINANCEIRO apenas
--   para: role 'admin' (exceto e-mail na lista de bloqueio
--   josemar.essing@gmail.com) OU UUID presente em
--   PUSH_FINANCE_INDIVIDUAL_USER_IDS. Usuário com role apenas 'financeiro'
--   NÃO é autorizado pela função.
--   Para NÃO ampliar permissão, o helper abaixo usa SOMENTE role 'admin'
--   (mesmo conjunto que a função entrega). Como hoje NÃO existe nenhum usuário
--   com role 'financeiro', na prática os conjuntos já coincidem; a mudança
--   evita divergência futura.
--   OBS: a função também NUNCA entrega ao e-mail bloqueado, mesmo ele sendo
--   admin — então o SQL pode criar a linha para ele, mas o push não sai.
--   Isso é intencional (linha visível no app, push bloqueado).
--
-- SEGURANÇA (search_path fixo + EXECUTE restrito)
--   Todas as funções são SECURITY DEFINER com `set search_path to 'public'`.
--   O projeto concede EXECUTE a anon/authenticated por DEFAULT em toda função
--   nova de public (pg_default_acl confirmado). Por isso cada função abaixo
--   faz REVOKE EXECUTE FROM PUBLIC, anon, authenticated. As funções de trigger
--   (tg_*) NÃO podem ser chamadas via RPC de jeito nenhum. O helper
--   fn_notification_recipients() também é revogado (senão vazaria a lista de
--   UUIDs de admin via PostgREST).
--
-- TABELAS/COLUNAS AFETADAS
--   LÊ  : calendar_events(id,title,description,type,starts_at,ends_at,
--         all_day,owner_id,updated_at)
--         services(id,title,status,created_by)
--         payables(id,description,amount,status,paid_at)
--         user_roles(user_id,role)
--   ESCREVE: notifications(user_id,type,priority,title,message,link)
--   NÃO altera coluna/tabela existente. NÃO cria coluna nova. NÃO mexe em RLS.
--
-- COMO EVITA DUPLICIDADE (sem coluna nova, sem schema change)
--   Dedup ANTES de inserir, usando colunas existentes. Ponto crítico (item 3 da
--   revisão): a dedup NÃO pode suprimir alterações legítimas diferentes no
--   mesmo dia. Estratégia por evento:
--     - calendar_events: a mensagem contém o horário (HH24:MI) e a dedup é
--       (user_id, link, title, message, created_at::date). Duas alterações
--       diferentes (horário/título distintos) geram mensagens distintas =>
--       AMBAS notificam. Só é suprimida a repetição EXATA do mesmo estado no
--       mesmo dia (ex.: trigger reexecutado). Limitação conhecida: voltar ao
--       mesmo horário/título original no mesmo dia não re-notifica — aceitável
--       e documentado.
--     - services: dedup por (user_id, link, title, message) SEM filtro de dia
--       => o serviço conclui 1 vez e nunca mais re-notifica, mesmo em dias
--       diferentes. NÃO suprime mudança legítima (concluir só acontece 1x).
--     - payables: idem services, dedup por estado (message inclui paid_at),
--       então pagamentos diferentes do mesmo título têm paid_at diferente.
--
-- COMO REVERTER
--   drop trigger if exists trg_notify_calendar_event  on public.calendar_events;
--   drop trigger if exists trg_notify_service_completed on public.services;
--   drop trigger if exists trg_notify_payable_paid    on public.payables;
--   drop function if exists public.tg_notify_calendar_event();
--   drop function if exists public.tg_notify_service_completed();
--   drop function if exists public.tg_notify_payable_paid();
--   drop function if exists public.fn_notification_recipients();
--   (Não apaga dados. As notificações já criadas permanecem.)
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1.0) Helper de destinatários financeiros — SOMENTE role 'admin'
--      (igual ao conjunto que a Edge Function autoriza)
-- ---------------------------------------------------------------------------
create or replace function public.fn_notification_recipients()
returns table (user_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $$
  select ur.user_id
    from public.user_roles ur
   where ur.role = 'admin'::public.app_role;
$$;

revoke all on function public.fn_notification_recipients() from public, anon, authenticated;
grant execute on function public.fn_notification_recipients() to service_role;


-- ---------------------------------------------------------------------------
-- 1.1) Compromissos (calendar_events)
--      Gatilho: AFTER INSERT OR UPDATE OF starts_at, ends_at, title,
--               description, type, all_day.
--      Destinatário: owner_id. Se NULL, NÃO cria "sem dono" (o app mostraria
--      a todos); usa o helper de admins como fallback.
--      type='agenda', link='/agenda'.
-- ---------------------------------------------------------------------------
create or replace function public.tg_notify_calendar_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tz    constant text := 'America/Sao_Paulo';
  v_when  text;
  v_title text;
  v_msg   text;
  r record;
begin
  -- UPDATE: só age se algo relevante mudou (mudança real, não ruído).
  if tg_op = 'UPDATE' then
    if new.starts_at     is not distinct from old.starts_at
       and new.ends_at   is not distinct from old.ends_at
       and new.title     is not distinct from old.title
       and new.description is not distinct from old.description
       and new.type      is not distinct from old.type
       and new.all_day   is not distinct from old.all_day then
      return new;
    end if;
  end if;

  v_when  := to_char(new.starts_at at time zone v_tz, 'DD/MM/YYYY HH24:MI');
  v_title := case when tg_op = 'INSERT' then 'Novo compromisso'
                  else 'Compromisso alterado' end;
  v_msg   := coalesce(nullif(new.title, ''), 'Compromisso') || ' — ' || v_when;

  if new.owner_id is not null then
    insert into public.notifications(user_id, type, priority, title, message, link)
    select new.owner_id, 'agenda'::public.notification_type,
           'media'::public.notification_priority, v_title, v_msg, '/agenda'
    where not exists (
      select 1 from public.notifications n
       where n.user_id = new.owner_id
         and n.link = '/agenda'
         and n.title = v_title
         and n.message = v_msg
         and n.created_at::date = current_date
    );
  else
    for r in select user_id from public.fn_notification_recipients() loop
      insert into public.notifications(user_id, type, priority, title, message, link)
      select r.user_id, 'agenda'::public.notification_type,
             'media'::public.notification_priority, v_title, v_msg, '/agenda'
      where not exists (
        select 1 from public.notifications n
         where n.user_id = r.user_id
           and n.link = '/agenda'
           and n.title = v_title
           and n.message = v_msg
           and n.created_at::date = current_date
      );
    end loop;
  end if;

  return new;
end $$;

revoke all on function public.tg_notify_calendar_event() from public, anon, authenticated;

drop trigger if exists trg_notify_calendar_event on public.calendar_events;
create trigger trg_notify_calendar_event
  after insert or update of starts_at, ends_at, title, description, type, all_day
  on public.calendar_events
  for each row execute function public.tg_notify_calendar_event();


-- ---------------------------------------------------------------------------
-- 1.2) Serviços concluídos (services.status -> 'concluido')
--      Gatilho: AFTER UPDATE OF status, só em transição real para 'concluido'.
--      Destinatário: created_by; se NULL, helper de admins.
--      type='manutencao', link='/servicos'.
-- ---------------------------------------------------------------------------
create or replace function public.tg_notify_service_completed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_msg text;
  r record;
begin
  if not (old.status is distinct from 'concluido' and new.status = 'concluido') then
    return new;
  end if;

  v_msg := coalesce(nullif(new.title, ''), 'Serviço') || ' foi concluído.';

  if new.created_by is not null then
    insert into public.notifications(user_id, type, priority, title, message, link)
    select new.created_by, 'manutencao'::public.notification_type,
           'media'::public.notification_priority, 'Serviço concluído', v_msg, '/servicos'
    where not exists (
      select 1 from public.notifications n
       where n.user_id = new.created_by
         and n.link = '/servicos'
         and n.title = 'Serviço concluído'
         and n.message = v_msg
    );
  else
    for r in select user_id from public.fn_notification_recipients() loop
      insert into public.notifications(user_id, type, priority, title, message, link)
      select r.user_id, 'manutencao'::public.notification_type,
             'media'::public.notification_priority, 'Serviço concluído', v_msg, '/servicos'
      where not exists (
        select 1 from public.notifications n
         where n.user_id = r.user_id
           and n.link = '/servicos'
           and n.title = 'Serviço concluído'
           and n.message = v_msg
      );
    end loop;
  end if;

  return new;
end $$;

revoke all on function public.tg_notify_service_completed() from public, anon, authenticated;

drop trigger if exists trg_notify_service_completed on public.services;
create trigger trg_notify_service_completed
  after update of status on public.services
  for each row execute function public.tg_notify_service_completed();


-- ---------------------------------------------------------------------------
-- 1.3) Pagamentos realizados (payables.status -> 'pago')
--      Conteúdo FINANCEIRO. O SQL cria a linha para os admins; a Edge Function
--      ainda filtra por e-mail bloqueado / allowlist antes de enviar push.
--      type='financeiro', link='/financeiro'.
-- ---------------------------------------------------------------------------
create or replace function public.tg_notify_payable_paid()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_msg text;
  r record;
begin
  if not (old.status is distinct from 'pago' and new.status = 'pago') then
    return new;
  end if;

  v_msg := coalesce(nullif(new.description, ''), 'Conta a pagar') ||
           ' — R$ ' || to_char(new.amount, 'FM999G999G990D00') ||
           ' — pago em ' ||
           to_char(coalesce(new.paid_at::timestamptz, now()) at time zone v_tz,
                   'DD/MM/YYYY HH24:MI');

  for r in select user_id from public.fn_notification_recipients() loop
    insert into public.notifications(user_id, type, priority, title, message, link)
    select r.user_id, 'financeiro'::public.notification_type,
           'media'::public.notification_priority, 'Pagamento realizado', v_msg, '/financeiro'
    where not exists (
      select 1 from public.notifications n
       where n.user_id = r.user_id
         and n.link = '/financeiro'
         and n.title = 'Pagamento realizado'
         and n.message = v_msg
    );
  end loop;

  return new;
end $$;

revoke all on function public.tg_notify_payable_paid() from public, anon, authenticated;

drop trigger if exists trg_notify_payable_paid on public.payables;
create trigger trg_notify_payable_paid
  after update of status on public.payables
  for each row execute function public.tg_notify_payable_paid();


-- ===========================================================================
-- OBSERVAÇÕES PARA APROVAÇÃO
--   - SECURITY DEFINER porque quem altera o serviço/pagamento pode não ter
--     INSERT em notifications pela RLS; a RLS do app continua valendo.
--   - receivables (recebimento) NÃO está nesta parte. Ver Parte 2 (desativado).
--   - Se o CRM passar a gerar estes mesmos eventos, revisar a dedup.
--   - Não cria coluna nova, não altera RLS, não altera dados existentes.
-- ===========================================================================
