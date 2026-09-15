# NÃO APLICAR — migrations do Supabase independente no banco do CRM

**AVISO CRÍTICO:** este diretório documenta as migrations executadas no
**projeto Supabase independente** `fjvctjizmvvkbbstrobx` (sandbox usado durante
o desenvolvimento do app). O app agora é servido pelo **Supabase real do CRM**
(`qsjvsqkwrjcqljfsmbuj`), que possui um banco descrito pelas types de
`src/integrations/supabase/types.ts`.

> Em hipótese alguma execute qualquer uma destas migrations no banco do CRM.
> Elas foram projetadas para o sandbox e podem reintroduzir funções inexistentes
> no CRM (`fn_trucks_full`, `fn_truck_finance`, `has_role`, `is_admin`,
> `is_staff`), restringir permissões incorretamente ou duplicar/confundir
> objetos já existentes (RLS, policies, triggers, buckets).

## Migrations do sandbox (NÃO APLICAR)

| Versão          | Nome                                     |
|-----------------|------------------------------------------|
| 20260908214424  | `create_auth_and_core_schema`            |
| 20260908214506  | `create_operations_tables`               |
| 20260908214541  | `create_finance_and_management_tables`   |
| 20260908214601  | `add_realtime_alerts_and_storage`        |
| 20260908214641  | `harden_function_privileges`             |
| 20260908215032  | `add_trucks_supplier_column`             |
| 20260911194517  | `enable_realtime_for_app_tables`         |
| 20260911194532  | `create_missing_profile_and_admin_roles` |
| 20260915162754  | `finance_restrict_to_admin`              |
| 20260915165050  | `fix_trucks_column_select_revoke`        |

## Política do CRM (definição de origem única)

- **Fonte da verdade do schema:** o repositório CRM `imperiocaminhoes-com-br`
  (migrations/SQL do próprio projeto CRM). Qualquer mudança de schema precisa
  de dono no CRM.
- **Types:** `src/integrations/supabase/types.ts` é uma cópia verbatim do CRM —
  nunca regerar a partir do sandbox.
- **Permissões/financeiro:** a regra de negócio "Financeiro é exclusivo do
  Executivo" é aplicada **no app** (consultas role-aware e gates de UI). Não
  alterar RLS/policies do banco do CRM a partir do app.
- **Realtime:** a publicação `supabase_realtime` deve ser habilitada no CRM
  para as tabelas usadas pelo hub do app (ver `src/components/dashboard/use-realtime-sync.tsx`).

## Motivo

O projeto independente foi criado apenas como ambiente de desenvolvimento.
Bancos distintos = dados duplicados. O app aponta para o CRM via:
- `VITE_SUPABASE_URL` → `https://qsjvsqkwrjcqljfsmbuj.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` → anon key do `.env` do CRM