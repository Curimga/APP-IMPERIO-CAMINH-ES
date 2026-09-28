import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Role = "admin" | "financeiro" | "secretaria";

interface RequestBody {
  question?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

interface Action {
  label: string;
  to: string;
  search?: Record<string, unknown>;
  params?: Record<string, string>;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FINANCE_BLOCKED_EMAILS = new Set(["josemar.essing@gmail.com"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function canAccessFinance(roles: Role[], email: string | null | undefined) {
  return roles.includes("admin") && !FINANCE_BLOCKED_EMAILS.has(email?.toLowerCase() ?? "");
}

function trimText(value: unknown, max = 160) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function extractJson(content: string): { answer: string; actions?: Action[] } {
  try {
    const parsed = JSON.parse(content) as { answer?: unknown; actions?: unknown };
    return {
      answer: trimText(parsed.answer, 4000) || content,
      actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 4) as Action[] : [],
    };
  } catch {
    const match = /\{[\s\S]*\}/.exec(content);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as { answer?: unknown; actions?: unknown };
        return {
          answer: trimText(parsed.answer, 4000) || content,
          actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 4) as Action[] : [],
        };
      } catch {
        // fall through
      }
    }
    return { answer: content };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const openRouterModel = Deno.env.get("OPENROUTER_MODEL");
  if (!openRouterKey || !openRouterModel) {
    return json(
      {
        error: "Assistente V não configurada. Defina os secrets OPENROUTER_API_KEY e OPENROUTER_MODEL no Supabase.",
        missingSecrets: [!openRouterKey ? "OPENROUTER_API_KEY" : null, !openRouterModel ? "OPENROUTER_MODEL" : null].filter(Boolean),
      },
      503,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Ambiente Supabase incompleto na Edge Function." }, 500);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Sessão inválida. Faça login novamente." }, 401);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Sessão inválida. Faça login novamente." }, 401);

  const body = await req.json().catch(() => ({})) as RequestBody;
  const question = trimText(body.question, 1000);
  if (question.length < 2) return json({ error: "Envie uma pergunta para a Assistente V." }, 400);

  const { data: rolesData, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id);
  if (rolesError) return json({ error: `Falha ao validar permissões: ${rolesError.message}` }, 500);

  const roles = ((rolesData ?? []) as { role: Role }[]).map((r) => r.role);
  const financeAllowed = canAccessFinance(roles, authData.user.email);

  const context = {
    user: {
      roles,
      financeAllowed,
    },
    rules: {
      conversationalOnly: true,
      readOnly: true,
      noMutations: true,
      noCrmDataInThisVersion: true,
      noFinancialDataInThisVersion: true,
      noCpfCnpjDocumentsOrUnnecessaryPersonalData: true,
    },
    appKnowledge: {
      name: "APP Império Caminhões",
      assistant: "Assistente V",
      availableModules: ["Garagem", "Serviços", "Agenda", "Clientes", "Estoque", "Vendidos", "Pendências", "Busca", "Menu"],
      limitation: "Esta primeira versão é conversacional e não consulta dados reais do CRM, como agenda, frota, serviços ou clientes.",
    },
  };

  const systemPrompt = [
    "Você é a Assistente V da Império Caminhões.",
    "Responda em português do Brasil, com objetividade, clareza operacional e tom profissional.",
    "Use somente o CONTEXTO fornecido. Esta versão não recebe dados reais do CRM.",
    "Se o usuário pedir agenda, frota, serviços, clientes, placas, estoque ou qualquer dado real, explique claramente que esta versão ainda é apenas conversacional e sugira abrir o módulo correspondente.",
    "Você pode responder perguntas e sugerir ações de navegação, mas nunca gravar, pagar, editar, excluir ou prometer ações automáticas.",
    "Não solicite nem exponha chaves, CPF/CNPJ, documentos ou dados pessoais desnecessários.",
    "Não informe valores financeiros. Mesmo para admin, esta primeira versão da Assistente V não recebe dados financeiros nem dados do CRM.",
    "Retorne exclusivamente JSON válido no formato: {\"answer\":\"texto\",\"actions\":[{\"label\":\"...\",\"to\":\"/...\",\"search\":{},\"params\":{}}]}.",
    "Ações permitidas: /garagem, /garagem/$truckId com params truckId, /servicos, /agenda, /clientes, /estoque, /vendidos, /pendencias, /busca, /menu.",
  ].join("\n");

  const history = (body.history ?? [])
    .slice(-8)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: trimText(m.content, 1000) }));

  const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://imperio-caminhoes.app",
      "X-Title": "Assistente V - Imperio Caminhoes",
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `CONTEXTO OPERACIONAL:\n${JSON.stringify(context)}\n\nPERGUNTA:\n${question}` },
        ...history,
      ],
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
    }),
  });

  if (!openRouterRes.ok) {
    const message = await openRouterRes.text();
    return json({ error: `OpenRouter retornou erro ${openRouterRes.status}. Verifique OPENROUTER_MODEL e a chave configurada.`, details: trimText(message, 300) }, 502);
  }

  const completion = await openRouterRes.json() as { choices?: { message?: { content?: string } }[] };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) return json({ error: "OpenRouter não retornou conteúdo." }, 502);

  return json({ ...extractJson(content), provider: "openrouter", model: openRouterModel });
});
