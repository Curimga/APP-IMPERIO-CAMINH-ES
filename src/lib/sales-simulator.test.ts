import { describe, expect, it } from "vitest";
import {
  calculateCrmSaleProposal,
  canPersistRealSaleSafely,
  centsFromMoney,
  formatCents,
  paymentDiffMessage,
  publicProposalLines,
  saleSimulatorFinanceAccess,
  simulationWritesToCrm,
} from "@/lib/sales-simulator";

describe("CRM-like sale proposal simulator", () => {
  it("calcula diferença comercial entre preço anunciado e proposto", () => {
    const result = calculateCrmSaleProposal({
      announcedPriceCents: centsFromMoney(300_000),
      proposedPriceCents: centsFromMoney(285_000),
      payments: [],
      commission: { enabled: false, mode: "none" },
      canSeeFinance: true,
    });

    expect(result.commercialDiscountCents).toBe(centsFromMoney(15_000));
    expect(result.commercialDiscountBps).toBe(500);
  });

  it("reproduz o resultado projetado do simulador simples do CRM", () => {
    const result = calculateCrmSaleProposal({
      announcedPriceCents: centsFromMoney(535_000),
      proposedPriceCents: centsFromMoney(535_000),
      purchasePriceCents: centsFromMoney(450_000),
      accumulatedExpensesCents: centsFromMoney(900),
      taxesCents: 0,
      extraCostCents: 0,
      payments: [],
      commission: { enabled: true, mode: "fixed", fixedCents: 0 },
      canSeeFinance: true,
    });

    expect(result.totalCostCents).toBe(centsFromMoney(450_900));
    expect(result.netProfitCents).toBe(centsFromMoney(84_100));
    expect(result.marginBps).toBe(1572);
    expect(result.markupBps).toBe(1865);
  });

  it("reconcilia pagamentos usando métodos existentes do CRM", () => {
    const result = calculateCrmSaleProposal({
      announcedPriceCents: centsFromMoney(300_000),
      proposedPriceCents: centsFromMoney(300_000),
      payments: [
        { id: "1", method: "PIX", amountCents: centsFromMoney(100_000), dueDate: "2026-09-28" },
        { id: "2", method: "TRANSFERENCIA", amountCents: centsFromMoney(200_000), dueDate: "2026-10-28" },
      ],
      commission: { enabled: false, mode: "none" },
      canSeeFinance: true,
    });

    expect(result.paymentsTotalCents).toBe(centsFromMoney(300_000));
    expect(result.isBalanced).toBe(true);
    expect(paymentDiffMessage(result.paymentDiffCents)).toContain("fecham");
  });

  it("calcula comissão percentual e fixa somente quando habilitada", () => {
    expect(calculateCrmSaleProposal({
      announcedPriceCents: 0,
      proposedPriceCents: centsFromMoney(200_000),
      payments: [],
      commission: { enabled: true, mode: "percent", percentBps: 100 },
      canSeeFinance: true,
    }).commissionCents).toBe(centsFromMoney(2_000));

    expect(calculateCrmSaleProposal({
      announcedPriceCents: 0,
      proposedPriceCents: centsFromMoney(200_000),
      payments: [],
      commission: { enabled: true, mode: "fixed", fixedCents: centsFromMoney(1_500) },
      canSeeFinance: true,
    }).commissionCents).toBe(centsFromMoney(1_500));

    expect(calculateCrmSaleProposal({
      announcedPriceCents: 0,
      proposedPriceCents: centsFromMoney(200_000),
      payments: [],
      commission: { enabled: false, mode: "percent", percentBps: 100 },
      canSeeFinance: true,
    }).commissionCents).toBeNull();
  });

  it("não retorna comissão para usuário sem permissão financeira", () => {
    const result = calculateCrmSaleProposal({
      announcedPriceCents: 0,
      proposedPriceCents: centsFromMoney(200_000),
      payments: [],
      commission: { enabled: true, mode: "percent", percentBps: 100 },
      canSeeFinance: false,
    });

    expect(result.commissionCents).toBeNull();
    expect(saleSimulatorFinanceAccess(["secretaria"], "x@imperio.test").canAccess).toBe(false);
    expect(saleSimulatorFinanceAccess(["admin"], "admin@imperio.test").canAccess).toBe(true);
  });

  it("simulação não escreve no CRM e confirmação exige fluxo real acessível", () => {
    expect(simulationWritesToCrm()).toBe(false);
    expect(canPersistRealSaleSafely({ hasTruckId: true, hasCustomerId: true, hasSellerId: true, hasCrmSaleSimulatorAction: false }).allowed).toBe(false);
    expect(canPersistRealSaleSafely({ hasTruckId: true, hasCustomerId: true, hasSellerId: true, hasCrmSaleSimulatorAction: true }).allowed).toBe(true);
  });

  it("linhas públicas da proposta não incluem dados internos", () => {
    const lines = publicProposalLines({
      customerName: "Cliente Teste",
      truckTitle: "Volvo FH 540",
      plate: "ABC1D23",
      year: 2022,
      color: "Branco",
      priceCents: centsFromMoney(450_000),
      paymentSummary: "PIX: R$ 450.000,00",
      sellerName: "Vendedor Real",
      contractType: "garantia",
    });

    expect(lines.join(" ")).toContain("Volvo FH 540");
    expect(lines.join(" ")).toContain(formatCents(centsFromMoney(450_000)));
    expect(lines.join(" ")).not.toMatch(/comiss|margem|custo|lucro/i);
  });
});
