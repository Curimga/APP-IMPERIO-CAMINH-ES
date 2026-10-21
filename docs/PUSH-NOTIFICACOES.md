# Push de notificações no celular (Web Push)

Entrega real de notificações no telefone, inclusive com o app **fechado**, via
Web Push + Edge Function + webhook na tabela `notifications`.

> Regras preservadas: notificação com `user_id` vai só para o dono; sem
> `user_id` vai para todos os inscritos; notificação **financeira** vai somente
> para o Executivo (admin) e fora da lista de e-mails bloqueados — a mesma regra
> de `src/lib/mobile/queries.ts` (`isFinancialNotification`) e de
> `src/lib/mobile/perm.ts`. Um usuário não-admin também pode receber o financeiro
> **somente** por UUID individual autorizado (`PUSH_FINANCE_INDIVIDUAL_USER_IDS`).

## O que já está no repositório

- `public/sw.js`: handlers `push` e `notificationclick` (abre a rota real do app).
- `src/lib/mobile/push.ts`: inscrição/remoção, payload, dedup, chaves VAPID.
- `src/hooks/use-push-notifications.tsx`: ativação (opt-in) e complemento com o app aberto.
- `src/components/mobile/push-settings.tsx`: botão de ativação no Perfil.
- `supabase/functions/push-send/index.ts`: envio (fan-out, dedup, limpeza de expiradas).
- `supabase/functions/push-send/logic.ts`: núcleo puro testável (autenticação do
  webhook, classificação financeira, autorização por admin/UUID individual).
- `supabase/functions/push-send/deno.json`: `nodeModulesDir` para resolver o npm.
- `src/lib/mobile/push-server.test.ts`: testes da autenticação (401/503/405) e da regra financeira.
- `docs/proposals/push-subscriptions-proposta-sql.sql`: tabelas + RLS (proposta).

## O que depende de configuração no Supabase (curto)

1. **Criar as tabelas** `push_subscriptions` e `push_deliveries` e as policies,
   executando o SQL de `docs/proposals/push-subscriptions-proposta-sql.sql`
   no projeto **lzortptqkhpapzegdftz** (com autorização do time do CRM).

2. **Gerar as chaves VAPID** (na sua máquina; nunca comite a privada):

   ```
   npx web-push generate-vapid-keys --json
   ```

3. **Frontend**: definir `VITE_VAPID_PUBLIC_KEY` (só a pública) no `.env` local
   e nas variáveis de ambiente do provedor (Vercel), e refazer o deploy.

4. **Secrets da Edge Function** (Supabase → Edge Functions → Secrets).
   A privada entra **apenas** aqui, nunca no bundle:

   ```
   VAPID_PUBLIC_KEY    = <chave pública>
   VAPID_PRIVATE_KEY   = <chave privada>
   VAPID_SUBJECT       = mailto:contato@imperiocaminhoes.com.br
   PUSH_WEBHOOK_SECRET = <segredo aleatório compartilhado com o webhook>
   ```

   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão na função.

   Opcional — permissão financeira **individual** (sem dar cargo de admin):

   ```
   PUSH_FINANCE_INDIVIDUAL_USER_IDS = <uuid-autorizado>[,<outro-uuid>...]
   ```

   Aceita apenas UUIDs de `auth.users.id` (valores que não forem UUID são
   ignorados). Deve ser **idêntico** a `FINANCE_INDIVIDUAL_USER_IDS`
   (`src/lib/mobile/perm.ts`), que é a mesma regra no frontend — os dois lados
   usam `isFinanceExecutive(admin) OR UUID individual`.

   **BLOQUEIO (UUID):** o UUID real ainda não foi informado, então a allowlist
   está vazia nos dois lugares e o financeiro continua indo só para admin.
   **Não** conceda o papel de administrador só para isso.

   **BLOQUEIO (RLS):** em leitura, todas as tabelas financeiras do projeto
   espelho (`bank_accounts`, `bank_transactions`, `financial_categories`,
   `payables`, `receivables`, `general_expenses`) exigem `is_admin()` em
   SELECT/INSERT/UPDATE/DELETE. Um usuário não-admin é bloqueado pelo banco
   independentemente da allowlist do app. A proposta de RLS mínima está em
   `docs/proposals/finance-individual-access-proposta-sql.sql` (**não executar**).

