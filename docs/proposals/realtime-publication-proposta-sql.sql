-- PROPOSTA — NÃO EXECUTAR SEM AUTORIZAÇÃO
-- Auditoria BLOQUEADA por falta de acesso ao banco do CRM (qsjvsqkwrjcqljfsmbuj).
-- Roteiro para conferir/ajustar a publicação supabase_realtime. Nada foi executado.

-- ---------------------------------------------------------------------------
-- PARTE 1 — DIAGNÓSTICO (somente leitura)
-- ---------------------------------------------------------------------------
-- 1.1 Tabelas que o app espera em tempo real (hub em src/components/dashboard/use-realtime-sync.tsx):
--      trucks, truck_photos, truck_expenses, truck_purchase_installments, deals,
--      leads, customers, profiles, user_roles, payables, receivables, bank_accounts,
--      bank_transactions, commissions, goals, calendar_events, services, suppliers,
--      employees, notifications, financial_categories, general_expenses, inventory_items
--
-- 1.2 Conferir o que está publicado agora:
select el.relname as tabela, el.pubname as publicacao
from pg_publication_tables el
where el.pubname = 'supabase_realtime'
  and el.schemaname = 'public'
order by el.relname;

-- ---------------------------------------------------------------------------
-- PARTE 2 — AJUSTE PROPOSTO (SE faltarem tabelas) — NÃO EXECUTADO
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table
--   public.trucks,
--   public.truck_photos,
--   public.truck_expenses,
--   public.truck_purchase_installments,
--   public.deals,
--   public.leads,
--   public.customers,
--   public.profiles,
--   public.user_roles,
--   public.payables,
--   public.receivables,
--   public.bank_accounts,
--   public.bank_transactions,
--   public.commissions,
--   public.goals,
--   public.calendar_events,
--   public.services,
--   public.suppliers,
--   public.employees,
--   public.notifications,
--   public.financial_categories,
--   public.general_expenses,
--   public.inventory_items;

-- Notas:
-- * Registrar as tabelas como 'REPLICA IDENTITY FULL' se alguma precisar
--   refletir UPDATEs sem chave primária (o app usa id (PK) em todas as 23).
-- * Não incluir tabelas que exponham segredos (ex.: email_settings) sem necessidade.
-- * Exigido somente se o CSV Realtime do app for obrigatório; os dados ainda
--   funcionam via pull-to-refresh/refetch ao religar o app.