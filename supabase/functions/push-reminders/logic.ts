/**
 * Núcleo puro da Edge Function push-reminders — sem Deno, sem rede, sem banco.
 *
 * Isola as regras de negócio dos lembretes para que possam ser revisadas e
 * testadas por Vitest (src/lib/mobile/push-reminders.test.ts) sem subir o
 * runtime do Supabase:
 *
 *  - distribuição dos lembretes durante o dia no fuso America/Sao_Paulo;
 *  - respeito ao horário silencioso;
 *  - resolução da entidade "ainda pendente" a partir do link do aviso;
 *  - cancelamento quando o evento deixa de estar pendente;
 *  - seleção das ocorrências vencidas e já entregues (idempotência).
 *
 * A entrega em si (Web Push) fica em index.ts, junto do registro de entrega.
 */

import type { NotificationRecord } from "../push-send/logic.ts";

/** Fuso usado para distribuir os lembretes e respeitar o silêncio. */
export const REMINDER_TIMEZONE = "America/Sao_Paulo";

/**
 * Janelas locais (hora cheia) em que um lembrete pode ser entregue.
 * Todas ficam fora do horário silencioso e evitam concentration no mesmo
 * instante (o 1º, 2º e 3º lembretes saem em horários distintos).
 */
export const REMINDER_WINDOWS_LOCAL = [9, 12, 15, 18, 20] as const;

/** Horário silencioso: das 21:00 às 08:00 (America/Sao_Paulo). */
export const QUIET_HOUR_START = 21;
export const QUIET_HOUR_END = 8;

/** Opções oferecidas ao usuário. */
export const REMINDERS_PER_DAY_OPTIONS = [0, 1, 2, 3] as const;
export type RemindersPerDay = (typeof REMINDERS_PER_DAY_OPTIONS)[number];

/** Padrão: nenhum lembrete repetido até o usuário escolher. */
export const DEFAULT_REMINDERS_PER_DAY: RemindersPerDay = 0;

/** Um plano de lembrete expira depois deste tempo (evita spam de aviso antigo). */
export const REMINDER_MAX_AGE_DAYS = 7;

