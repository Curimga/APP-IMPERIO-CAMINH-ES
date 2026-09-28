# Assistente V + OpenRouter

Projeto Supabase correto do APP:

- Project ref: `lzortptqkhpapzegdftz`
- URL: `https://lzortptqkhpapzegdftz.supabase.co`

Não use o sandbox antigo `fjvctjizmvvkbbstrobx` para secrets, deploy ou testes.

## Versão atual

Esta primeira versão da Assistente V é conversacional.

Ela valida a sessão do usuário, identifica permissões básicas e chama o OpenRouter pela Edge Function autenticada `assistant-v`, mas não consulta dados reais do CRM como frota, agenda, serviços, clientes, documentos ou financeiro.

## Secrets necessários

Cadastre no projeto Supabase correto (`lzortptqkhpapzegdftz`):

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

Não coloque a chave no frontend, no Git, em logs ou no chat.

Via CLI, no seu terminal local:

```bash
supabase secrets set OPENROUTER_API_KEY=<valor> --project-ref lzortptqkhpapzegdftz
supabase secrets set OPENROUTER_MODEL=<modelo-openrouter> --project-ref lzortptqkhpapzegdftz
```

## Deploy da Edge Function

Faça deploy com JWT verification ativado. Não use `--no-verify-jwt`.

```bash
supabase functions deploy assistant-v --project-ref lzortptqkhpapzegdftz
```

## Teste seguro

Depois do deploy e dos secrets, teste com uma pergunta conversacional, sem dados sensíveis e sem esperar consulta ao CRM, por exemplo:

- `O que você consegue fazer?`
- `Explique como funciona a Assistente V.`
- `Quais módulos do app você conhece?`

Não use perguntas como `agenda de hoje` ou `resumo da garagem` para validar dados reais nesta versão, porque ela ainda não consulta o CRM.
