import { describe, it, expect } from "vitest";
import {
  DEFAULT_REMINDERS_PER_DAY,
  QUIET_HOUR_END,
  QUIET_HOUR_START,
  REMINDER_TIMEZONE,
  REMINDER_WINDOWS_LOCAL,
  buildReminderPayload,
  dueOccurrenceIndices,
  isPlanExpired,
  isQuietHour,
  isReminderStillPending,
  mergeOccurrences,
  normalizeRemindersPerDay,
  planOccurrences,
  resolveReminderEntity,
  zonedParts,
} from "../../../supabase/functions/push-reminders/logic";

const PAYABLE_ID = "11111111-1111-1111-1111-111111111111";
const EVENT_ID = "22222222-2222-2222-2222-222222222222";

/** Hora local (São Paulo) de um instante UTC. */
function localHour(iso: string): number {
  return zonedParts(new Date(iso)).hour;
}

/** Data local (São Paulo) de um instante UTC, no formato AAAA-MM-DD. */
function localDate(iso: string): string {
  const parts = zonedParts(new Date(iso));
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

describe("preferência de lembretes por dia", () => {
  it("aceita as opções 0, 1, 2 e 3", () => {
    expect(normalizeRemindersPerDay(0)).toBe(0);
    expect(normalizeRemindersPerDay(1)).toBe(1);
    expect(normalizeRemindersPerDay(2)).toBe(2);
    expect(normalizeRemindersPerDay(3)).toBe(3);
  });

  it("aceita valores vindos do banco como texto", () => {
    expect(normalizeRemindersPerDay("3")).toBe(3);
    expect(normalizeRemindersPerDay("0")).toBe(0);
  });

  it("cai para o padrão (0) quando o valor é inválido", () => {
    expect(normalizeRemindersPerDay(4)).toBe(DEFAULT_REMINDERS_PER_DAY);
    expect(normalizeRemindersPerDay(-1)).toBe(DEFAULT_REMINDERS_PER_DAY);
    expect(normalizeRemindersPerDay(null)).toBe(DEFAULT_REMINDERS_PER_DAY);
    expect(normalizeRemindersPerDay(undefined)).toBe(DEFAULT_REMINDERS_PER_DAY);
    expect(normalizeRemindersPerDay(Number.NaN)).toBe(DEFAULT_REMINDERS_PER_DAY);
    expect(normalizeRemindersPerDay("abc")).toBe(DEFAULT_REMINDERS_PER_DAY);
    expect(normalizeRemindersPerDay(2.7)).toBe(2);
  });
});

describe("distribuição dos lembretes (America/Sao_Paulo)", () => {
  it("não agenda nada quando o usuário não quer lembretes", () => {
    expect(planOccurrences(new Date("2026-03-10T12:00:00Z"), 0)).toEqual([]);
  });

  it("agenda a quantidade pedida, em horários distintos e futuros", () => {
    const anchor = new Date("2026-03-10T12:00:00Z"); // 09:00 local
    const planned = planOccurrences(anchor, 3);

    expect(planned).toHaveLength(3);
    expect(planned.every((date) => date.getTime() > anchor.getTime())).toBe(true);

    const hours = planned.map((date) => zonedParts(date).hour);
    expect(new Set(hours).size).toBe(3);
    expect([...hours].sort((a, b) => a - b)).toEqual(hours);
    expect(hours.every((hour) => (REMINDER_WINDOWS_LOCAL as readonly number[]).includes(hour))).toBe(
      true,
    );
  });

  it("usa as janelas locais na ordem (9h, 12h, 15h, 18h, 20h)", () => {
    const planned = planOccurrences(new Date("2026-03-10T12:00:00Z"), 3);
    expect(planned.map((date) => zonedParts(date).hour)).toEqual([12, 15, 18]);
  });

  it("nunca agenda dentro do horário silencioso", () => {
    const anchor = new Date("2026-03-10T01:30:00Z"); // 22:30 local do dia anterior
    const planned = planOccurrences(anchor, 3);
    for (const date of planned) {
      const hour = zonedParts(date).hour;
      expect(hour < QUIET_HOUR_START || hour >= QUIET_HOUR_END).toBe(true);
      expect(isQuietHour(date)).toBe(false);
    }
  });

  it("começa no dia seguinte quando o aviso nasce à noite", () => {
    const anchor = new Date("2026-03-10T01:30:00Z"); // 22:30 local de 09/03
    const planned = planOccurrences(anchor, 1);
    expect(localDate(planned[0].toISOString())).toBe("2026-03-10");
    expect(localHour(planned[0].toISOString())).toBe(9);
  });

  it("respeita o fuso: 9h local corresponde a 12h UTC", () => {
    const planned = planOccurrences(new Date("2026-03-10T12:00:00Z"), 1);
    expect(planned[0].toISOString()).toBe("2026-03-10T15:00:00.000Z");
    expect(localHour(planned[0].toISOString())).toBe(12);
  });

  it("reconhece o horário silencioso (21h às 08h)", () => {
    expect(isQuietHour(new Date("2026-03-10T00:00:00Z"))).toBe(true); // 21h local
    expect(isQuietHour(new Date("2026-03-10T10:30:00Z"))).toBe(true); // 07h30 local
    expect(isQuietHour(new Date("2026-03-10T12:00:00Z"))).toBe(false); // 09h local
    expect(isQuietHour(new Date("2026-03-10T22:59:00Z"))).toBe(false); // 19h59 local
  });

  it("usa o fuso de São Paulo", () => {
    expect(REMINDER_TIMEZONE).toBe("America/Sao_Paulo");
  });
});

describe("resolução da entidade do aviso", () => {
  it("reconhece conta a pagar", () => {
    expect(resolveReminderEntity(`/financeiro/contas-pagar?id=${PAYABLE_ID}`, "financeiro")).toEqual({
      kind: "payable",
      table: "payables",
      id: PAYABLE_ID,
    });
  });

  it("reconhece conta a receber", () => {
    expect(
      resolveReminderEntity(`/financeiro/contas-receber?id=${PAYABLE_ID}`, "financeiro"),
    ).toEqual({ kind: "receivable", table: "receivables", id: PAYABLE_ID });
  });

  it("reconhece compromisso da agenda", () => {
    expect(resolveReminderEntity(`/agenda?id=${EVENT_ID}`, "agenda")).toEqual({
      kind: "event",
      table: "calendar_events",
      id: EVENT_ID,
    });
  });

  it("reconhece serviço de manutenção", () => {
    expect(resolveReminderEntity(`/servicos?id=${EVENT_ID}`, "manutencao")).toEqual({
      kind: "service",
      table: "services",
      id: EVENT_ID,
    });
  });

  it("não resolve link sem id de entidade (nada de lembrete)", () => {
    expect(resolveReminderEntity("/perfil", "sistema")).toBeNull();
    expect(resolveReminderEntity("/financeiro/contas-pagar", "financeiro")).toBeNull();
    expect(resolveReminderEntity(`/financeiro/contas-pagar?id=abc`, "financeiro")).toBeNull();
    expect(resolveReminderEntity(null, "financeiro")).toBeNull();
  });

  it("não resolve quando o tipo não bate com o link", () => {
    expect(resolveReminderEntity(`/agenda?id=${EVENT_ID}`, "financeiro")).toBeNull();
    expect(resolveReminderEntity(`/financeiro/contas-pagar?id=${PAYABLE_ID}`, "agenda")).toBeNull();
  });
});

describe("aviso continua pendente?", () => {
  const now = new Date("2026-03-10T12:00:00Z");

  it("conta a pagar: aberto e vencido continuam, pago e cancelado encerram", () => {
    expect(isReminderStillPending({ kind: "payable", status: "aberto", now })).toBe(true);
    expect(isReminderStillPending({ kind: "payable", status: "vencido", now })).toBe(true);
    expect(isReminderStillPending({ kind: "payable", status: "pago", now })).toBe(false);
    expect(isReminderStillPending({ kind: "payable", status: "cancelado", now })).toBe(false);
  });

  it("conta a receber: recebido encerra", () => {
    expect(isReminderStillPending({ kind: "receivable", status: "aberto", now })).toBe(true);
    expect(isReminderStillPending({ kind: "receivable", status: "vencido", now })).toBe(true);
    expect(isReminderStillPending({ kind: "receivable", status: "recebido", now })).toBe(false);
    expect(isReminderStillPending({ kind: "receivable", status: "cancelado", now })).toBe(false);
  });

  it("compromisso: continua enquanto não começou", () => {
    expect(
      isReminderStillPending({ kind: "event", startsAt: "2026-03-11T12:00:00Z", now }),
    ).toBe(true);
    expect(
      isReminderStillPending({ kind: "event", startsAt: "2026-03-10T11:00:00Z", now }),
    ).toBe(false);
    expect(isReminderStillPending({ kind: "event", startsAt: null, now })).toBe(false);
  });

  it("serviço: pendente e em_andamento continuam, concluído e cancelado encerram", () => {
    expect(isReminderStillPending({ kind: "service", status: "pendente", now })).toBe(true);
    expect(isReminderStillPending({ kind: "service", status: "em_andamento", now })).toBe(true);
    expect(isReminderStillPending({ kind: "service", status: "concluido", now })).toBe(false);
    expect(isReminderStillPending({ kind: "service", status: "cancelado", now })).toBe(false);
  });
});

describe("entrega sem duplicar (idempotência por ocorrência)", () => {
  const planned = ["2026-03-10T15:00:00.000Z", "2026-03-10T18:00:00.000Z", "2026-03-11T12:00:00.000Z"];

  it("lista apenas as ocorrências vencidas e não entregues", () => {
    const now = new Date("2026-03-10T18:05:00Z");
    expect(dueOccurrenceIndices(planned, now, new Set())).toEqual([1, 2]);
  });

  it("ignora as ocorrências já entregues", () => {
    const now = new Date("2026-03-10T18:05:00Z");
    expect(dueOccurrenceIndices(planned, now, new Set([1]))).toEqual([2]);
    expect(dueOccurrenceIndices(planned, now, new Set([1, 2]))).toEqual([]);
  });

  it("não entrega a ocorrência futura", () => {
    const now = new Date("2026-03-10T15:30:00Z");
    expect(dueOccurrenceIndices(planned, now, new Set())).toEqual([1]);
  });

  it("cada lembrete tem tag própria e mantém o id do aviso", () => {
    const payload = buildReminderPayload(
      {
        id: "abc-123",
        title: "Pagamento em atraso",
        message: "Conta em atraso",
        link: `/financeiro/contas-pagar?id=${PAYABLE_ID}`,
        type: "financeiro",
      },
      2,
    );
    expect(payload.tag).toBe("lembrete-abc-123-2");
    expect(payload.notificationId).toBe("abc-123");
    expect(payload.isReminder).toBe(true);
    expect(payload.title).toBe("Pagamento em atraso");
  });
});

describe("ajuste do plano quando a preferência muda", () => {
  const existing = ["2026-03-10T15:00:00.000Z", "2026-03-10T18:00:00.000Z", "2026-03-10T21:00:00.000Z"];

  it("aumenta a quantidade mantendo o que já foi entregue", () => {
    const merged = mergeOccurrences(existing, 1, 3, new Date("2026-03-10T19:00:00Z"));
    expect(merged).toHaveLength(3);
    expect(merged[0]).toBe(existing[0]);
    expect(merged[1]).toBeDefined();
    expect(merged[2]).toBeDefined();
  });

  it("reduz a quantidade quando o usuário baixa a preferência", () => {
    const merged = mergeOccurrences(existing, 0, 1, new Date("2026-03-10T19:00:00Z"));
    expect(merged).toHaveLength(1);
    // 19:00Z = 16:00 local -> próxima janela livre é 18h local.
    expect(localHour(merged[0])).toBe(18);
  });

  it("zerando a preferência remove as ocorrências", () => {
    expect(mergeOccurrences(existing, 2, 0, new Date("2026-03-10T19:00:00Z"))).toEqual([]);
  });
});

describe("validade do plano", () => {
  it("expira depois de 7 dias", () => {
    const anchor = new Date("2026-03-01T12:00:00Z");
    expect(isPlanExpired(anchor, new Date("2026-03-05T12:00:00Z"))).toBe(false);
    expect(isPlanExpired(anchor, new Date("2026-03-10T12:00:00Z"))).toBe(true);
  });
});
