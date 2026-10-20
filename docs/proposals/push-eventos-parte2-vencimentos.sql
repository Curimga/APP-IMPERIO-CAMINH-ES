-- ===========================================================================
-- PROPOSTA — PARTE 2 de 3 — SQL + AGENDAMENTO DE AVISOS DE VENCIMENTO
-- NÃO EXECUTAR SEM AUTORIZAÇÃO DO TIME DO CRM
-- Projeto: lzortptqkhpapzegdftz.supabase.co
-- Revisão final somente-leitura: 20/10/2026
-- ===========================================================================
--
-- OBJETIVO
--   Gerar notificações "a vencer" rodando NO SERVIDOR (o app pode estar
--   fechado; nunca usar timer de navegador).
--
-- DECISÃO DESTA REVISÃO (item 4)
--   Mantém ATIVO somente o lembrete de CONTAS A PAGAR, na regra ATUAL do CRM:
--   vence em até 3 dias. CONTAS A RECEBER fica DESATIVADO (o prazo de 3 dias é
--   novo e NÃO foi aprovado). O bloco de receivables fica atrás de uma guarda
--   booleana (v_enable_receivables := false) — para ligar no futuro exige
--   editar a função após aprovação explícita.
--
-- O QUE JÁ EXISTE NO CRM (confirmado por leitura)
--   - public.fn_generate_payable_alerts(): payables, regra
--       status <> 'pago' AND due_date <= CURRENT_DATE + INTERVAL '3 days'
--     destinatários role IN ('admin','financeiro'), link
--     '/financeiro/contas-pagar?id=<id>', dedup (user_id, link, created_at::date).
--   - Contas a receber: NÃO existe função/regra de "a vencer" no CRM.
--   - NÃO há pg_cron nem pg_net instalados (pg_extension confirmado).
--
-- >>> PONTO DE APROVAÇÃO — RECEBIMENTOS DESATIVADOS
--     O prazo de 3 dias para recebimentos é NOVO e não aprovado. Está
--     desligado por padrão. NÃO habilitar sem aprovação explícita.
--
-- DESTINATÁRIOS
--   SOMENTE role 'admin' (helper da Parte 1), igual ao que a Edge Function
--   autoriza. NÃO inclui role 'financeiro' (a função não entrega a eles).
--
-- SEGURANÇA
--   SECURITY DEFINER + `set search_path to 'public'`. REVOKE EXECUTE de
--   PUBLIC/anon/authenticated; GRANT apenas a service_role (o agendador roda
--   como service_role / postgres). NÃO expor via RPC pública.
--
-- TABELAS/COLUNAS AFETADAS
--   LÊ  : payables(id,description,amount,due_date,status)
--         receivables(id,description,amount,due_date,status)  [desativado]
--         user_roles(user_id,role)
--   ESCREVE: notifications(user_id,type,priority,title,message,link)
--   NÃO altera dados de payables/receivables.
--
-- COMO EVITA DUPLICIDADE
--   Dedup por (user_id, link, created_at::date) — idêntico ao CRM. Máximo 1
--   aviso por obrigação/usuário/dia, mesmo rodando várias vezes ao dia. Isso
--   não suprime mudança legítima: obrigações diferentes têm links diferentes.
--
-- ORDEM: executar SOMENTE depois da Parte 1 (usa fn_notification_recipients).
--
-- COMO REVERTER
--   select cron.unschedule('imperio-due-alerts');        -- se usar pg_cron
--   drop function if exists public.fn_generate_due_alerts();
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- (Re)cria o helper caso a Parte 1 ainda não tenha sido aplicada.
-- Mantém EXECUTE restrito.
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
-- 2.1) Varredura "a vencer"
--      payables    -> janela 3 dias (REGRA DO CRM, ATIVA)
--      receivables -> DESATIVADO (guarda v_enable_receivables = false)
--      Atrasado (due_date < current_date) => prioridade 'alta'.
-- ---------------------------------------------------------------------------
create or replace function public.fn_generate_due_alerts()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_payable_days       constant integer := 3;      -- regra do CRM
  v_receivable_days    constant integer := 3;      -- NÃO aprovado (ver guarda)
  v_enable_receivables constant boolean := false;  -- DESATIVADO por padrão
  v_inserted integer := 0;
  p record;
  u record;
