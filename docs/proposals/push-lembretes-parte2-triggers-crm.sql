-- =====================================================================
-- PARTE 2 — avisos de AGENDA e de SERVIÇO no CRM
-- =====================================================================
-- Status: APLICADA em 21/10/2026 no projeto real `lzortptqkhpapzegdftz`
-- (migration `push_lembretes_parte2_crm`), com autorização do dono do app.
--
-- Por que existe
--   Hoje o CRM só gera aviso automático de contas a pagar
--   (`fn_generate_payable_alerts`). Para os lembretes de "compromisso
--   próximo" e "serviço a vencer" existirem, o CRM precisa gravar um aviso
--   desses tipos — e o aviso precisa carregar o id da entidade no link
--   (é assim que o `push-reminders` descobre o que ainda está pendente).
--
-- ATENÇÃO: isto muda o comportamento do CRM (passa a gravar notificações
--   novas em `notifications`). Nada aqui é necessário para os lembretes de
--   financeiro, que já funcionam com o gerador atual.
--
-- Depende da Parte 1 (`push_lembretes-proposta-sql.sql`) para que os
-- lembretes sejam planejados automaticamente.
--
-- Regras implementadas
--   - Agenda: um aviso por compromisso (por usuário), criado quando o
--     compromisso nasce ou muda; não avisa compromisso que já começou.
--     Prioridade herda de `calendar_events.priority` (deal_priority:
--     baixa/media/alta -> notification_priority).
--   - Serviço: um aviso por serviço (por usuário), criado quando o serviço
--     entra em `pendente` (ou nasce pendente).
--   - O aviso usa o mesmo link do APP:
--       /agenda?id=<uuid>        /servicos?id=<uuid>
--     O `push-reminders` reconhece esses links e para os lembretes quando o
--     compromisso começa ou o serviço é concluído/cancelado.
--   - Não é retroativo: os triggers só valem para inserts/updates futuros.
--
-- Rollback
--   drop trigger if exists trg_notify_calendar_event on public.calendar_events;
--   drop function if exists public.fn_notify_calendar_event();
--   drop trigger if exists trg_notify_service_pending on public.services;
--   drop function if exists public.fn_notify_service_pending();
--   drop index if exists public.idx_notif_user_link;
-- =====================================================================

-- Índice de apoio: o "já avisei?" de cada trigger consulta (user_id, link);
-- sem índice vira varredura sequencial da tabela de notificações.
create index if not exists idx_notif_user_link
  on public.notifications (user_id, link)
  where link is not null;


-- ---------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------
create or replace function public.fn_notify_calendar_event() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := new.owner_id;
  v_link text := '/agenda?id=' || new.id::text;
begin
  if v_user is null then
    return new; -- compromisso sem responsável: não é de ninguém
  end if;

  if new.starts_at <= now() then
    return new; -- compromisso já começou
  end if;

  if exists (
    select 1 from public.notifications n
     where n.user_id = v_user and n.link = v_link
  ) then
    return new; -- já avisado (um aviso por compromisso)
  end if;

  insert into public.notifications (user_id, type, priority, title, message, link)
  values (
    v_user,
    'agenda'::public.notification_type,
    new.priority::text::public.notification_priority,
    new.title,
    coalesce(new.description, 'Compromisso agendado') ||
      ' — ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
    v_link
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_calendar_event on public.calendar_events;
create trigger trg_notify_calendar_event
  after insert or update of starts_at, title, priority, owner_id on public.calendar_events
  for each row execute function public.fn_notify_calendar_event();

-- ---------------------------------------------------------------------
-- Serviços
-- ---------------------------------------------------------------------
create or replace function public.fn_notify_service_pending() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := new.created_by;
  v_link text := '/servicos?id=' || new.id::text;
begin
  if v_user is null then
    return new; -- serviço sem responsável
  end if;

  if new.status <> 'pendente' then
    return new; -- só o status "pendente" avisa
  end if;

  if exists (
    select 1 from public.notifications n
     where n.user_id = v_user and n.link = v_link
  ) then
    return new; -- já avisado (um aviso por serviço)
  end if;

  insert into public.notifications (user_id, type, priority, title, message, link)
  values (
    v_user,
    'manutencao'::public.notification_type,
    'media'::public.notification_priority,
    'Serviço pendente: ' || new.title,
    coalesce(new.description, 'Serviço aguardando execução') ||
      coalesce(' — previsto para ' || to_char(new.expected_at, 'DD/MM/YYYY'), ''),
    v_link
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_service_pending on public.services;
create trigger trg_notify_service_pending
  after insert or update of status on public.services
  for each row execute function public.fn_notify_service_pending();
