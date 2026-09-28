import { describe, expect, it } from "vitest";
import {
  calculateSaleScenario,
  canPersistRealSaleSafely,
  centsFromMoney,
  evaluateFiscalValidation,
  formatCents,
  paymentReconciliationMessage,
  saleSimulatorFinanceAccess,
  simulationWritesToCrm,
  taxDisplayState,
  type SaleScenarioInput,
} from "@/lib/sales-simulator";

function base(overrides: Partial<SaleScenarioInput> = {}): SaleScenarioInput {
  return {
    grossPriceCents: centsFromMoney(300_000),
    discountCents: 0,
    acquisitionCostCents: centsFromMoney(220_000),
    accountedExpenseCents: centsFromMoney(10_000),
    estimatedExpenses: [],
    sellingCosts: [],
    commission: { mode: "none", basis: "margin" },
    payments: [],
    targetMarginBps: 1_500,
    fiscalProfileValidated: false,
    ...overrides,
  };
}

describe("sales simulator", () => {
  it("calcula preço líquido como bruto menos desconto", () => {
    const r = calculateSaleScenario(base({ discountCents: centsFromMoney(12_345.67) }));
    expect(r.netPriceCents).toBe(centsFromMoney(287_654.33));
  });

  it("calcula margem sem duplicar despesas já contabilizadas", () => {
    const r = calculateSaleScenario(base({
      estimatedExpenses: [
        { id: "1", label: "Já no CRM", amountCents: centsFromMoney(5_000), alreadyAccounted: true },
        { id: "2", label: "Nova", amountCents: centsFromMoney(2_500) },
      ],
    }));
    expect(r.managerialCostCents).toBe(centsFromMoney(232_500));
    expect(r.grossMarginCents).toBe(centsFromMoney(67_500));
  });

  it("calcula comissão percentual por bases suportadas e valor fixo", () => {
    expect(calculateSaleScenario(base({ commission: { mode: "percent", basis: "gross", percentBps: 100 } })).commissionCents).toBe(centsFromMoney(3_000));
    expect(calculateSaleScenario(base({ commission: { mode: "percent", basis: "net", percentBps: 100 }, discountCents: centsFromMoney(10_000) })).commissionCents).toBe(centsFromMoney(2_900));
    expect(calculateSaleScenario(base({ commission: { mode: "percent", basis: "margin", percentBps: 1_000 } })).commissionCents).toBe(centsFromMoney(7_000));
    expect(calculateSaleScenario(base({ commission: { mode: "fixed", basis: "margin", fixedCents: centsFromMoney(1_234.56) } })).commissionCents).toBe(centsFromMoney(1_234.56));
  });

  it("calcula preço de equilíbrio e preço mínimo", () => {
    const r = calculateSaleScenario(base({
      sellingCosts: [{ id: "frete", label: "Frete", amountCents: centsFromMoney(2_000) }],
      commission: { mode: "fixed", basis: "margin", fixedCents: centsFromMoney(3_000) },
      targetMarginBps: 2_000,
    }));
    expect(r.breakEvenPriceCents).toBe(centsFromMoney(235_000));
    expect(r.minimumPriceCents).toBe(centsFromMoney(293_750));
  });

  it("reconcilia entrada, financiamento, parcelas e troca com o preço", () => {
    const r = calculateSaleScenario(base({
      payments: [
        { id: "entrada", kind: "entrada", amountCents: centsFromMoney(50_000), dueDate: "2026-09-28" },
        { id: "fin", kind: "FINANCIAMENTO", amountCents: centsFromMoney(150_000), financePrincipalCents: centsFromMoney(150_000), dueDate: "2026-10-01" },
        { id: "p1", kind: "TRANSFERENCIA", amountCents: centsFromMoney(50_000), dueDate: "2026-11-01" },
        { id: "troca", kind: "TROCA", amountCents: centsFromMoney(50_000), dueDate: "2026-09-28" },
      ],
    }));
    expect(r.reconciliationDiffCents).toBe(0);
    expect(r.financePrincipalCents).toBe(centsFromMoney(150_000));
    expect(r.tradeInCents).toBe(centsFromMoney(50_000));
  });

  it("trata diferença de centavos por arredondamento", () => {
    const r = calculateSaleScenario(base({
      grossPriceCents: 10_000,
      acquisitionCostCents: 0,
      accountedExpenseCents: 0,
      payments: [
        { id: "1", kind: "PIX", amountCents: 3_333, dueDate: "2026-09-28" },
        { id: "2", kind: "PIX", amountCents: 3_333, dueDate: "2026-09-28" },
        { id: "3", kind: "PIX", amountCents: 3_333, dueDate: "2026-09-28" },
      ],
    }));
    expect(r.reconciliationDiffCents).toBe(-1);
    expect(paymentReconciliationMessage(r.reconciliationDiffCents).replace(/\s/g, " ")).toContain("Falta R$ 0,01");
  });

  it("veículo de troca não reduz automaticamente o preço de venda", () => {
    const r = calculateSaleScenario(base({
      payments: [{ id: "troca", kind: "TROCA", amountCents: centsFromMoney(80_000), dueDate: "2026-09-28" }],
    }));
    expect(r.netPriceCents).toBe(centsFromMoney(300_000));
    expect(r.tradeInCents).toBe(centsFromMoney(80_000));
  });

  it("tributo não validado aparece como não calculado, nunca zero", () => {
    const state = taxDisplayState(false);
    expect(state.value).toBeNull();
    expect(state.label).toContain("Tributos não calculados");
  });

  it("PIS/COFINS ficam bloqueados até aprovação da base fiscal", () => {
    const result = evaluateFiscalValidation({
      regime: "Lucro Real",
      originUf: "PR",
      destinationUf: "PR",
      buyerIsTaxpayer: false,
      operationType: "revenda",
      entryDocumentationValidated: true,
      exitConditionsValidated: true,
      fiscalCostValidatedCents: centsFromMoney(220_000),
      fiscalResponsible: "HF",
      fiscalApprovedAt: "2026-09-28",
      fiscalSource: "Manual HF",
      pisCofinsRuleApproved: false,
    });
    const state = result.states.find((s) => s.key === "pis_cofins");
    expect(state?.valueCents).toBeNull();
    expect(state?.status).toBe("pending");
    expect(state?.message).toContain("não aplicar 0,65% e 3,00%");
  });

  it("ICMS não é calculado sem validar documentação de entrada e condições da saída", () => {
    const result = evaluateFiscalValidation({ regime: "Lucro Real", originUf: "PR", operationType: "revenda" });
    const state = result.states.find((s) => s.key === "icms");
    expect(state?.valueCents).toBeNull();
    expect(state?.status).toBe("pending");
    expect(result.missing).toContain("documentação fiscal de entrada validada");
    expect(result.missing).toContain("condições da saída validadas");
  });

  it("IRPJ/CSLL não são apresentados como imposto exato por caminhão sem regra aprovada", () => {
    const result = evaluateFiscalValidation({ regime: "Lucro Real" });
    const state = result.states.find((s) => s.key === "irpj_csll");
    expect(state?.valueCents).toBeNull();
    expect(state?.status).toBe("not_sale_level");
    expect(state?.message).toContain("Lucro Real");
  });

  it("perfis sem permissão não recebem financeiro", () => {
    expect(saleSimulatorFinanceAccess(["secretaria"], "x@imperio.test").canAccess).toBe(false);
    expect(saleSimulatorFinanceAccess(["financeiro"], "x@imperio.test").canAccess).toBe(false);
    expect(saleSimulatorFinanceAccess(["admin"], "josemar.essing@gmail.com").canAccess).toBe(false);
    expect(saleSimulatorFinanceAccess(["admin"], "admin@imperio.test").canAccess).toBe(true);
  });

  it("simulação não escreve nem altera qualquer registro do CRM", () => {
    expect(simulationWritesToCrm()).toBe(false);
  });

  it("confirmação exige IDs reais de caminhão e cliente", () => {
    expect(canPersistRealSaleSafely({ hasTruckId: false, hasCustomerId: true, hasAtomicSaleFlow: true }).allowed).toBe(false);
    expect(canPersistRealSaleSafely({ hasTruckId: true, hasCustomerId: false, hasAtomicSaleFlow: true }).allowed).toBe(false);
  });

  it("bloqueia fluxo real quando falta transação segura e permitiria sucesso quando existir", () => {
    expect(canPersistRealSaleSafely({ hasTruckId: true, hasCustomerId: true, hasAtomicSaleFlow: false }).allowed).toBe(false);
    expect(canPersistRealSaleSafely({ hasTruckId: true, hasCustomerId: true, hasAtomicSaleFlow: true }).allowed).toBe(true);
  });

  it("formata centavos em BRL pt-BR", () => {
    expect(formatCents(123_456)).toBe("R$ 1.234,56");
  });
});
