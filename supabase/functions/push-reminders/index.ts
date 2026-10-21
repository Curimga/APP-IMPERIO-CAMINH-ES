import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import {
  isFinancialNotification,
  isFinancialRecipientAllowed,
  parseUserIdList,
  secretsMatch,
  type NotificationRecord,
} from "../push-send/logic.ts";
import {
  buildReminderPayload,
  dueOccurrenceIndices,
  isPlanExpired,
  isQuietHour,
  isReminderStillPending,
  mergeOccurrences,
  normalizeRemindersPerDay,
  planOccurrences,
  resolveReminderEntity,
  type ReminderEntity,
} from "./logic.ts";

/**
 * Edge Function push-reminders — lembretes repetidos de avisos pendentes.
 *
 * O aviso original continua sendo entregue uma única vez pelo `push-send`
 * (disparado na inserção de `notifications`). Esta função cuida apenas dos
 * LEMBRETES: avisos que continuam pendentes voltam a ser avisados conforme a
 * preferência do usuário (0 a 3 lembretes por dia).
 *
 * Como funciona:
 *   1. `public.push_reminder_plans` guarda, por aviso e por dispositivo, quais
 *      ocorrências ainda faltam entregar (a preference muda o plano);
 *   2. a cada execução (agendador) a função envia no máximo UMA ocorrência por
 *      plano — assim os lembretes saem distribuídos (9h, 12h, 15h, 18h, 20h
 *      no fuso America/Sao_Paulo) e nunca todos de uma vez;
 *   3. antes de enviar, revalida: a preferência continua valendo? o aviso
 *      continua pendente? o usuário ainda pode receber aviso financeiro?
 *      Se qualquer resposta for não, o plano é cancelado;
 *   4. a entrega é registrada em `push_deliveries` com `occurrence` (0 = aviso
 *      original, 1..N = lembretes), o que garante idempotência: o mesmo
 *      (aviso, dispositivo, ocorrência) nunca é enviado duas vezes.
 *
 * Autenticação: chamada pelo agendador (pg_cron -> pg_net) com o cabeçalho
 * `x-scheduler-secret`, comparado (tempo constante) com o segredo guardado em
 * `public.push_scheduler_secret`. O segredo nunca sai do banco para o app.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-scheduler-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PlanRow {
  id: string;
  notification_id: string;
  user_id: string;
  subscription_id: string;
  per_day: number;
  anchor_at: string;
  planned_at: string[] | null;
  status: string;
}

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
const FINANCE_INDIVIDUAL_USER_IDS = parseUserIdList(
  Deno.env.get("PUSH_FINANCE_INDIVIDUAL_USER_IDS"),
);
const MAX_PLANS_PER_RUN = Number(Deno.env.get("PUSH_REMINDERS_MAX_PLANS") ?? "200");

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Segredo do agendador: fica no banco, com RLS ligada e sem policy (só service_role). */
async function schedulerSecret(): Promise<string | null> {
  const { data } = await service
    .from("push_scheduler_secret")
    .select("secret")
    .limit(1)
    .maybeSingle();
  const secret = (data as { secret?: string } | null)?.secret;
  return typeof secret === "string" && secret.length > 0 ? secret : null;
}

async function authorized(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-scheduler-secret");
  if (!provided) return false;
  const expected = await schedulerSecret();
  if (!expected) return false;
  return secretsMatch(provided, expected);
}

async function loadNotification(id: string): Promise<NotificationRecord | null> {
  const { data } = await service
    .from("notifications")
    .select("id, title, message, link, priority, type, user_id")
    .eq("id", id)
    .maybeSingle();
  return (data as NotificationRecord | null) ?? null;
}

async function loadEntityState(
  entity: ReminderEntity,
): Promise<{ status: string | null; startsAt: string | null } | null> {
  if (entity.kind === "payable") {
    const { data } = await service
      .from("payables")
      .select("id, status, due_date")
      .eq("id", entity.id)
      .maybeSingle();
    return { status: (data as { status?: string } | null)?.status ?? null, startsAt: null };
  }
  if (entity.kind === "receivable") {
    const { data } = await service
      .from("receivables")
      .select("id, status, due_date")
      .eq("id", entity.id)
      .maybeSingle();
    return { status: (data as { status?: string } | null)?.status ?? null, startsAt: null };
  }
  if (entity.kind === "event") {
    const { data } = await service
      .from("calendar_events")
      .select("id, starts_at")
      .eq("id", entity.id)
      .maybeSingle();
    return { status: null, startsAt: (data as { starts_at?: string } | null)?.starts_at ?? null };
  }
  const { data } = await service
    .from("services")
    .select("id, status")
    .eq("id", entity.id)
    .maybeSingle();
  return { status: (data as { status?: string } | null)?.status ?? null, startsAt: null };
}