5. **Deploy da Edge Function** `push-send` (no projeto do CRM):

   ```
   supabase functions deploy push-send --project-ref lzortptqkhpapzegdftz --no-verify-jwt
   ```

   **Por que `--no-verify-jwt`:** o webhook do Supabase não envia JWT de usuário
   (`Authorization: Bearer <jwt>`), portanto a verificação de JWT do gateway do
   Edge rejeitaria a chamada legítima com 401. A autenticação própria da função
   substitui essa verificação: exige o header `x-webhook-secret` e devolve **401**
   quando ele está ausente ou incorreto, **503** quando o segredo ainda não está
   configurado (fail closed), **405** para métodos diferentes de POST e **200**
   para o preflight OPTIONS. A comparação é feita em tempo constante (SHA-256 +
   XOR) e acontece **antes** de qualquer acesso ao banco. Cobertura de teste:
   `src/lib/mobile/push-server.test.ts`.

   > O diretório da função tem um `deno.json` (`"nodeModulesDir": "auto"`),
   > necessário para resolver `npm:web-push@3.6.7` localmente (`deno check`).
   > O bundler do Supabase resolve npm nativamente (suporte GA) no deploy —
   > ainda assim, **não faça o deploy sem confirmar** que a função responde
   > 401 sem o segredo no ambiente real.

6. **Webhook** (Supabase → Database → Webhooks → Create):
   - tabela `notifications`, evento **Insert**;
   - método `POST`, URL `https://<PROJECT_REF>.supabase.co/functions/v1/push-send`;
   - header `x-webhook-secret: <mesmo valor de PUSH_WEBHOOK_SECRET>`.

   Alternativa por trigger no banco: ver Parte 4 do arquivo SQL.

## Como testar

**Android (Chrome / PWA instalado)**
1. Abrir o app, Perfil → **Ativar notificações** → aceitar a permissão.
2. Fechar o app (remover dos recentes).
3. Criar uma notificação real em `notifications` (pelo CRM ou pelo Assistente).
4. O aviso deve chegar com o app fechado; o toque abre a rota do `link`.

**iPhone (iOS 16.4+)**
1. Safari → Compartilhar → **Adicionar à Tela de Início** (obrigatório).
2. Abrir pelo ícone instalado, Perfil → **Ativar notificações** → permitir.
3. Fechar o app e repetir o teste de inserção.

**Conferência de entrega**: a resposta da função retorna
`{ total, sent, skipped, expired, failed }`.

## O que ainda NÃO está concluído

A entrega em segundo plano só é considerada concluída quando **todos** abaixo
estiverem feitos e validados com o app fechado:

- [ ] tabelas criadas no projeto real;
- [ ] secrets VAPID e `PUSH_WEBHOOK_SECRET` cadastrados;
- [ ] Edge Function `push-send` implantada;
- [ ] webhook conectado à tabela `notifications`;
- [ ] teste autenticado em Android **e** iPhone confirmando a chegada fechada.

Enquanto isso, o app funciona com o **complemento** (avisos com o app aberto)
e a CI local; nada é declarado como "push em segundo plano" sem a validação acima.

## Segurança

- Nenhuma `service_role` ou chave privada no bundle (só a pública VAPID).
- A `service_role` fica apenas como env de sistema da Edge Function.
- Segredos nunca são impressos em logs ou relatórios.
- Autenticação do webhook por `x-webhook-secret` em tempo constante, checada
  antes de qualquer acesso ao banco; requisições sem o header/incorretas → 401.
- A função valida o `type` (só `INSERT`) e descarta corpos sem `id`/`title`.

## Verificação de esquema e RLS (leitura, no projeto espelho)

Feita **somente leitura** no projeto acessível via MCP
(`fjvctjizmvvkbbstrobx`, **vazio** e **diferente** do real
`lzortptqkhpapzegdftz`) — serve como indício do desenho, **não** como
confirmação do real:

- `notifications`: SELECT para qualquer autenticado (`auth.uid() is not null`);
  UPDATE restrito ao dono ou `user_id is null`. Não há policy de INSERT.
- `bank_accounts`, `bank_transactions`, `financial_categories`, `payables`,
  `receivables`, `general_expenses`: **todas as operações exigem `is_admin()`**
  (`is_admin()` = `has_role('admin')`). Não existe tabela/campo de permissão
  individual.
- `fn_generate_payable_alerts()` cria alertas financeiros **por admin**
  (`join user_roles on role='admin'`), com `user_id` preenchido e `link`
  começando em `/financeiro`.

