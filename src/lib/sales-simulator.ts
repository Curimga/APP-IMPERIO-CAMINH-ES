import type { AppRole } from "@/hooks/use-auth";
import { isFinanceExecutive } from "@/lib/mobile/perm";

export type MoneyCents = number;

export type CommissionBasis = "gross" | "net" | "margin";
export type CommissionMode = "none" | "percent" | "fixed";

export type PaymentKind =
  | "entrada"
  | "PIX"
  | "TRANSFERENCIA"
  | "DINHEIRO"
  | "CHEQUE"
  | "CARTAO"
  | "FINANCIAMENTO"
  | "TROCA";

export interface PaymentLineInput {
  id: string;
  kind: PaymentKind;
  amountCents: MoneyCents;
  dueDate: string;
  feeCents?: MoneyCents;
  financePrincipalCents?: MoneyCents;
  financeBuyerInterestCents?: MoneyCents;
}

export interface ExpenseInput {
  id: string;
  label: string;
  amountCents: MoneyCents;
  alreadyAccounted?: boolean;
}

export interface CommissionInput {
  mode: CommissionMode;
  basis: CommissionBasis;
  percentBps?: number;
  fixedCents?: MoneyCents;
}

export interface SaleScenarioInput {
  grossPriceCents: MoneyCents;
  discountCents: MoneyCents;
  acquisitionCostCents: MoneyCents;
  accountedExpenseCents: MoneyCents;
  estimatedExpenses: ExpenseInput[];
  sellingCosts: ExpenseInput[];
  commission: CommissionInput;
  payments: PaymentLineInput[];
  targetMarginBps: number;
  fiscalProfileValidated: boolean;
}

export interface SaleScenarioResult {
  grossPriceCents: MoneyCents;
  discountCents: MoneyCents;
  netPriceCents: MoneyCents;
  accountedExpenseCents: MoneyCents;
  estimatedExpenseCents: MoneyCents;
  acquisitionCostCents: MoneyCents;
  managerialCostCents: MoneyCents;
  grossMarginCents: MoneyCents;
  marginBps: number | null;
  sellingCostCents: MoneyCents;
  commissionCents: MoneyCents;
  contributionBeforeTaxCents: MoneyCents;
  contributionAfterCostsCents: MoneyCents;
  breakEvenPriceCents: MoneyCents;
  minimumPriceCents: MoneyCents;
  paymentsTotalCents: MoneyCents;
  paymentFeesCents: MoneyCents;
  reconciliationDiffCents: MoneyCents;
  companyReceivesCents: MoneyCents;
  financePrincipalCents: MoneyCents;
  financeBuyerInterestCents: MoneyCents;
  tradeInCents: MoneyCents;
  taxStatus: "not_calculated" | "validated";
  canClose: boolean;
}

export interface FinanceAccessDecision {
  canAccess: boolean;
  reason: string | null;
}

export type FiscalTaxKey = "icms" | "pis_cofins" | "irpj_csll";

export interface FiscalValidationInput {
  regime?: string | null;
  originUf?: string | null;
  destinationUf?: string | null;
  buyerIsTaxpayer?: boolean | null;
  operationType?: string | null;
  entryDocumentationValidated?: boolean;
  exitConditionsValidated?: boolean;
  fiscalCostValidatedCents?: MoneyCents | null;
  fiscalResponsible?: string | null;
  fiscalApprovedAt?: string | null;
  fiscalSource?: string | null;
  pisCofinsRuleApproved?: boolean;
  icmsUsedVehicleRuleApproved?: boolean;
  irpjCsllSaleLevelRuleApproved?: boolean;
}

export interface FiscalTaxState {
  key: FiscalTaxKey;
  label: string;
  status: "pending" | "not_sale_level" | "ready_without_amount";
  message: string;
  valueCents: MoneyCents | null;
}

export interface FiscalValidationResult {
  profileComplete: boolean;
  states: FiscalTaxState[];
  missing: string[];
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
  return Math.round((amountCents * bps) / 10_000);
}

export function commissionBaseCents(
  basis: CommissionBasis,
  grossPriceCents: MoneyCents,
  netPriceCents: MoneyCents,
  grossMarginCents: MoneyCents,
): MoneyCents {
  if (basis === "gross") return grossPriceCents;
  if (basis === "net") return netPriceCents;
  return Math.max(0, grossMarginCents);
}