begin
  -- ---------------- CONTAS A PAGAR (ATIVO) ----------------
  for p in
    select id, description, due_date, amount
      from public.payables
     where status <> 'pago'
       and due_date <= (current_date + (v_payable_days || ' days')::interval)
  loop
    for u in select user_id from public.fn_notification_recipients() loop
      insert into public.notifications(user_id, type, priority, title, message, link)
      select u.user_id, 'financeiro'::public.notification_type,
        case when p.due_date < current_date
             then 'alta'::public.notification_priority
             else 'media'::public.notification_priority end,
        case when p.due_date < current_date
             then 'Pagamento em atraso'
             else 'Pagamento próximo do vencimento' end,
        p.description || ' — R$ ' || to_char(p.amount, 'FM999G999G990D00') ||
          ' — vence ' || to_char(p.due_date, 'DD/MM/YYYY'),
        '/financeiro/contas-pagar?id=' || p.id::text
      where not exists (
        select 1 from public.notifications n
         where n.user_id = u.user_id
           and n.link = '/financeiro/contas-pagar?id=' || p.id::text
           and n.created_at::date = current_date
      );
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;

  -- ---------------- CONTAS A RECEBER (DESATIVADO) ----------------
  if v_enable_receivables then
    for p in
      select id, description, due_date, amount
        from public.receivables
       where status <> 'recebido'
         and due_date <= (current_date + (v_receivable_days || ' days')::interval)
    loop
      for u in select user_id from public.fn_notification_recipients() loop
        insert into public.notifications(user_id, type, priority, title, message, link)
        select u.user_id, 'financeiro'::public.notification_type,
          case when p.due_date < current_date
               then 'alta'::public.notification_priority
               else 'media'::public.notification_priority end,
          case when p.due_date < current_date
               then 'Recebimento em atraso'
               else 'Recebimento próximo do vencimento' end,
          p.description || ' — R$ ' || to_char(p.amount, 'FM999G999G990D00') ||
            ' — vence ' || to_char(p.due_date, 'DD/MM/YYYY'),
          '/financeiro/contas-receber?id=' || p.id::text
        where not exists (
          select 1 from public.notifications n
           where n.user_id = u.user_id
             and n.link = '/financeiro/contas-receber?id=' || p.id::text
             and n.created_at::date = current_date
        );
        if found then v_inserted := v_inserted + 1; end if;
      end loop;
    end loop;
  end if;

  return v_inserted;
end $$;

revoke all on function public.fn_generate_due_alerts() from public, anon, authenticated;
grant execute on function public.fn_generate_due_alerts() to service_role;


-- ===========================================================================
-- 2.2) AGENDAMENTO — escolher UMA opção (NÃO aplicado)
-- ===========================================================================
--
-- OPÇÃO A — pg_cron (dentro do Postgres). REQUER habilitar extensão (aprovação):
--   create extension if not exists pg_cron;
--   select cron.schedule('imperio-due-alerts', '0 * * * *',
--                        $$ select public.fn_generate_due_alerts() $$);
--   -- de hora em hora é seguro (dedup por dia) e pega novas obrigações do dia.
--
-- OPÇÃO B — Agendador externo (SEM instalar extensão): um agente de servidor
--   (Edge Function agendada / Vercel Cron / GitHub Actions) chama:
--     select public.fn_generate_due_alerts();
--   O app NUNCA agenda isto no navegador.
--
-- >>> Nenhuma opção foi aplicada.
-- ===========================================================================