Consequências: um não-admin é bloqueado pela RLS em todo o financeiro; e só
recebe alerta financeiro se o gerador incluí-lo. Proposta mínima (não executar):
`docs/proposals/finance-individual-access-proposta-sql.sql`.

A proposta de Web Push (`push-subscriptions-proposta-sql.sql`) também **não foi
comparada com o esquema real**; nada foi executado.

## Notificações com `user_id` nulo (avisos gerais)

No projeto espelho, o único gerador observado grava sempre `user_id` preenchido
(admins); não há gerador de `user_id` nulo no banco. O nulo é reservado para
avisos gerais (a regra do app é `user_id.eq.eu OR user_id.is.null`). Como a
policy de leitura já expõe todas as notificações a qualquer autenticado, o
broadcast de push para `user_id` nulo não amplia o público além de quem já podia
lê-las no app. É seguro **desde que** o CRM só use `user_id` nulo para avisos
não sensíveis; se um aviso sensível for gravado com nulo e texto neutro que não
case com o classificador `isFinancialNotification`, ele seria transmitido a
todos os inscritos — por isso o classificador roda antes do envio.

## Lembretes repetidos de avisos pendentes (0 a 3 por dia)

Recurso pedido pelo dono: cada usuário escolhe **quantos lembretes repetidos
recebe por dia** para cada aviso que **continua pendente** (0 = padrão, ou seja,
só o aviso original). O aviso original nunca muda: continua saindo uma vez, pelo
`push-send`.

### Como funciona

| Peça | Onde | Papel |
| --- | --- | --- |
| Preferência por usuário | `public.push_preferences` | `reminders_per_day` (0..3). Fica no banco, então acompanha o usuário em todos os aparelhos. |
| Plano de ocorrências | `public.push_reminder_plans` | Um por (aviso, dispositivo): guarda os horários e o estado (`planned/active/sent/cancelled/expired`). |
| Entrega | `public.push_deliveries.occurrence` | `0` = aviso original, `1..N` = lembretes. Índice único `(notification_id, subscription_id, occurrence)` garante **idempotência**. |
| Agendador | `public.push_scheduler_secret` + `pg_cron` | A cada 10 min chama a Edge Function `push-reminders` com `x-scheduler-secret`. |
| Execução | `supabase/functions/push-reminders` | Envia **no máximo 1 lembrete por plano por execução** (distribui durante o dia). |

Regras dentro da Edge Function:

- horários: **9h, 12h, 15h, 18h e 20h** (America/Sao_Paulo), nunca dentro do
  horário silencioso (21h–08h);
- antes de enviar, revalida: a preferência continua valendo? o aviso continua
  pendente? o usuário ainda pode receber aviso financeiro?
  - conta a pagar/receber: continua em `aberto`/`vencido` (pago/recebido/cancelado encerram);
  - compromisso: ainda não começou (`calendar_events.starts_at` > agora);
  - serviço: `pendente`/`em_andamento` (concluído/cancelado encerram);
- permissões financeiras: **nunca ampliadas** — usa as mesmas regras do
  `push-send` (`isFinancialRecipientAllowed`), incluindo a lista de bloqueio;
- aviso sem entidade reconhecível (link sem id) ou aviso de tipo não previsto:
  **sem lembrete** (prudência).

### Onde o usuário mexe

Perfil → **Notificações no celular** → *Lembretes por aviso pendente por dia*
(0, 1, 2 ou 3). A escolha é salva em `push_preferences` (RLS: cada usuário só
lê/escreve a própria linha) e a tela escuta o Realtime para atualizar quando a
opção muda em outro aparelho.

### O que ainda depende de configuração no projeto

1. migration `docs/proposals/push-lembretes-proposta-sql.sql` aplicada no
   projeto real (**ainda não aplicada** — é aditiva e tem rollback);
2. Edge Function `push-reminders` implantada (mesmas env de `push-send`);
3. `pg_cron` habilitado no projeto (o papel `postgres` não é superuser: é um
   passo de plataforma) e o job `push-reminders-a-cada-10-min` criado;
4. para lembretes de agenda/serviço existirem, o CRM precisa gerar aviso
   desses tipos — proposta opcional (muda o comportamento do CRM) em
   `docs/proposals/push-lembretes-parte2-triggers-crm.sql`.

Até a confirmação de entrega real no aparelho, o recurso **não é declarado
como funcionando em segundo plano**.
