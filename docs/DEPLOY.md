# Deploy do APP Império Caminhões (separado do CRM)

O app é um projeto independente e **não deve ser publicado dentro do repositório
do CRM**. Este documento prepara o deploy seguro.

## 1. Ambiente de produção (provedor)

- **Frontend estático único** (build Vite): hospede em Vercel, Netlify, Cloudflare
  Pages ou equivalente. Não é preciso servidor de backend.
- **Domínio/subdomínio próprio** (ex.: `app.imperiocaminhoes.com.br`).
- **HTTPS obrigatório** — fornecido automaticamente pelos provedores citados.
- **SPA fallback**: todas as rotas devem responder com `index.html` (200).
  - Netlify: o arquivo `public/_redirects` já está incluído nesta pasta
    (`/*  /index.html  200`).
  - Vercel: adicione `rewrites: [{ "source": "/:path*", "destination": "/index.html" }]`
    em `vercel.json`, ou use o `output` padrão baseado em SPA.
  - Cloudflare Pages: arquivo `_redirects` (o mesmo acima) na raiz do build.

## 2. Variáveis de ambiente no provedor

Copie do `.env` do app (nunca do `.env.example`):

```
VITE_SUPABASE_URL=https://qsjvsqkwrjcqljfsmbuj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key do projeto do CRM>
```

Regras:
- **Nenhuma** variável `SUPABASE_SERVICE_ROLE_KEY` / `service_role` no frontend.
- **Nenhuma** chave do sandbox `fjvctjizmvvkbbstrobx`.
- O valor fica no painel do provedor (secret), nunca no repositório.

## 3. Repositório Git próprio

- Crie um repositório dedicado para o app (não o do CRM).
- Garanta que `.env` está em `.gitignore` e não é commitado.
- Não inclua o diretório do CRM como subpasta/dependência.

## 4. PWA (já presentes na raiz de `public/`)

- `manifest.webmanifest` (standalone, `start_url: "/"`, ícones 96/192/512 + maskable).
- `sw.js` com `skipWaiting`/`clients.claim`.
- `/icons/icon-96.png`, `/icons/icon-192.png`, `/icons/icon-512.png`,
  `/icons/icon-maskable.png`, `/icons/apple-touch-icon.png`.
- O Service Worker **não** cacha Supabase (`*/auth/v1/`, `*/rest/v1/`,
  `*/storage/v1/`, `/api/`), nem requisições não-GET; navegação é network-first
  com página offline inline.
- Requisito localhost/HTTPS para instalar o PWA.

## 5. Banco de dados / migrations

- **Nenhuma** migration é executada no processo de build/deploy.
- O schema é do CRM (`qsjvsqkwrjcqljfsmbuj`) — consulte as types em
  `src/integrations/supabase/types.ts`.
- Ver `docs/migrations-do-sandbox-NAO-APLICAR/` antes de qualquer tilt no banco.

## 6. Preview seguro (permitido agora)

1. Suba o build em um deploy temporário do provedor (URL pública com HTTPS).
2. Teste login com credenciais reais de cada papel.
3. Compare contagens com o CRM; teste Realtime e Storage.
4. Só após aprovação → promoção para o domínio final.

## 7. Checklist de publicação

- [ ] `npm run typecheck` passa
- [ ] `npm run lint` sem erros
- [ ] `npm run build` passa e `dist/` contém `manifest.webmanifest`, `sw.js`, `icons/`
- [ ] Env do provedor aponta para `qsjvsqkwrjcqljfsmbuj` (anon)
- [ ] Sem `service_role`, sem chave do sandbox
- [ ] PWA instalável e abre standalone em HTTPS
- [ ] Login Admin / Financeiro / Secretaria testados no preview
- [ ] Testes de Realtime e Storage realizados com registro-teste
- [ ] RLS auditado no CRM (ver `docs/proposals/`) e sem exposição financeira