const financeCache = new Map<string, boolean>();

/** Mesma regra do push-send: nunca amplia quem pode receber aviso financeiro. */
async function financeAllowed(userId: string): Promise<boolean> {
  const cached = financeCache.get(userId);
  if (cached !== undefined) return cached;

  const { data: adminRows } = await service
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin");
  const isAdmin = (adminRows ?? []).length > 0;

  let email: string | null = null;
  if (isAdmin || FINANCE_INDIVIDUAL_USER_IDS.has(userId)) {
    try {
      const { data: info } = await service.auth.admin.getUserById(userId);
      email = info?.user?.email ?? null;
    } catch {
      email = null;
    }
  }

  const allowed = isFinancialRecipientAllowed({
    isAdmin,
    email,
    userId,
    individualUserIds: FINANCE_INDIVIDUAL_USER_IDS,
  });
  financeCache.set(userId, allowed);
  return allowed;
}

async function currentPreference(userId: string): Promise<number> {
  const { data } = await service
    .from("push_preferences")
    .select("reminders_per_day")
    .eq("user_id", userId)
    .maybeSingle();
  const value = (data as { reminders_per_day?: number } | null)?.reminders_per_day;
  return normalizeRemindersPerDay(value ?? 0);
}

/** Ocorrências já entregues (1..N). A ocorrência 0 é o aviso original. */
async function sentOccurrences(notificationId: string, subscriptionId: string): Promise<Set<number>> {
  const { data } = await service
    .from("push_deliveries")
    .select("occurrence")
    .eq("notification_id", notificationId)
    .eq("subscription_id", subscriptionId);
  const sent = new Set<number>();
  for (const row of (data ?? []) as { occurrence?: number | null }[]) {
    const value = row.occurrence ?? 0;
    if (value > 0) sent.add(value);
  }
  return sent;
}

/**
 * Reserva a entrega antes de enviar (evita corrida entre execuções).
 * O índice único (notification_id, subscription_id, occurrence) faz o
 * segundo envio cair como duplicado.
 */
async function claimDelivery(
  notificationId: string,
  subscriptionId: string,
  occurrence: number,
): Promise<string | null> {
  const { data, error } = await service
    .from("push_deliveries")
    .insert({ notification_id: notificationId, subscription_id: subscriptionId, occurrence })
    .select("id");
  if (error) return null;
  const id = (data as { id?: string }[] | null)?.[0]?.id;
  return typeof id === "string" ? id : null;
}

