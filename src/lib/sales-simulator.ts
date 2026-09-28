import type { AppRole } from "@/hooks/use-auth";
import { isFinanceExecutive } from "@/lib/mobile/perm";

export type MoneyCents = number;
export type CommissionMode = "none" | "percent" | "fixed";

export type CrmPaymentMethod =
  | "PIX"
  | "BOLETO"
  | "TRANSFERENCIA"
  | "DINHEIRO"
  | "CARTAO"
  | "OUTRO";

export interface PaymentLineInput {
  id: string;
  method: CrmPaymentMethod;
  amountCents: MoneyCents;
  dueDate: string;
  note?: string;
}

export interface CommissionInput {
  enabled: boolean;
  mode: CommissionMode;
  percentBps?: number;
  fixedCents?: MoneyCents;
}

export interface CrmSaleProposalInput {
  announcedPriceCents: MoneyCents;
  proposedPriceCents: MoneyCents;
  purchasePriceCents?: MoneyCents;
  accumulatedExpensesCents?: MoneyCents;
  taxesCents?: MoneyCents;
  extraCostCents?: MoneyCents;
  payments: PaymentLineInput[];
  commission: CommissionInput;
  canSeeFinance: boolean;
}

export interface CrmSaleProposalResult {
  announcedPriceCents: MoneyCents;
  proposedPriceCents: MoneyCents;
  commercialDiscountCents: MoneyCents;
  commercialDiscountBps: number | null;
  paymentsTotalCents: MoneyCents;
  paymentDiffCents: MoneyCents;
  commissionCents: MoneyCents | null;
  purchasePriceCents: MoneyCents | null;
  accumulatedExpensesCents: MoneyCents | null;
  taxesCents: MoneyCents | null;
  extraCostCents: MoneyCents | null;
  totalCostCents: MoneyCents | null;
  netProfitCents: MoneyCents | null;
  marginBps: number | null;
  markupBps: number | null;
  isBalanced: boolean;
}

export interface PublicProposalData {
  customerName: string;
  truckTitle: string;
  plate?: string | null;
  year?: number | null;
  color?: string | null;
  priceCents: MoneyCents;
  paymentSummary: string;
  sellerName: string;
  contractType?: "garantia" | "repasse";
}

export interface ClientProposalDto {
  customerName: string;
  vehicleTitle: string;
  vehicleDetails: string;
  priceLabel: string;
  paymentSummary: string;
  sellerName: string;
  contractLabel: string | null;
}

export function centsFromMoney(value: number | string | null | undefined): MoneyCents {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function moneyFromCents(cents: MoneyCents): number {
  return Math.round(cents) / 100;
}

export function formatCents(cents: MoneyCents): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(moneyFromCents(cents));
}

export function sumCents(values: Array<MoneyCents | null | undefined>): MoneyCents {
  return values.reduce<number>((acc, value) => acc + Math.round(value ?? 0), 0);
}

export function calcPercentCents(amountCents: MoneyCents, bps: number): MoneyCents {
  return Math.round((amountCents * Math.max(0, bps)) / 10_000);
}

export function calculateCommission(input: CommissionInput, proposedPriceCents: MoneyCents): MoneyCents | null {
  if (!input.enabled || input.mode === "none") return null;
  if (input.mode === "fixed") return Math.max(0, Math.round(input.fixedCents ?? 0));
  return calcPercentCents(proposedPriceCents, input.percentBps ?? 0);
}

