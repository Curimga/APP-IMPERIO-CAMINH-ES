import { describe, it, expect } from "vitest";
import { dateOnly, spaToUtcISO, isoToSpaISO } from "./dates";

/**
 * Correção da auditoria funcional — datas.
 *
 * Regras do CRM:
 *  - colunas `date` (expected_at, completed_at, occurred_at, paid_at...)
 *    recebem APENAS "YYYY-MM-DD";
 *  - colunas `timestamptz` (calendar_events.starts_at) recebem o instante
 *    UTC convertido da hora local do usuário (`new Date(...).toISOString()`).
 *
 * Os testes usam apenas invariantes que não dependem do fuso da máquina
 * (ida e volta local → UTC → local preserva o relógio de parede).
 */

describe("dateOnly — colunas date nunca recebem datetime", () => {
  it("recorta T12:00:00 (bug do formulário de serviço/despesa)", () => {
    expect(dateOnly("2026-09-25T12:00:00")).toBe("2026-09-25");
  });

  it("recorta ISO completo com milissegundos e Z", () => {
    expect(dateOnly("2026-09-25T12:34:56.789Z")).toBe("2026-09-25");
  });

  it("preserva data pura", () => {
    expect(dateOnly("2026-09-25")).toBe("2026-09-25");
  });

  it("null/undefined/vazio → null", () => {
    expect(dateOnly(null)).toBeNull();
    expect(dateOnly(undefined)).toBeNull();
    expect(dateOnly("")).toBeNull();
  });
});

describe("spaToUtcISO — hora local vira instante UTC (contrato do CRM)", () => {
  it("sempre produz uma ISO com fuso Z", () => {
    expect(spaToUtcISO("2026-09-25T09:30:00")).toMatch(/Z$/);
    expect(spaToUtcISO("2026-09-25T09:30:00").startsWith("2026-09-25T")).toBe(true);
  });

  it("round-trip local → UTC → local preserva o relógio de parede", () => {
    expect(isoToSpaISO(spaToUtcISO("2026-09-25T09:30:00"))).toBe("2026-09-25T09:30:00");
    expect(isoToSpaISO(spaToUtcISO("2026-12-31T23:59:00"))).toBe("2026-12-31T23:59:00");
  });

  it("mantém a ordem cronológica entre horas do mesmo dia", () => {
    const early = spaToUtcISO("2026-09-25T09:00:00");
    const late = spaToUtcISO("2026-09-25T10:00:00");
    expect(early < late).toBe(true);
  });

  it("strings já em UTC passam normalizadas (sem dobrar o fuso)", () => {
    const already = "2026-09-25T12:00:00.000Z";
    expect(spaToUtcISO(already)).toBe(already);
    expect(isoToSpaISO(spaToUtcISO(already))).toBe(isoToSpaISO(already));
  });
});

describe("isoToSpaISO — edição sem deslocamento de um dia", () => {
  it("uma ISO gravada em UTC volta como hora local", () => {
    const out = isoToSpaISO("2026-09-25T12:00:00.000Z");
    expect(out).toMatch(/^2026-09-25T\d{2}:\d{2}:\d{2}$/);
    expect(out.slice(11, 13)).toBe(String(isoToSpaISO(spaToUtcISO("2026-09-25T09:00:00")).slice(11, 13)));
  });

  it("não altera a data em dias normais (mesmo instante, mesmo dia local)", () => {
    const iso = spaToUtcISO("2026-09-25T09:00:00");
    expect(isoToSpaISO(iso).slice(0, 10)).toBe("2026-09-25");
  });

  it("null/undefined → string vazia (estado inicial do form)", () => {
    expect(isoToSpaISO(null)).toBe("");
    expect(isoToSpaISO(undefined)).toBe("");
  });
});