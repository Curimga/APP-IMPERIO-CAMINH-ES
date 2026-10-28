import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import {
  authorizeRequest,
  buildPayload,
  extractRecord,
  type NotificationRecord,
} from "./logic.ts";

/**
 * Edge Function push-send — entrega Web Push real.
 *
 * Disparada por webhook do Supabase na INSERÇÃO da tabela `notifications`
 * (ver docs/PUSH-NOTIFICACOES.md). Preserva a regra do app:
 *   - notificação com user_id  -> só o dono;
 *   - notificação sem user_id  -> todos os dispositivos inscritos;
 *   - notificações de compromissos e pagamentos -> todos os usuários inscritos.
 *
 * Autenticação: o webhook não traz JWT de usuário; a função exige o cabeçalho
 * `x-webhook-secret` (comparação constante) ANTES de qualquer trabalho. Por
 * isso o deploy usa `--no-verify-jwt` — ver docs/PUSH-NOTIFICACOES.md.
 *
 * Deduplicação por (notification_id, subscription_id) via push_deliveries.
 * Subscriptions expiradas (404/410) são removidas no momento do envio.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@imperiocaminhoes.com.br";
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET");

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function deliver(record: NotificationRecord) {
  let query = service
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");
  if (record.user_id) query = query.eq("user_id", record.user_id);
  const { data: subscriptionsData, error: subsError } = await query;
  if (subsError) return { error: subsError.message };

  const subscriptions = (subscriptionsData ?? []) as SubscriptionRow[];

  const payload = JSON.stringify(buildPayload(record));
  let sent = 0;
  let skipped = 0;
  let expired = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const { data: claim } = await service
      .from("push_deliveries")
      .insert({ notification_id: record.id, subscription_id: sub.id })
      .select("id");
    if (!claim || claim.length === 0) {
      skipped += 1;
      continue;
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await service.from("push_subscriptions").delete().eq("id", sub.id);
        expired += 1;
      } else {
        await service
          .from("push_deliveries")
          .delete()
          .eq("notification_id", record.id)
          .eq("subscription_id", sub.id);
        failed += 1;
      }
    }
  }

  return { total: subscriptions.length, sent, skipped, expired, failed };
}

Deno.serve(async (req) => {
  const decision = await authorizeRequest({
    method: req.method,
    providedSecret: req.headers.get("x-webhook-secret"),
    expectedSecret: WEBHOOK_SECRET,
    vapidConfigured: Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
  });
  if (decision.kind === "response") return json(decision.body, decision.status);

  const body = await req.json().catch(() => null);
  const type = (body as { type?: string } | null)?.type;
  if (type && type !== "INSERT") return json({ skipped: "not_insert" }, 200);

  const record = extractRecord(body);
  if (!record) return json({ skipped: "no_record" }, 200);

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  const result = await deliver(record);
  return json(result, 200);
});
