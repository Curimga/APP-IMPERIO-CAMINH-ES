import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { notificationLinkTarget } from "./notification-link";

/**
 * Web Push do APP Império Caminhões.
 *
 * Responsabilidades:
 *  - montar o payload exibido pelo Service Worker (mesmo formato da Edge Function);
 *  - inscrever/remover o dispositivo SOMENTE após ação explícita do usuário;
 *  - guardar a subscription vinculada ao UUID autenticado (tabela push_subscriptions);
 *  - deduplicar a exibição local por id de notificação.
 *
 * A entrega em segundo plano (app fechado) é feita pela Edge Function push-send
 * via webhook na inserção da tabela `notifications`. Este módulo NÃO é a fonte
 * da entrega em segundo plano — apenas o registro do dispositivo.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const SEEN_IDS_STORAGE_KEY = "imperio:notified-ids";
const SEEN_IDS_LIMIT = 60;

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY);
}

export function getVapidPublicKey(): string | undefined {
  return VAPID_PUBLIC_KEY;
}

type NotificationPayloadSource = {
  id: string;
  title: string;
  message?: string | null;
  link?: string | null;
  priority?: string | null;
  type?: string | null;
};

export interface PushPayload {
  title: string;
  body: string;
  link: string | null;
  notificationId: string;
  tag: string;
  priority: string | null;
  type: string | null;
}

/** Constrói o payload do SW a partir de uma notificação do banco. Pura. */
export function buildPushPayload(n: NotificationPayloadSource): PushPayload {
  const title = (n.title ?? "").trim() || "Império Caminhões";
  return {
    title,
    body: (n.message ?? "").trim(),
    link: notificationLinkTarget(n.link) ?? null,
    notificationId: n.id,
    tag: n.id,
    priority: n.priority ?? null,
    type: n.type ?? null,
  };
}

/** Decodifica a chave pública VAPID (base64url) para Uint8Array. Pura. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushSubscriptionsInsert = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  last_seen_at: string;
};

/** Converte a subscription do navegador em linha da tabela. Lança se inválida. Pura. */
export function subscriptionToRow(
  userId: string,
  subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } },
  userAgent?: string | null,
  now: string = new Date().toISOString(),
): PushSubscriptionsInsert {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Inscrição de push inválida: dados ausentes do navegador.");
  }
  return {
    user_id: userId,
    endpoint,
    p256dh,
    auth,
    user_agent: userAgent ? userAgent.slice(0, 300) : null,
    last_seen_at: now,
  };
}

type PushSubscriptionsRow = PushSubscriptionsInsert & {
  id: string;
  created_at: string;
};

type PushDatabase = {
  public: {
    Tables: {
      push_subscriptions: {
        Row: PushSubscriptionsRow;
        Insert: PushSubscriptionsInsert;
        Update: Partial<PushSubscriptionsInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Acesso à `push_subscriptions`. A tabela é criada no projeto do CRM
 * (ver docs/PUSH-NOTIFICACOES.md) e não faz parte de types.ts, que é cópia
 * verbatim do CRM — por isso o cliente é tipado localmente aqui.
 */
const pushDb = supabase as unknown as SupabaseClient<PushDatabase>;

export function isPushSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function needsIosInstallHint(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.ready;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/** Grava/atualiza a subscription do usuário (RLS exige user_id = auth.uid()). */
export async function saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  const row = subscriptionToRow(userId, subscription.toJSON(), navigator.userAgent);
  const { error } = await pushDb
    .from("push_subscriptions")
    .upsert(row, { onConflict: "user_id,endpoint" });
  if (error) throw new Error(error.message);
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  const { error } = await pushDb
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

export type PushEnableReason =
  | "unsupported"
  | "not_configured"
  | "denied"
  | "insecure"
  | "error";

export type PushEnableResult =
  | { ok: true; background: boolean }
  | { ok: false; reason: PushEnableReason; message: string };

/** Mensagem ao usuário para cada motivo de falha na ativação. Pura. */
export function pushEnableMessage(reason: PushEnableReason): string {
  switch (reason) {
    case "unsupported":
      return "Este navegador não suporta notificações push.";
    case "not_configured":
      return "As notificações ainda não foram configuradas no servidor.";
    case "denied":
      return "As notificações estão bloqueadas. Libere nas configurações do navegador.";
    case "insecure":
      return "É necessário usar HTTPS para ativar as notificações.";
    default:
      return "Não foi possível ativar as notificações neste aparelho.";
  }
}

function isInsecureContext() {
  if (typeof window === "undefined") return false;
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return !window.isSecureContext && !isLocalhost;
}

/**
 * Ativa as notificações: pede permissão (ação explícita do usuário) e, quando
 * o servidor está configurado, inscreve no PushManager e salva a subscription
 * vinculada ao UUID autenticado. Sem VAPID configurado, habilita apenas o
 * aviso com o app aberto (complemento) e informa que a entrega em segundo
 * plano depende da configuração no servidor.
 */
export async function enablePush(userId: string): Promise<PushEnableResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported", message: pushEnableMessage("unsupported") };
  }
  if (isInsecureContext()) {
    return { ok: false, reason: "insecure", message: pushEnableMessage("insecure") };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied", message: pushEnableMessage("denied") };
    }

    const vapidKey = getVapidPublicKey();
    if (!vapidKey) return { ok: true, background: false };

    const registration = await getRegistration();
    if (!registration) {
      return { ok: false, reason: "unsupported", message: pushEnableMessage("unsupported") };
    }

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      }));

    await saveSubscription(userId, subscription);
    return { ok: true, background: true };
  } catch {
    return { ok: false, reason: "error", message: pushEnableMessage("error") };
  }
}

/** Desativa no aparelho: remove a linha do banco e cancela a subscription. */
export async function disablePush(userId: string): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  try {
    await removeSubscription(userId, subscription.endpoint);
  } catch {
    /* best-effort: a subscription será removida na próxima limpeza de expiradas */
  }
  try {
    await subscription.unsubscribe();
  } catch {
    /* ignora */
  }
}

/** Reafirma a subscription existente no banco (last_seen) ao abrir o app. */
export async function syncSubscription(userId: string): Promise<boolean> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return false;
  try {
    await saveSubscription(userId, subscription);
    return true;
  } catch {
    return false;
  }
}

/** Remove do banco a subscription do usuário que saiu (aparelho compartilhado). */
export async function releaseSubscription(userId: string): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  await removeSubscription(userId, subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

function readSeenIds(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_IDS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function loadSeenIds(): string[] {
  return readSeenIds();
}

export function saveSeenIds(ids: string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SEEN_IDS_STORAGE_KEY, JSON.stringify(pruneSeenIds(ids)));
  } catch {
    /* armazenamento indisponível */
  }
}

/** Mantém apenas os últimos ids (evita crescimento infinito). Pura. */
export function pruneSeenIds(ids: string[], max = SEEN_IDS_LIMIT): string[] {
  return Array.from(new Set(ids)).slice(-max);
}

/** Notificações ainda não exibidas (não lidas e fora do conjunto visto). Pura. */
export function selectNewNotifications<T extends { id: string; read?: boolean | null }>(
  items: T[],
  seenIds: Iterable<string>,
): T[] {
  const seen = new Set(seenIds);
  return items.filter((item) => !item.read && !seen.has(item.id));
}