export function calculateCommission(input: CommissionInput, bases: {
  grossPriceCents: MoneyCents;
  netPriceCents: MoneyCents;
  grossMarginCents: MoneyCents;
}): MoneyCents {
  if (input.mode === "none") return 0;
  if (input.mode === "fixed") return Math.max(0, Math.round(input.fixedCents ?? 0));
  return calcPercentCents(
    commissionBaseCents(input.basis, bases.grossPriceCents, bases.netPriceCents, bases.grossMarginCents),
    Math.max(0, input.percentBps ?? 0),
  );
}

export function calculateSaleScenario(input: SaleScenarioInput): SaleScenarioResult {
  const grossPriceCents = Math.max(0, Math.round(input.grossPriceCents));
  const discountCents = Math.max(0, Math.round(input.discountCents));
  const netPriceCents = Math.max(0, grossPriceCents - discountCents);
  const acquisitionCostCents = Math.max(0, Math.round(input.acquisitionCostCents));
  const accountedExpenseCents = Math.max(0, Math.round(input.accountedExpenseCents));
  const estimatedExpenseCents = sumCents(
    input.estimatedExpenses.filter((e) => !e.alreadyAccounted).map((e) => e.amountCents),
  );
  const managerialCostCents = acquisitionCostCents + accountedExpenseCents + estimatedExpenseCents;
  const grossMarginCents = netPriceCents - managerialCostCents;
  const marginBps = netPriceCents > 0 ? Math.round((grossMarginCents * 10_000) / netPriceCents) : null;
  const sellingCostCents = sumCents(input.sellingCosts.map((c) => c.amountCents));
  const commissionCents = calculateCommission(input.commission, {
    grossPriceCents,
    netPriceCents,
    grossMarginCents,
  });
  const contributionBeforeTaxCents = grossMarginCents;
  const contributionAfterCostsCents = grossMarginCents - sellingCostCents - commissionCents;
  const breakEvenPriceCents = managerialCostCents + sellingCostCents + commissionCents;
  const targetMarginBps = Math.min(Math.max(input.targetMarginBps, 0), 9_900);
  const minimumPriceCents = targetMarginBps > 0
    ? Math.ceil((managerialCostCents + sellingCostCents + commissionCents) / (1 - targetMarginBps / 10_000))
    : breakEvenPriceCents;
  const paymentsTotalCents = sumCents(input.payments.map((p) => p.amountCents));
  const paymentFeesCents = sumCents(input.payments.map((p) => p.feeCents));
  const financePrincipalCents = sumCents(input.payments.map((p) => p.financePrincipalCents));
  const financeBuyerInterestCents = sumCents(input.payments.map((p) => p.financeBuyerInterestCents));
  const tradeInCents = sumCents(input.payments.filter((p) => p.kind === "TROCA").map((p) => p.amountCents));
  const companyReceivesCents = paymentsTotalCents - paymentFeesCents;
  const reconciliationDiffCents = paymentsTotalCents - netPriceCents;

  return {
    grossPriceCents,
    discountCents,
    netPriceCents,
    accountedExpenseCents,
    estimatedExpenseCents,
    acquisitionCostCents,
    managerialCostCents,
    grossMarginCents,
    marginBps,
    sellingCostCents,
    commissionCents,
    contributionBeforeTaxCents,
    contributionAfterCostsCents,
    breakEvenPriceCents,
    minimumPriceCents,
    paymentsTotalCents,
    paymentFeesCents,
    reconciliationDiffCents,
    companyReceivesCents,
    financePrincipalCents,
    financeBuyerInterestCents,
    tradeInCents,
    taxStatus: input.fiscalProfileValidated ? "validated" : "not_calculated",
    canClose: reconciliationDiffCents === 0 && input.fiscalProfileValidated,
  };
}

export function paymentReconciliationMessage(diffCents: MoneyCents): string {
  if (diffCents === 0) return "Formas de pagamento fecham com o preço líquido.";
  if (diffCents > 0) return `Sobra ${formatCents(diffCents)} nas formas de pagamento.`;
  return `Falta ${formatCents(Math.abs(diffCents))} para fechar o preço líquido.`;
}