export function calculateCrmSaleProposal(input: CrmSaleProposalInput): CrmSaleProposalResult {
  const announcedPriceCents = Math.max(0, Math.round(input.announcedPriceCents));
  const proposedPriceCents = Math.max(0, Math.round(input.proposedPriceCents));
  const commercialDiscountCents = Math.max(0, announcedPriceCents - proposedPriceCents);
  const commercialDiscountBps = announcedPriceCents > 0
    ? Math.round((commercialDiscountCents * 10_000) / announcedPriceCents)
    : null;
  const paymentsTotalCents = sumCents(input.payments.map((p) => p.amountCents));
  const paymentDiffCents = paymentsTotalCents - proposedPriceCents;
  const commissionCents = input.canSeeFinance
    ? calculateCommission(input.commission, proposedPriceCents)
    : null;
  const purchasePriceCents = input.canSeeFinance ? Math.max(0, Math.round(input.purchasePriceCents ?? 0)) : null;
  const accumulatedExpensesCents = input.canSeeFinance ? Math.max(0, Math.round(input.accumulatedExpensesCents ?? 0)) : null;
  const taxesCents = input.canSeeFinance ? Math.max(0, Math.round(input.taxesCents ?? 0)) : null;
  const extraCostCents = input.canSeeFinance ? Math.max(0, Math.round(input.extraCostCents ?? 0)) : null;
  const totalCostCents = input.canSeeFinance
    ? sumCents([purchasePriceCents, accumulatedExpensesCents, commissionCents, taxesCents, extraCostCents])
    : null;
  const netProfitCents = input.canSeeFinance && totalCostCents != null
    ? proposedPriceCents - totalCostCents
    : null;
  const marginBps = input.canSeeFinance && proposedPriceCents > 0 && netProfitCents != null
    ? Math.round((netProfitCents * 10_000) / proposedPriceCents)
    : null;
  const markupBps = input.canSeeFinance && totalCostCents != null && totalCostCents > 0 && netProfitCents != null
    ? Math.round((netProfitCents * 10_000) / totalCostCents)
    : null;

  return {
    announcedPriceCents,
    proposedPriceCents,
    commercialDiscountCents,
    commercialDiscountBps,
    paymentsTotalCents,
    paymentDiffCents,
    commissionCents,
    purchasePriceCents,
    accumulatedExpensesCents,
    taxesCents,
    extraCostCents,
    totalCostCents,
    netProfitCents,
    marginBps,
    markupBps,
    isBalanced: paymentDiffCents === 0,
  };
}

export function paymentDiffMessage(diffCents: MoneyCents): string {
  if (diffCents === 0) return "Condições de pagamento fecham com o preço proposto.";
  if (diffCents > 0) return `Condições passam ${formatCents(diffCents)} do preço proposto.`;
  return `Faltam ${formatCents(Math.abs(diffCents))} para fechar o preço proposto.`;
}

export function saleSimulatorFinanceAccess(roles: AppRole[], email?: string | null) {
  if (isFinanceExecutive(roles, email)) return { canAccess: true, reason: null };
  return {
    canAccess: false,
    reason: "Valores internos, comissão e dados financeiros são exclusivos do Executivo/Admin.",
  };
}

export function simulationWritesToCrm(): boolean {
  return false;
}

export function canPersistRealSaleSafely(args: {
  hasTruckId: boolean;
  hasCustomerId: boolean;
  hasSellerId: boolean;
  hasCrmSaleSimulatorAction: boolean;
}): { allowed: boolean; reason: string } {
  if (!args.hasTruckId || !args.hasCustomerId || !args.hasSellerId) {
    return { allowed: false, reason: "Selecione caminhão, cliente e vendedor reais antes de avançar." };
  }
  if (!args.hasCrmSaleSimulatorAction) {
    return {
      allowed: false,
      reason: "O simulador real do CRM não está acessível no APP; nenhuma venda será gravada por esta tela.",
    };
  }
  return { allowed: true, reason: "Fluxo real do CRM disponível." };
}

export function publicProposalLines(data: PublicProposalData): string[] {
  return [
    data.truckTitle,
    [data.year, data.color, data.plate].filter(Boolean).join(" • "),
    `Preço proposto: ${formatCents(data.priceCents)}`,
    data.paymentSummary,
    data.contractType ? `Condição: ${data.contractType === "garantia" ? "Garantia" : "Repasse"}` : "",
    `Vendedor: ${data.sellerName}`,
  ].filter(Boolean);
}

export function buildClientProposalDto(data: PublicProposalData): ClientProposalDto {
  const customerName = data.customerName.trim();
  if (!customerName) throw new Error("Selecione um cliente com nome válido para gerar a proposta.");
  return {
    customerName,
    vehicleTitle: data.truckTitle,
    vehicleDetails: [data.year, data.color, data.plate].filter(Boolean).join(" • "),
    priceLabel: formatCents(data.priceCents),
    paymentSummary: data.paymentSummary,
    sellerName: data.sellerName,
    contractLabel: data.contractType ? (data.contractType === "garantia" ? "Garantia" : "Repasse") : null,
  };
}
