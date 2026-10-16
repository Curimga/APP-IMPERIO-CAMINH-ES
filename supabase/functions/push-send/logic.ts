/**
 * Núcleo puro da Edge Function push-send — sem Deno, sem rede, sem banco.
 *
 * Isolado aqui para ser revisado e testado por Vitest (src/lib/mobile/push-server.test.ts)
 * sem subir o runtime do Supabase. É a ÚNICA fonte das regras de autenticação do
 * webhook e de autorização de notificações financeiras.
 */

export interface NotificationRecord {
  id: string;
  title: string;
  message?: string | null;
  link?: string | null;
  priority?: string | null;
  type?: string | null;
  user_id?: string | null;
}

/**
 * Lista de bloqueio financeiro (hard deny). Mesma regra de src/lib/mobile/perm.ts.
 * Quem estiver aqui NUNCA recebe notificação financeira, nem como admin nem com
 * permissão individual.
 */
export const FINANCE_BLOCKED_EMAILS = new Set(["josemar.essing@gmail.com"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Converte a variável de ambiente de UUIDs individuais em um Set.
 * Ignora valores vazios ou que não sejam UUID — nunca "liga" uma permissão por
 * nome/e-mail, apenas por identificador imutável (`auth.users.id`).
 */
export function parseUserIdList(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(/[\s,;]+/)
      .map((value) => value.trim().toLowerCase())
      .filter((value) => UUID_RE.test(value)),
  );
}

async function sha256(text: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(digest);
}

/**
 * Comparação constante: ambos os lados viram SHA-256 (32 bytes) antes do XOR,
 * então o tempo não depende do tamanho nem do conteúdo do segredo informado.
 */
export async function secretsMatch(provided: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(provided), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export type AuthDecision =
  | { kind: "continue" }
  | { kind: "response"; status: number; body: Record<string, unknown> };

/**
 * Portão de entrada do webhook. Decide o status HTTP ANTES de qualquer outra
 * checagem, para que uma requisição sem o cabeçalho ou com segredo incorreto
 * receba 401 mesmo que VAPID/banco ainda não estejam configurados.
 *
 *  - OPTIONS  -> 200 (CORS)
 *  - != POST  -> 405
 *  - sem PUSH_WEBHOOK_SECRET configurado -> 503 (fail closed)
 *  - cabeçalho ausente/incorreto -> 401
 *  - VAPID ausente -> 503
 */
export async function authorizeRequest(input: {
  method: string;
  providedSecret?: string | null;
  expectedSecret?: string | null;
  vapidConfigured: boolean;
}): Promise<AuthDecision> {
  const method = input.method.toUpperCase();
  if (method === "OPTIONS") return { kind: "response", status: 200, body: { ok: true } };
  if (method !== "POST") {
    return { kind: "response", status: 405, body: { error: "method_not_allowed" } };
  }
  if (!input.expectedSecret) {
    return { kind: "response", status: 503, body: { error: "webhook_secret_not_configured" } };
  }
  if (!(await secretsMatch(input.providedSecret ?? "", input.expectedSecret))) {
    return { kind: "response", status: 401, body: { error: "unauthorized" } };
  }
  if (!input.vapidConfigured) {
    return { kind: "response", status: 503, body: { error: "vapid_not_configured" } };
  }
  return { kind: "continue" };
}

export function isFinancialNotification(n: NotificationRecord): boolean {
  if (typeof n.link === "string" && n.link.startsWith("/financeiro")) return true;
  const text = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase();
  return (
    /(r\$|us\$|ca\$\.\$)|\b(dinheiro|pagamento|recebimento|vencimento)\b/.test(text) ||
    /(conta a (pagar|receber)|conta em atraso|boleto|parcela|comissão|comissao|saldo bancário|despesa)/.test(
      text,
    )
  );
}

export function extractRecord(body: unknown): NotificationRecord | null {
  if (!body || typeof body !== "object") return null;
  const candidate =
    (body as { record?: unknown }).record ??
    (body as { notification?: unknown }).notification ??
    body;
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Partial<NotificationRecord>;
  if (typeof record.id !== "string" || typeof record.title !== "string") return null;
  return record as NotificationRecord;
}

export function buildPayload(record: NotificationRecord) {
  return {
    title: (record.title ?? "").trim() || "Império Caminhões",
    body: (record.message ?? "").trim(),
    link: typeof record.link === "string" ? record.link : null,
    notificationId: record.id,
    tag: record.id,
    priority: record.priority ?? null,
    type: record.type ?? null,
  };
}

/**
 * Autorização de notificação financeira.
 *
 * Regra explícita, sem depender de cargo de administrador:
 *   1. e-mail na lista de bloqueio -> NEGADO (hard deny);
 *   2. administrador -> PERMITIDO;
 *   3. UUID individual autorizado -> PERMITIDO;
 *   4. caso contrário -> NEGADO.
 */
export function isFinancialRecipientAllowed(input: {
  isAdmin: boolean;
  email?: string | null;
  userId: string;
  individualUserIds: ReadonlySet<string>;
}): boolean {
  const { isAdmin, email, userId, individualUserIds } = input;
  if (FINANCE_BLOCKED_EMAILS.has((email ?? "").toLowerCase())) return false;
  if (isAdmin) return true;
  return individualUserIds.has(userId);
}