export function taxDisplayState(fiscalProfileValidated: boolean): { label: string; value: string | null } {
  if (!fiscalProfileValidated) {
    return {
      label: "Tributos não calculados — falta validar o perfil fiscal",
      value: null,
    };
  }
  return {
    label: "Perfil fiscal validado, mas sem regra tributária parametrizada no APP",
    value: null,
  };
}

export function evaluateFiscalValidation(input: FiscalValidationInput): FiscalValidationResult {
  const missing: string[] = [];
  if (!input.regime) missing.push("regime tributário e vigência");
  if (!input.originUf) missing.push("UF de origem");
  if (!input.destinationUf) missing.push("UF de destino");
  if (input.buyerIsTaxpayer == null) missing.push("condição de contribuinte do comprador");
  if (!input.operationType) missing.push("tipo de operação fiscal");
  if (!input.entryDocumentationValidated) missing.push("documentação fiscal de entrada validada");
  if (!input.exitConditionsValidated) missing.push("condições da saída validadas");
  if (input.fiscalCostValidatedCents == null) missing.push("custo fiscal validado");
  if (!input.fiscalResponsible) missing.push("responsável fiscal pela aprovação");
  if (!input.fiscalApprovedAt) missing.push("data de aprovação fiscal");
  if (!input.fiscalSource) missing.push("fonte/regra fiscal aplicável");

  const baseComplete = missing.length === 0;
  const icmsReady = baseComplete && Boolean(input.icmsUsedVehicleRuleApproved);
  const pisCofinsReady = baseComplete && Boolean(input.pisCofinsRuleApproved);
  const irpjCsllReady = baseComplete && Boolean(input.irpjCsllSaleLevelRuleApproved);

  return {
    profileComplete: baseComplete,
    missing,
    states: [
      {
        key: "icms",
        label: "ICMS",
        status: icmsReady ? "ready_without_amount" : "pending",
        valueCents: null,
        message: icmsReady
          ? "Regra marcada como aprovada, mas o APP não possui parametrização segura para calcular o imposto definitivo. A base reduzida de 5% é base de cálculo, não alíquota."
          : "Pendente de validação fiscal: confirmar documentação de entrada, condições da saída, UF, CFOP e enquadramento PR. Não calcular DIFAL por presunção.",
      },
      {
        key: "pis_cofins",
        label: "PIS/COFINS",
        status: pisCofinsReady ? "ready_without_amount" : "pending",
        valueCents: null,
        message: pisCofinsReady
          ? "Regra marcada como aprovada, mas a base fiscal validada precisa ser mantida separada da margem gerencial. Preparação/oficina/frete não entram automaticamente na base."
          : "Pendente de aprovação: não aplicar 0,65% e 3,00% sem confirmação fiscal da base sobre diferença entre alienação e custo de aquisição fiscal.",
      },
      {
        key: "irpj_csll",
        label: "IRPJ/CSLL",
        status: irpjCsllReady ? "ready_without_amount" : "not_sale_level",
        valueCents: null,
        message: irpjCsllReady
          ? "Há indicação de regra aprovada, mas o APP ainda não possui cálculo parametrizado seguro para apresentar valor por caminhão."
          : "Não calculado no nível da venda; apuração depende da contabilidade do Lucro Real. Não aplicar percentual fixo por caminhão.",
      },
    ],
  };
}

export function saleSimulatorFinanceAccess(roles: AppRole[], email?: string | null): FinanceAccessDecision {
  if (isFinanceExecutive(roles, email)) return { canAccess: true, reason: null };
  return {
    canAccess: false,
    reason: "Simulador financeiro exclusivo do Executivo/Admin. Este perfil não deve receber custos, margens, comissão ou tributos.",
  };
}

export function simulationWritesToCrm(): boolean {
  return false;
}

export function canPersistRealSaleSafely(args: {
  hasTruckId: boolean;
  hasCustomerId: boolean;
  hasAtomicSaleFlow: boolean;
}): { allowed: boolean; reason: string } {
  if (!args.hasTruckId || !args.hasCustomerId) {
    return { allowed: false, reason: "Selecione caminhão e cliente pelos IDs reais antes de confirmar." };
  }
  if (!args.hasAtomicSaleFlow) {
    return {
      allowed: false,
      reason: "Bloqueado: o APP atual não possui fluxo transacional único para venda, recebíveis, comissão e formalização com rollback seguro.",
    };
  }
  return { allowed: true, reason: "Fluxo real disponível." };
}
