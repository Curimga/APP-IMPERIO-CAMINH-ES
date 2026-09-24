import { describe, it, expect } from "vitest";
import { addMonths, buildPayableRows, buildReceivableRows, type PaymentInput } from "./payment-rows";

/**
 * Correção da auditoria funcional — lançamentos financeiros.
 *
 * ANTES não existia ação de criação de pagamento: o botão "+" não fazia nada.
 * AGORA `createPayable`/`createReceivable` gravam linhas via estes builders —
 * 1..24 parcelas, uma linha por parcela, valor quotal, vencimento mensal.
 */

const base: PaymentInput = {
  kind: "pagar",
  description: " Troca de embreagem ",
  amount: 600,
  due_date: "2026-09-15",
  occurred_at: "2026-09-01",
  payment_method: "PIX",
};

const today = "2026-09-24"; // criado_por = usuário; usamos um id fixo

it("addMonths avança mês a mês e segura o fim de mês", () => {
  expect(addMonths("2026-09-15", 0)).toBe("2026-09-15");
  expect(addMonths("2026-09-15", 1)).toBe("2026-10-15");
  expect(addMonths("2026-09-15", 2)).toBe("2026-11-15");
  expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  expect(addMonths("2026-12-31", 1)).toBe("2027-01-31");
});

describe("buildPayableRows", () => {
  it("parcela única: uma linha, aberta, reverter o quotal, sem ocorrência extra", () => {
    const rows = buildPayableRows({ ...base, installments: 1 }, today);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      amount: 600,
      description: "Troca de embreagem",
      due_date: "2026-09-15",
      occurred_at: "2026-09-01",
      status: "aberto",
      occurrence_number: 1,
      created_by: today,
      supplier: null,
      category_id: null,
      truck_id: null,
      bank_account_id: null,
    });
  });

  it("3 parcelas: 3 linhas com vencimentos mensais e quota 200", () => {
    const rows = buildPayableRows({ ...base, amount: 599.99, installments: 3 }, today);
    expect(rows).toHaveLength(3);
    expect(rows[0].due_date).toBe("2026-09-15");
    expect(rows[1].due_date).toBe("2026-10-15");
    expect(rows[2].due_date).toBe("2026-11-15");
    expect(rows.map((r) => r.amount)).toEqual([200, 200, 200]);
    expect(rows.map((r) => r.occurrence_number)).toEqual([1, 2, 3]);
    expect(rows[0].status).toBe("aberto");
    expect(rows[0].occurred_at).toBe("2026-09-01");
    expect(rows[2].occurred_at).toBe("2026-11-01");
  });

  it("valor quotal sempre cobre o total (sem 'perder centavos')", () => {
    const rows = buildPayableRows({ ...base, amount: 100, installments: 3 }, today);
    const sum = rows.reduce((a, r) => a + (r.amount ?? 0), 0);
    expect(sum).toBeLessThanOrEqual(100);
    expect(sum).toBeGreaterThanOrEqual(99.99);
  });

  it("parcelas fora de 1..24 caem para parcela única (guarda no formulário + backend)", () => {
    expect(buildPayableRows({ ...base, installments: 0 }, today)).toHaveLength(1);
    expect(buildPayableRows({ ...base, installments: 99 }, today)).toHaveLength(1);
    expect(buildPayableRows({ ...base, installments: 24 }, today)).toHaveLength(24);
  });

  it("não preenche paid_at (fica nulo até quitação real)", () => {
    const rows = buildPayableRows(base, today);
    expect(rows[0].paid_at).toBeUndefined();
  });
});

describe("buildReceivableRows", () => {
  it("adiciona installment_number + installment_total único para o cliente", () => {
    const rows = buildReceivableRows(
      { ...base, kind: "receber", amount: 1200, installments: 4 },
      today,
    );
    expect(rows).toHaveLength(4);
    expect(rows[0].installment_number).toBe(1);
    expect(rows[4 - 1].installment_number).toBe(4);
    expect(rows[0].installment_total).toBe(1200);
    expect(rows.map((r) => r.amount)).toEqual([300, 300, 300, 300]);
    expect(rows[0].status).toBe("aberto");
    expect(rows[0].payment_method).toBe("PIX");
  });

  it("não usa supplier (campo exclusivo de pagáveis)", () => {
    const rows = buildReceivableRows({ ...base, kind: "receber", supplier: "X" }, today);
    expect(rows[0]).not.toHaveProperty("supplier");
    expect(rows[0].customer_id).toBeNull();
  });
});