async function cancelPlan(planId: string, reason: string): Promise<void> {
  await service
    .from("push_reminder_plans")
    .update({ status: "cancelled", cancel_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", planId);
}

async function savePlan(planId: string, plannedAt: string[], perDay: number): Promise<void> {
  await service
    .from("push_reminder_plans")
    .update({
      planned_at: plannedAt,
      per_day: perDay,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);
}

async function processPlan(
  plan: PlanRow,
  now: Date,
): Promise<{ sent: number; skipped: number; cancelled: number; expired: number; failed: number }> {
  const result = { sent: 0, skipped: 0, cancelled: 0, expired: 0, failed: 0 };

  const record = await loadNotification(plan.notification_id);
  if (!record) {
    await cancelPlan(plan.id, "aviso_removido");
    result.cancelled += 1;
    return result;
  }

  // A preferência atual do usuário manda: 0 cancela os lembretes.
  const preference = await currentPreference(plan.user_id);
  if (preference < 1) {
    await cancelPlan(plan.id, "preferencia_desativada");
    result.cancelled += 1;
    return result;
  }

  // O aviso ainda diz respeito a alguma entidade pendente?
  const entity = resolveReminderEntity(record.link, record.type);
  if (!entity) {
    await cancelPlan(plan.id, "aviso_sem_entidade");
    result.cancelled += 1;
    return result;
  }

  const state = await loadEntityState(entity);
  if (!state) {
    await cancelPlan(plan.id, "entidade_removida");
    result.cancelled += 1;
    return result;
  }
  if (
    !isReminderStillPending({
      kind: entity.kind,
      status: state.status,
      startsAt: state.startsAt,
      now,
    })
  ) {
    await cancelPlan(plan.id, "resolvido");
    result.cancelled += 1;
    return result;
  }

  // Autorização financeira: nunca ampliamos quem pode receber.
  if (isFinancialNotification(record) && !(await financeAllowed(plan.user_id))) {
    await cancelPlan(plan.id, "sem_permissao_financeira");
    result.cancelled += 1;
    return result;
  }

  const anchor = new Date(plan.anchor_at);
  if (Number.isNaN(anchor.getTime()) || isPlanExpired(anchor, now)) {
    await cancelPlan(plan.id, "expirado");
    result.cancelled += 1;
    return result;
  }

  const sent = await sentOccurrences(plan.notification_id, plan.subscription_id);
  const maxSent = sent.size ? Math.max(...sent) : 0;

  // (Re)planeja: primeira vez cria os horários; depois ajusta à preferência atual.
  const existing = Array.isArray(plan.planned_at) ? plan.planned_at : [];
  let plannedAt = existing;
  if (!existing.length) {
    plannedAt = planOccurrences(anchor, preference).map((instant) => instant.toISOString());
  } else if (preference !== plan.per_day) {
    plannedAt = mergeOccurrences(existing, maxSent, preference, now);
  }
  if (!plannedAt.length) {
    await cancelPlan(plan.id, "sem_ocorrencias");
    result.cancelled += 1;
    return result;
  }
  if (plannedAt.length !== existing.length || preference !== plan.per_day) {
    await savePlan(plan.id, plannedAt, preference);
  }

  // Horário silencioso: a entrega espera a próxima janela útil.
  if (isQuietHour(now)) {
    result.skipped += 1;
    return result;
  }

  const due = dueOccurrenceIndices(plannedAt, now, sent);
  if (!due.length) {
    result.skipped += 1;
    return result;
  }

  // No máximo um lembrete por plano por execução (nunca dispara tudo junto).
  const occurrence = due[0];

  const { data: subData } = await service
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("id", plan.subscription_id)
    .maybeSingle();
  const subscription = (subData as SubscriptionRow | null) ?? null;
  if (!subscription) {
    await cancelPlan(plan.id, "dispositivo_removido");
    result.cancelled += 1;
    return result;
  }

  const claimId = await claimDelivery(plan.notification_id, subscription.id, occurrence);
  if (!claimId) {
    result.skipped += 1;
    return result;
  }

  const payload = JSON.stringify(buildReminderPayload(record, occurrence));
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      payload,
    );
    result.sent += 1;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await service.from("push_subscriptions").delete().eq("id", subscription.id);
      result.expired += 1;
    } else {
      await service.from("push_deliveries").delete().eq("id", claimId);
      result.failed += 1;
    }
  }

  return result;
}

async function runReminders(): Promise<Record<string, unknown>> {
  const now = new Date();
  const { data: plansData, error } = await service
    .from("push_reminder_plans")
    .select(
      "id, notification_id, user_id, subscription_id, per_day, anchor_at, planned_at, status",
    )
    .in("status", ["planned", "active"])
    .order("anchor_at", { ascending: true })
    .limit(MAX_PLANS_PER_RUN);

  if (error) return { error: error.message, plans: 0 };

  const plans = (plansData ?? []) as PlanRow[];
  const totals = { sent: 0, skipped: 0, cancelled: 0, expired: 0, failed: 0 };

  for (const plan of plans) {
    const result = await processPlan(plan, now);
    totals.sent += result.sent;
    totals.skipped += result.skipped;
    totals.cancelled += result.cancelled;
    totals.expired += result.expired;
    totals.failed += result.failed;
  }

  return { plans: plans.length, ...totals, at: now.toISOString() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true }, 200);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!(await authorized(req))) return json({ error: "unauthorized" }, 401);

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json({ error: "vapid_not_configured" }, 503);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const result = await runReminders();
  return json(result, 200);
});