export function normalizeRemindersPerDay(value: unknown): RemindersPerDay {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_REMINDERS_PER_DAY;
  const truncated = Math.trunc(numeric);
  return (REMINDERS_PER_DAY_OPTIONS as readonly number[]).includes(truncated)
    ? (truncated as RemindersPerDay)
    : DEFAULT_REMINDERS_PER_DAY;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: REMINDER_TIMEZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Partes de data/hora do instante no fuso de São Paulo. */
export function zonedParts(date: Date): ZonedParts {
  const map: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // en-US pode devolver "24" para meia-noite.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function zoneOffsetMs(date: Date): number {
  const parts = zonedParts(date);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

/** Converte uma hora de parede local (São Paulo) no instante UTC correspondente. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = zoneOffsetMs(new Date(naive));
  const firstGuess = naive - firstOffset;
  // Refino: o primeiro cálculo usa o offset aproximado do instante.
  const offset = zoneOffsetMs(new Date(firstGuess));
  return new Date(naive - offset);
}

/** true quando o instante cai no horário silencioso (21:00–07:59 local). */
export function isQuietHour(date: Date): boolean {
  const { hour } = zonedParts(date);
  return hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END;
}

/**
 * Calcula os instantes dos lembretes de um aviso.
 *
 * Regras:
 *  - 0 lembrete -> lista vazia;
 *  - os lembretes saem em janelas distintas (9h, 12h, 15h, 18h, 20h local),
 *    nunca todos de uma vez;
 *  - nada é agendado para antes do aviso nem dentro do horário silencioso;
 *  - se o dia atual não tem janelas suficientes, continua no dia seguinte
 *    (mantendo o limite de lembretes por dia).
 */
export function planOccurrences(
  anchor: Date,
  perDay: number,
  options: { maxDays?: number } = {},
): Date[] {
  const count = normalizeRemindersPerDay(perDay);
  if (count === 0) return [];

  const maxDays = options.maxDays ?? 4;
  const start = zonedParts(anchor);
  const anchorMs = anchor.getTime();
  const planned: Date[] = [];

  for (let dayOffset = 0; dayOffset < maxDays && planned.length < count; dayOffset += 1) {
    for (const hour of REMINDER_WINDOWS_LOCAL) {
      const instant = zonedTimeToUtc(start.year, start.month, start.day + dayOffset, hour, 0);
      if (instant.getTime() <= anchorMs) continue;
      planned.push(instant);
      if (planned.length >= count) break;
    }
  }

  return planned;
}

/**
 * Replaneja as ocorrências quando o usuário muda a quantidade.
 * As ocorrências já entregues mantêm horário e índice; as novas entram depois.
 */
export function mergeOccurrences(
  existing: readonly string[],
  sentCount: number,
  perDay: number,
  now: Date,
): string[] {
  const count = normalizeRemindersPerDay(perDay);
  if (count === 0) return [];

  const keepCount = Math.min(Math.max(0, sentCount), count);
  const keep = existing.slice(0, keepCount);
  const missing = count - keep.length;
  if (missing <= 0) return keep;

  const future = planOccurrences(now, missing);
  return [...keep, ...future.map((instant) => instant.toISOString())];
}

export type ReminderEntityKind = "payable" | "receivable" | "event" | "service";

export interface ReminderEntity {
  kind: ReminderEntityKind;
  table: "payables" | "receivables" | "calendar_events" | "services";
  id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Descobre a qual entidade o aviso se refere, para saber se ela ainda está
 * pendente. O link é a evidência (mesma convenção usada pelo CRM):
 *
 *   /financeiro/contas-pagar?id=<uuid>   -> contas a pagar
 *   /financeiro/contas-receber?id=<uuid> -> contas a receber
 *   /agenda?id=<uuid>                     -> compromisso
 *   /servicos?id=<uuid>                  -> serviço
 *
 * Link desconhecido (ou sem id) => null: sem lembrete, porprudência.
 */
export function resolveReminderEntity(
  link: string | null | undefined,
  type: string | null | undefined,
): ReminderEntity | null {
  if (typeof link !== "string" || !link) return null;
  const normalizedType = (type ?? "").trim().toLowerCase();
  const [path, query] = link.split("?");
  const params = new URLSearchParams(query ?? "");
  const id = (
    params.get("id") ??
    params.get("event") ??
    params.get("service") ??
    ""
  ).trim();
  if (!UUID_RE.test(id)) return null;

  if (normalizedType === "financeiro") {
    if (path.startsWith("/financeiro/contas-pagar")) {
      return { kind: "payable", table: "payables", id };
    }
    if (path.startsWith("/financeiro/contas-receber")) {
      return { kind: "receivable", table: "receivables", id };
    }
    return null;
  }
  if (normalizedType === "agenda" && path.startsWith("/agenda")) {
    return { kind: "event", table: "calendar_events", id };
  }
  if (
    (normalizedType === "manutencao" || normalizedType === "servicos") &&
    path.startsWith("/servicos")
  ) {
    return { kind: "service", table: "services", id };
  }
  return null;
}

export interface ReminderPendingInput {
  kind: ReminderEntityKind;
  status?: string | null;
  startsAt?: string | null;
  now: Date;
}

/**
 * O aviso continua pendente?
 *
 *  - conta a pagar/receber: 'aberto' ou 'vencido' (pago/recebido/cancelado
 *    encerram os lembretes);
 *  - compromisso: ainda não começou;
 *  - serviço: 'pendente' ou 'em_andamento' (concluído/cancelado encerram).
 */
export function isReminderStillPending(input: ReminderPendingInput): boolean {
  const status = (input.status ?? "").trim().toLowerCase();
  switch (input.kind) {
    case "payable":
    case "receivable":
      return status === "aberto" || status === "vencido";
    case "event": {
      if (!input.startsAt) return false;
      const starts = new Date(input.startsAt);
      if (Number.isNaN(starts.getTime())) return false;
      return starts.getTime() > input.now.getTime();
    }
    case "service":
      return status === "pendente" || status === "em_andamento";
    default:
      return false;
  }
}

/**
 * Ocorrências vencidas e ainda não entregues (índices 1-based).
 * É a base da idempotência: cada par (aviso, dispositivo, ocorrência) só é
 * enviado uma vez.
 */
export function dueOccurrenceIndices(
  plannedAt: readonly string[],
  now: Date,
  sent: ReadonlySet<number>,
): number[] {
  const nowMs = now.getTime();
  const due: number[] = [];
  plannedAt.forEach((iso, index) => {
    const occurrence = index + 1;
    if (sent.has(occurrence)) return;
    const time = new Date(iso).getTime();
    if (Number.isNaN(time) || time > nowMs) return;
    due.push(occurrence);
  });
  return due;
}

/** Payload do lembrete (mesmo formato do aviso original + marcador de lembrete). */
export function buildReminderPayload(record: NotificationRecord, occurrence: number) {
  return {
    title: (record.title ?? "").trim() || "Império Caminhões",
    body: (record.message ?? "").trim(),
    link: typeof record.link === "string" ? record.link : null,
    notificationId: record.id,
    // Tag própria por ocorrência: cada lembrete aparece como aviso novo.
    tag: `lembrete-${record.id}-${occurrence}`,
    priority: record.priority ?? null,
    type: record.type ?? null,
    isReminder: true,
    occurrence,
  };
}

/** Planos muito antigos param de gerar lembretes (evita spam de aviso antigo). */
export function isPlanExpired(
  anchor: Date,
  now: Date,
  maxAgeDays: number = REMINDER_MAX_AGE_DAYS,
): boolean {
  return now.getTime() - anchor.getTime() > maxAgeDays * 24 * 60 * 60 * 1000;
}
