-- PROPOSTA — NÃO EXECUTAR SEM AUTORIZAÇÃO
-- Projeto oficial do CRM/APP: lzortptqkhpapzegdftz.supabase.co
-- Auditoria de publicação NÃO realizada: sem credencial/acesso a esse projeto.
-- Este roteiro serve para conferir/ajustar a publicação supabase_realtime.
-- Nada foi executado. Requer autorização + credentials do projeto oficial.

-- ---------------------------------------------------------------------------
-- PARTE 1 — DIAGNÓSTICO (somente leitura)
-- ---------------------------------------------------------------------------
-- 1.1 Tabelas que o app espera em tempo real (fonte única: src/lib/mobile/realtime-map.ts).
--      São as 28 chaves assinadas pelo hub (src/components/dashboard/use-realtime-sync.tsx).
--      Obs.: financeiro/secretária NÃO assinam payables, receivables, bank_accounts,
--      bank_transactions, commissions, financial_categories e general_expenses
--      (perfis de papel via RLS no nível do cliente).
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
--   public.truck_status_history,
--   public.truck_notes,
--   public.truck_documents,
--   public.truck_expenses,
--   public.truck_purchase_installments,
--   public.truck_warranties,
--   public.deals,
--   public.deal_events,
--   public.documents,
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

-- ---------------------------------------------------------------------------
-- PARTE 3 — REPLICA IDENTITY FULL (SE a leitura do registro antigo for exigida)
-- ---------------------------------------------------------------------------
-- O app invalida por tabela (não consome o payload), então a PK padrão basta.
-- Se algum consumidor precisar do registro completo em DELETE/UPDATE antigo:
-- alter table public.<tabela> replica identity full;  -- avaliar por tabela
--
-- Notas:
-- * Não incluir tabelas que exponham segredos (ex.: email_settings) sem necessidade.
-- * RLS: para financeiro/secretária NÃO receberem eventos financeiros, além do
--   perfil-gating no cliente, a política de RLS de cada tabela financeira deve
--   restringir o papel (avaliar em docs/proposals/RLS-financeiro-proposta-sql.sql).
-- * Sem a publicação correta, o app continua usável via refetch ao reconectar
--   (o hub invalida tudo ao reaparecer), mas não haverá CRM→APP em tempo real.