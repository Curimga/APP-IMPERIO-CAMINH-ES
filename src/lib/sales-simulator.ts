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
  truckTitle: string;
  truckSubtitle?: string | null;
  plate?: string | null;
  year?: number | null;
  color?: string | null;
  mileageKm?: number | null;
  fuel?: string | null;
  chassis?: string | null;
  priceCents: MoneyCents;
  paymentSummary: string;
  payments?: Array<{ method: string; amountCents: MoneyCents; dueDate?: string | null }>;
  sellerName: string;
  contactLine?: string | null;
  contractType?: "garantia" | "repasse";
  issuedAt?: string | null;
  validUntil?: string | null;
  proposalCode?: string | null;
  publicNote?: string | null;
}

export interface ClientProposalSpec {
  label: string;
  value: string;
}

export interface ClientProposalPayment {
  installment: string;
  method: string;
  dueLabel: string;
  amountLabel: string;
}

export interface ClientProposalDto {
  proposalCode: string;
  issuedAtLabel: string;
  validUntilLabel: string;
  vehicleTitle: string;
  vehicleSubtitle: string;
  specs: ClientProposalSpec[];
  priceLabel: string;
  paymentSummary: string;
  payments: ClientProposalPayment[];
  contractLabel: string | null;
  contactName: string;
  contactLine: string;
  publicNote: string | null;
  disclaimer: string;
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

export function formatDateBr(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(parsed);
}

export function formatMileageKm(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const km = Math.round(Number(value));
  if (km <= 0) return null;
  return `${new Intl.NumberFormat("pt-BR").format(km)} km`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  const base = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : new Date();
  base.setDate(base.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

export function buildProposalCode(isoDate: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  const stamp = iso ? `${iso[1]}${iso[2]}${iso[3]}` : new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PROP-${stamp}`;
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
  const specs: ClientProposalSpec[] = [];
  if (data.year) specs.push({ label: "Ano", value: String(data.year) });
  if (data.plate) specs.push({ label: "Placa", value: String(data.plate).toUpperCase() });
  if (data.color) specs.push({ label: "Cor", value: data.color });
  const mileage = formatMileageKm(data.mileageKm);
  if (mileage) specs.push({ label: "Quilometragem", value: mileage });
  if (data.fuel) specs.push({ label: "Combustível", value: data.fuel });
  if (data.chassis) specs.push({ label: "Chassi", value: data.chassis });

  const payments: ClientProposalPayment[] = (data.payments ?? []).map((payment, index) => ({
    installment: `${index + 1}ª`,
    method: payment.method,
    dueLabel: formatDateBr(payment.dueDate),
    amountLabel: formatCents(payment.amountCents),
  }));

  const vehicleSubtitle = [
    data.truckSubtitle,
    [data.year, data.color].filter(Boolean).join(" · "),
  ].filter(Boolean).join(" — ");

  const publicNote = data.publicNote?.trim() ? data.publicNote.trim() : null;

  return {
    proposalCode: data.proposalCode?.trim() || buildProposalCode(data.issuedAt ?? new Date().toISOString().slice(0, 10)),
    issuedAtLabel: formatDateBr(data.issuedAt),
    validUntilLabel: formatDateBr(data.validUntil),
    vehicleTitle: data.truckTitle,
    vehicleSubtitle,
    specs,
    priceLabel: formatCents(data.priceCents),
    paymentSummary: data.paymentSummary,
    payments,
    contractLabel: data.contractType ? (data.contractType === "garantia" ? "Garantia" : "Repasse") : null,
    contactName: data.sellerName,
    contactLine: data.contactLine?.trim() || "Consulte nossa equipe comercial para condições finais.",
    publicNote,
    disclaimer: "Proposta comercial sem valor fiscal. Valores e condições sujeitos a confirmação de disponibilidade e análise de crédito.",
  };
}
