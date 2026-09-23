# Auditoria & correções — Sincronização Realtime APP ↔ CRM

- **Data:** 23/09/2026
- **HEAD auditado (estado de início):** `db5b870e8033550077cfbda445b57da49b39f4e8`
- **Projeto Supabase oficial:** `lzortptqkhpapzegdftz.supabase.co` (CRM + APP compartilham o mesmo banco)
- **Repos:** `Curimga/APP-IMPERIO-CAMINH-ES` (APP — este repo, editado) · `Curimga/imperiocaminhoes-com-br` (CRM — somente leitura)

## 1. Regras respeitadas

- Nenhuma alteração no banco (sem SQL/RLS/publicação executada); propostas ficam em `docs/proposals/` marcadas `NÃO EXECUTADO — REQUER AUTORIZAÇÃO`.
- Nenhum segredo anexado; `.env` não expostos.
- CRM não foi modificado.
- Nenhum teste real autenticado (CRM↔APP) foi executado — depende de credencial autorizada.

## 2. Causas-raiz corrigidas no APP (código)

| Bug / lacuna | Arquivo | Correção |
|---|---|---|
| Agenda web/CRV: INSERT/UPDATE/DELETE em `calendar_events` do CRM não atualizavam a agenda do app sem F5 | `src/lib/mobile/realtime-map.ts` | `calendar_events` agora invalida `agenda-range` e `event-mobile` (além de `agenda-mobile`/`agenda-mobile-today`); `services`/`payables`/`receivables` também passam a invalidar `agenda-range` (eventos vinculados). |
| Hub assinava tabelas financeiras para TODOS os perfis (financeiro/secretária recebiam eventos de dinheiro) | `src/components/dashboard/use-realtime-sync.tsx` | `realtimeTablesForRoles(roles)` filtra as 7 tabelas financeiras (`payables`, `receivables`, `bank_accounts`, `bank_transactions`, `commissions`, `financial_categories`, `general_expenses`) — assinatura apenas para Executivo/admin. Hub re-assina quando o perfil muda. |
| Canal caía (CHANNEL_ERROR/TIMED_OUT) e a sincronização morria em silêncio | `src/components/dashboard/use-realtime-sync.tsx` | Tratamento de estados: `SUBSCRIBED` (reconexão → invalida **todas** as chaves mobile uma vez para reconciliar eventos perdidos), `CHANNEL_ERROR`/`TIMED_OUT` → remove o canal e reassina com backoff de 5s; cleanup no logout. |
| Financeiro/Secretária recebiam `deals.value` na ficha do caminhão | `src/lib/mobile/queries.ts` | `useTruckDetail` só seleciona `value` quando `isExec`; para não-exec o valor é nulo (a requisição nem traz a coluna). |
| Concluir serviço no app não restaurava o status do caminhão (divergência com `completeService` do CRM) | `src/lib/mobile/actions.ts` + novo `src/lib/mobile/service-truck.ts` | `syncServiceTruckState`: serviço ativo (`em_andamento`/`pendente`) salva `truck_previous_status` (1ª vez) e move o caminhão para o status da categoria (padrão `oficina`, mesmas regras do CRM); `concluido` restaura o status anterior (ou `disponivel`). Aplicado em `createService` e `setServiceStatus`. |
| Mutações dependiam só do eco Realtime do próprio banco | `src/lib/mobile/invalidate.ts` + rotas | `useInvalidateMobile()` invalida imediatamente as chaves do mapa após a mutation (agenda, agenda/novo, serviços, status do caminhão, despesa) — robusto mesmo com canal degradado. |
| Service Worker versionado antigo | `public/sw.js` | `imperio-v7-2026.09.23-realtime-sync` (novo cache ao publicar). |

## 3. Matriz de invalidação (fonte única: `src/lib/mobile/realtime-map.ts`)

| Tabela (evento) | QueryKeys APP invalidados (principais) | Telas |
|---|---|---|
| trucks | trucks-mobile, truck-mobile, truck-detail, sold-trucks-mobile, finance-mobile, capital-imobilizado, agenda-range, dashboard-mobile | Garagem, ficha, vendidos, dashboard |
| truck_photos / truck_status_history | trucks-mobile, truck-mobile, truck-detail, dashboard-mobile | Garagem, ficha, dashboard |
| truck_expenses / general_expenses | truck-detail, finance-mobile, truck-expenses, dashboard-snapshot | Ficha, Financeiro |
| services | services-mobile, truck-mobile, truck-detail, agenda-range, dashboard-mobile | Serviços, ficha, agenda, dashboard |
| calendar_events | agenda-range, event-mobile, agenda-mobile, agenda-mobile-today, dashboard-mobile, notifications-mobile | Agenda, dashboard |
| customers / profiles / user_roles | customers-mobile, truck-detail, profiles | Clientes, ficha, sessão |
| payables / receivables / bank_* / commissions / financial_categories | finance-mobile, agenda-range, truck-detail, notifications-mobile (somente Executivo) | Financeiro, agenda |
| notifications | notifications-mobile, notifications-bell | Notificações, sinos |
| inventory_items | inventory-mobile, inventory-summary | Estoque |
| deals / deal_events / leads / documents / suppliers / truck_notes / truck_documents / truck_warranties / truck_purchase_installments / goals / employees | truck-detail, deals, dashboard, etc. | Ficha, vendas, dashboard |

## 4. Latência projetada

Evento no banco (CRM **ou** APP) → emissão Realtime → hub: throttle 250ms por tabela → `invalidateQueries` → refetch do banco. Latência típica visible: < 1s em rede normal.

## 5. Dependências — NÃO verificáveis nesta sessão (exigem autorização)

1. **Publicação `supabase_realtime`** no projeto oficial: sem acesso ao banco. Roteiro pronto em `docs/proposals/realtime-publication-proposta-sql.sql` (NÃO EXECUTADO). Sem as tabelas publicadas, não há CRM→APP em tempo real (só refetch).
2. **RLS financeira**: proposta em `docs/proposals/RLS-financeiro-proposta-sql.sql` (NÃO EXECUTADA). O app já esconde/omite via camada de consulta + assinatura por perfil, mas o banco ainda responde colunas/dados a quem tiver a permissão.
3. **Ambiente de produção**: `.env` locais apontam para `qsjvsqkwrjcqljfsmbuj` (antigo). Não foi possível confirmar qual URL/chave a Vercel usa em produção.
4. **Provas reais autenticadas (CRM↔APP)**: não executadas — exigem credencial ativa e registro autorizado de um teste controlado.

## 6. Gates executados (pós-alterações)

| Gate | Resultado |
|---|---|
| `npm run typecheck` | ✅ 0 erros |
| `npm run lint` | ✅ 0 erros (6 warnings pré-existentes em arquivos não tocados) |
| `npm run test` | ✅ 6 arquivos · 85 testes (inclui novo `realtime.test.ts`) |
| `npm run build` | ✅ build completo (warning de chunk > 500 kB, pré-existente) |

## 7. Próximos passos

1. Deploy (Vercel) do APP → validar bundle + novo SW; testar em 2 dispositivos (CRM e APP) com um usuário real.
2. Com credencial oficial: executar diagnóstico da publicação e ajustar (auto, com autorização).
3. Decidir RLS das tabelas financeiras (Executivo) e replicar eventual ajuste se o CRM depender.
4. Corrigir `.env`/variáveis de produção para `lzortptqkhpapzegdftz` quando a publishable key for fornecida.