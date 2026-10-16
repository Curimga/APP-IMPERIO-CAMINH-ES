-- PROPOSTA — NÃO EXECUTAR SEM AUTORIZAÇÃO
-- Projeto oficial do CRM/APP: lzortptqkhpapzegdftz.supabase.co
--
-- OBJETIVO: permitir que UM usuário não-administrador (autorizado
-- individualmente) CONSULTE e REGISTRE movimentações bancárias, sem receber o
-- cargo `admin`.
--
-- MOTIVO (leitura somente, projeto fjvctjizmvvkbbstrobx — NÃO é o projeto real):
--   bank_accounts, bank_transactions e financial_categories exigem is_admin()
--   em SELECT/INSERT/UPDATE/DELETE. `is_admin()` = has_role('admin').
--   Como o usuário individual não é admin, a RLS o bloqueia em TODAS as
--   operações — inclusive leitura. A allowlist do frontend NÃO altera isso.
--
-- >>> ESTE ARQUIVO NÃO FOI COMPARADO COM A RLS DO PROJETO REAL (acesso indisponível).
-- >>> Antes de executar: conferir, no banco real, os nomes das policies, o
-- >>> helper is_admin() e se já existe alguma tabela/política equivalente.
--
-- ---------------------------------------------------------------------------
-- 1) Allowlist individual (gerenciada apenas por admin)
-- ---------------------------------------------------------------------------
create table if not exists public.finance_access (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.finance_access enable row level security;

-- Só admin lê/gerencia a allowlist.
drop policy if exists finance_access_admin_all on public.finance_access;
create policy finance_access_admin_all on public.finance_access
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- 2) Helper de acesso financeiro individual
-- ---------------------------------------------------------------------------
create or replace function public.has_finance_access()
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select is_admin() or exists (
    select 1 from public.finance_access fa where fa.user_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------------
-- 3) Policies adicionais (apenas LEITURA + registro de movimentação)
--    UPDATE/DELETE permanecem exclusivos de admin.
-- ---------------------------------------------------------------------------
-- bank_accounts: leitura
drop policy if exists bank_accounts_select_finance_access on public.bank_accounts;
create policy bank_accounts_select_finance_access on public.bank_accounts
  for select to authenticated using (has_finance_access());

-- financial_categories: leitura
drop policy if exists financial_categories_select_finance_access on public.financial_categories;
create policy financial_categories_select_finance_access on public.financial_categories
  for select to authenticated using (has_finance_access());

-- bank_transactions: leitura e inserção (lançamento/transferência/ajuste)
drop policy if exists bank_transactions_select_finance_access on public.bank_transactions;
create policy bank_transactions_select_finance_access on public.bank_transactions
  for select to authenticated using (has_finance_access());

drop policy if exists bank_transactions_insert_finance_access on public.bank_transactions;
create policy bank_transactions_insert_finance_access on public.bank_transactions
  for insert to authenticated with check (has_finance_access());

-- ---------------------------------------------------------------------------
-- 4) Conceder a permissão individual (executar com controle)
--    Substituir <UUID> pelo auth.users.id real, confirmado pelo administrador.
-- ---------------------------------------------------------------------------
-- insert into public.finance_access (user_id, note)
-- values ('<UUID>', 'acesso financeiro individual - autorizado por <admin>');

-- ---------------------------------------------------------------------------
-- 5) (Opcional) Alertas de contas a pagar para o usuário individual
--    Hoje fn_generate_payable_alerts() gera notificações SOMENTE para admins
--    (join user_roles on role='admin'). Para o usuário individual recebê-las,
--    ele precisa entrar nesse conjunto. Isto altera função SECURITY DEFINER —
--    revisar com cuidado.
-- ---------------------------------------------------------------------------
-- create or replace function public.fn_generate_payable_alerts()
-- returns void language plpgsql security definer set search_path to 'public'
-- as $$
-- begin
--   insert into public.notifications (id, user_id, title, message, type, priority, link, read, created_at)
--   select
--     gen_random_uuid(),
--     f.user_id,
--     case when p.due_date < current_date then 'Conta em atraso' else 'Conta a vencer' end,
--     'R$ ' || to_char(p.amount, 'FM999G999G999D90') || ' - ' || coalesce(nullif(p.description,''),'despesa') ||
--     case when p.due_date < current_date
--       then ' (atrasada desde ' || to_char(p.due_date,'DD/MM') || ')'
--       else ' vence em ' || to_char(p.due_date,'DD/MM') end,
--     'warning',
--     case when p.due_date < current_date then 'critica' else 'media' end::public.notification_priority,
--     '/financeiro?payable=' || p.id::text,
--     false, now()
--   from public.payables p
--   join (
--     select user_id from public.user_roles where role = 'admin'
--     union
--     select user_id from public.finance_access
--   ) f on true
--   where p.status = 'pendente'
--     and (p.due_date between current_date and current_date + 3 or p.due_date < current_date)
--     and not exists (
--       select 1 from public.notifications n
--       where n.user_id = f.user_id
--         and n.link = '/financeiro?payable=' || p.id::text
--         and n.created_at >= current_date
--     );
-- end $$;

-- ---------------------------------------------------------------------------
-- 6) ALERTA (pré-existente, fora do escopo desta proposta)
--    A policy de leitura de notifications hoje é:
--      select to authenticated using (auth.uid() is not null)
--    ou seja, QUALQUER usuário autenticado lê TODAS as notificações, inclusive
--    as financeiras endereçadas a outro user_id. O filtro por dono/financeiro
--    é apenas de aplicação. Não estamos alterando isso aqui, mas registramos
--    para revisão do time do CRM.
-- ---------------------------------------------------------------------------
