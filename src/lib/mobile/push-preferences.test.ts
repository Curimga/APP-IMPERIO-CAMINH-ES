import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = vi.hoisted(() => ({
  selectData: null as { user_id: string; reminders_per_day: number; updated_at: string } | null,
  selectError: null as { message: string } | null,
  upsertError: null as { message: string } | null,
  upsertArgs: [] as { row: unknown; options: unknown }[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockState.selectData, error: mockState.selectError }),
        }),
      }),
      upsert: async (row: unknown, options: unknown) => {
        mockState.upsertArgs.push({ row, options });
        return { error: mockState.upsertError };
      },
    }),
  },
}));

import {
  DEFAULT_REMINDERS_PER_DAY,
  REMINDERS_PER_DAY_OPTIONS,
  normalizeRemindersPerDay,
  readPushPreference,
  remindersPerDayDescription,
  remindersPerDayLabel,
  writePushPreference,
} from "./push-preferences";

const USER = "11111111-1111-1111-1111-111111111111";

describe("opções de lembretes por dia", () => {
  it("oferece 0, 1, 2 e 3", () => {
    expect([...REMINDERS_PER_DAY_OPTIONS]).toEqual([0, 1, 2, 3]);
  });

  it("usa 0 como padrão", () => {
    expect(DEFAULT_REMINDERS_PER_DAY).toBe(0);
  });

  it("normaliza valores inválidos para 0", () => {
    expect(normalizeRemindersPerDay(7)).toBe(0);
    expect(normalizeRemindersPerDay(-2)).toBe(0);
    expect(normalizeRemindersPerDay("x")).toBe(0);
    expect(normalizeRemindersPerDay(undefined)).toBe(0);
  });

  it("mantém os valores válidos", () => {
    expect(normalizeRemindersPerDay(0)).toBe(0);
    expect(normalizeRemindersPerDay(1)).toBe(1);
    expect(normalizeRemindersPerDay(2)).toBe(2);
    expect(normalizeRemindersPerDay(3)).toBe(3);
    expect(normalizeRemindersPerDay("3")).toBe(3);
  });

  it("descreve cada opção para o usuário", () => {
    expect(remindersPerDayLabel(0)).toBe("0");
    expect(remindersPerDayLabel(3)).toBe("3");
    expect(remindersPerDayDescription(0)).toContain("apenas o aviso original");
    expect(remindersPerDayDescription(2)).toContain("2 lembretes por dia");
  });
});

describe("preferência guardada no banco (sincroniza entre aparelhos)", () => {
  beforeEach(() => {
    mockState.selectData = null;
    mockState.selectError = null;
    mockState.upsertError = null;
    mockState.upsertArgs = [];
  });

  it("lê a preferência do usuário no banco", async () => {
    mockState.selectData = {
      user_id: USER,
      reminders_per_day: 2,
      updated_at: "2026-03-10T12:00:00Z",
    };
    const state = await readPushPreference(USER);
    expect(state).toEqual({ value: 2, available: true });
  });

  it("devolve 0 quando ainda não há preferência salva", async () => {
    const state = await readPushPreference(USER);
    expect(state).toEqual({ value: 0, available: true });
  });

  it("degrada sem quebrar quando a tabela ainda não existe", async () => {
    mockState.selectError = { message: "relation does not exist" };
    const state = await readPushPreference(USER);
    expect(state).toEqual({ value: 0, available: false });
  });

  it("grava com upsert na própria linha do usuário", async () => {
    const result = await writePushPreference(USER, 3);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(3);
    expect(mockState.upsertArgs).toHaveLength(1);
    expect(mockState.upsertArgs[0].row).toMatchObject({ user_id: USER, reminders_per_day: 3 });
    expect(mockState.upsertArgs[0].options).toEqual({ onConflict: "user_id" });
  });

  it("normaliza antes de gravar", async () => {
    const result = await writePushPreference(USER, 9 as never);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    expect(mockState.upsertArgs[0].row).toMatchObject({ reminders_per_day: 0 });
  });

  it("reporta falha sem quebrar a tela", async () => {
    mockState.upsertError = { message: "sem permissão" };
    const result = await writePushPreference(USER, 1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(0);
  });
});
