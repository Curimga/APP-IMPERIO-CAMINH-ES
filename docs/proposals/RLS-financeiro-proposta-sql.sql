-- PROPOSTA — NÃO EXECUTAR SEM AUTORIZAÇÃO
-- Auditoria BLOQUEADA por falta de acesso ao banco do CRM (qsjvsqkwrjcqljfsmbuj).
-- Este arquivo é apenas o roteiro + SQL proposto. Deve ser revisto/dono pelo time do CRM.
-- Nenhuma instrução abaixo foi executada.

-- ---------------------------------------------------------------------------
-- PARTE 1 — DIAGNÓSTICO (somente leitura; rodar com a role de análise no CRM)
-- ---------------------------------------------------------------------------
-- 1.1  Listar políticas de SELECT das tabelas financeiras e de trucks:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'trucks','truck_expenses','truck_purchase_installments',
    'payables','receivables','bank_transactions','bank_accounts',
    'commissions','general_expenses','deals','leads'
  )
ORDER BY tablename, policyname;

-- 1.2  Colunas financeiras de 'trucks' (as que o app reserva ao Executivo):
--      expected_price, purchase_price, purchase_total_paid, purchase_total_pending,
--      sold_price, down_payment_value, down_payment_status, sale_type, sale_notes,
--      expenses_total, purchase_installments_count, purchase_payment_method.

-- 1.3  Simular acesso por papel (preencher <user_uuid>):
--      set local role authenticated; set local "request.jwt.claims" to '{"sub":"<user_uuid>","role":"authenticated","app_role":"financeiro"}';
--      select id, expected_price, sold_price from trucks limit 1;
--      select * from payables limit 1;

-- ---------------------------------------------------------------------------
-- PARTE 2 — PROPOSTA CORRETIVA (SE a auditoria confirmar exposição)
-- Ajuste conforme a política real do CRM. Exemplo NÃO aplicado:
-- ---------------------------------------------------------------------------
-- create policy app_nao_financeiro_sem_valores
--   on public.trucks for select
--   to authenticated, service_role
--   using (
--     exists (select 1 from public.user_roles ur
--             where ur.user_id = auth.uid() and ur.role in ('admin'))
--   );
-- -- ou, se preferir por FUNCTION GRANT (o CRM pode já restringir via GRANTs/deny):
-- revoke select (expected_price, sold_price, purchase_price,
--                purchase_total_paid, purchase_total_pending,
--                down_payment_value, expenses_total)
--   on public.trucks from authenticated;

-- ATENÇÃO: qualquer mudança de RLS/GRANT afeta o CRM inteiro (admin, portal,
-- relatórios). Exige autorização explícita do time do CRM antes de aplicar.

-- ---------------------------------------------------------------------------
-- PARTE 3 — REGISTRO DO RISCO (preenchido quando a auditoria for possível)
-- Tabela afetada:  (pendente)
-- Política atual:  (pendente)
-- Papel com acesso: (pendente)
-- Informação exposta: (pendente)
-- Nível de risco:   (pendente)
-- ---------------------------------------------------------------------------