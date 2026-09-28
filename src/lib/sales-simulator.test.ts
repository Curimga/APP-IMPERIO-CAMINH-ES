import { describe, expect, it } from "vitest";
import {
  addDaysToIsoDate,
  buildClientProposalDto,
  buildProposalCode,
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

  it("DTO do cliente monta ficha técnica e tabela de parcelas com dados reais", () => {
    const dto = buildClientProposalDto({
      truckTitle: "Volvo FH 540 6x2",
      truckSubtitle: "Volvo FH",
      plate: "abc1d23",
      year: 2022,
      color: "Branco",
      mileageKm: 312_450,
      fuel: "Diesel",
      chassis: "9B9630",
      priceCents: centsFromMoney(535_000),
      paymentSummary: "2 parcelas",
      payments: [
        { method: "PIX", amountCents: centsFromMoney(267_500), dueDate: "2026-09-28" },
        { method: "Transferência", amountCents: centsFromMoney(267_500), dueDate: "2026-10-28" },
      ],
      sellerName: "Império Caminhões",
      contactLine: "(11) 99999-0000",
      contractType: "garantia",
      issuedAt: "2026-09-12",
      validUntil: "2026-09-19",
      proposalCode: "PROP-20260912",
      publicNote: "Documentação completa.",
    });

    expect(dto.proposalCode).toBe("PROP-20260912");
    expect(dto.issuedAtLabel).toBe("12/09/2026");
    expect(dto.validUntilLabel).toBe("19/09/2026");
    expect(dto.priceLabel).toBe(formatCents(centsFromMoney(535_000)));
    expect(dto.specs).toEqual([
      { label: "Ano", value: "2022" },
      { label: "Placa", value: "ABC1D23" },
      { label: "Cor", value: "Branco" },
      { label: "Quilometragem", value: "312.450 km" },
      { label: "Combustível", value: "Diesel" },
      { label: "Chassi", value: "9B9630" },
    ]);
    expect(dto.payments).toEqual([
      { installment: "1ª", method: "PIX", dueLabel: "28/09/2026", amountLabel: formatCents(centsFromMoney(267_500)) },
      { installment: "2ª", method: "Transferência", dueLabel: "28/10/2026", amountLabel: formatCents(centsFromMoney(267_500)) },
    ]);
    expect(dto.publicNote).toBe("Documentação completa.");
  });

  it("DTO do cliente descarta dados ausentes e nunca inventa cliente", () => {
    const dto = buildClientProposalDto({
      truckTitle: "Scania R450",
      plate: null,
      year: null,
      color: null,
      mileageKm: 0,
      fuel: null,
      chassis: null,
      priceCents: centsFromMoney(100_000),
      paymentSummary: "A combinar",
      sellerName: "Império Caminhões",
    });

    expect(dto.specs).toEqual([]);
    expect(dto.payments).toEqual([]);
    expect(dto.vehicleSubtitle).toBe("");
    expect(dto.publicNote).toBeNull();
    expect(dto.contractLabel).toBeNull();
    expect(JSON.stringify(dto)).not.toMatch(/comiss|margem|lucro|custo|notes/i);
  });

  it("gera validade e código de proposta a partir da data", () => {
    expect(addDaysToIsoDate("2026-09-12", 7)).toBe("2026-09-19");
    expect(addDaysToIsoDate("2026-12-28", 7)).toBe("2027-01-04");
    expect(buildProposalCode("2026-09-12")).toBe("PROP-20260912");
  });
});
