/**
 * ESPELHO EXATO do CRM — `src/lib/finance/financial-class.ts`
 *
 * FONTE ÚNICA DE VERDADE DA CLASSIFICAÇÃO FINANCEIRA.
 *
 * REGRA DE OURO:
 *   Um mesmo valor econômico afeta o LUCRO UMA ÚNICA VEZ.
 *
 *   AQUISIÇÃO DE ESTOQUE = ATIVO  (aumenta estoque, NÃO é despesa)
 *   PAGAMENTO DE ESTOQUE   = CAIXA  (quita obrigação, NÃO é nova despesa)
 *   CONSUMO DE ESTOQUE     = CUSTO  (aqui a despesa nasce)
 *
 * Espelha `public.fn_financial_kind_include_in_profit` (migration
 * `20260930000000_stock_financial_classification.sql`). A classificação é
 * ESTRUTURAL (coluna `financial_event_kind`), nunca textual.
 *
 * ATENÇÃO: o app espelha a MESMA lógica do CRM, mas o `types.ts` gerado do app
 * ainda NÃO conhece `financial_event_kind` / `stock_movement_id` /
 * `stock_purchase_id`. Se o banco já tiver essas colunas (CRM desde
 * 2026-09-30), elas entram no select e o filtro funciona. Se NÃO existirem, o
 * PostgREST rejeita o select inteiro — por isso `resolveKind` tolera `undefined`
 * e cai na compatibilidade por `purchase_installment_id` / `category` /
 * `stock_movement_id`, que já existiam antes.
 */

export const FINANCIAL_KIND = {
  RECEITA: "receita",
  DESPESA_OPERACIONAL: "despesa_operacional",
  CAMINHAO_MANUTENCAO: "caminhao_manutencao",
  CONSUMO_ESTOQUE_CAMINHAO: "consumo_estoque_caminhao",
  VENDA_ESTOQUE: "venda_estoque",
  BAIXA_ESTOQUE: "baixa_estoque",
  AQUISICAO_ESTOQUE: "aquisicao_estoque",
  PAGAMENTO_ESTOQUE: "pagamento_estoque",
  AQUISICAO_CAMINHAO: "aquisicao_caminhao",
  AQUISICAO_VEICULO_EMPRESA: "aquisicao_veiculo_empresa",
  TRANSFERENCIA_INTERNA: "transferencia_interna",
  OFFLINE_CAMINHAO: "offline_caminhao",
} as const;

export type FinancialKind = (typeof FINANCIAL_KIND)[keyof typeof FINANCIAL_KIND];

export type FinancialKindSpec = {
  label: string;
  /** Reduz o lucro líquido? */
  includeInProfit: boolean;
  /** Move caixa (bank_transactions)? */
  affectsCash: boolean;
  /** Move o saldo de estoque? */
  affectsStock: boolean;
  /** Entra em trucks.expenses_total? */
  capitalizedInTruck: boolean;
  description: string;
};

/**
 * TABELA CANÔNICA. Espelha literalmente `financial_event_kinds` do banco.
 *
 *  AQUISIÇÃO DE ESTOQUE → includeInProfit:false, affectsStock:true
 *  PAGAMENTO DE ESTOQUE  → includeInProfit:false, affectsCash:true
 *  CONSUMO DE ESTOQUE    → includeInProfit:true,  affectsStock:true, capitalizedInTruck:true
 */
export const FINANCIAL_KINDS: Record<FinancialKind, FinancialKindSpec> = {
  [FINANCIAL_KIND.RECEITA]: {
    label: "Receita",
    includeInProfit: false,
    affectsCash: true,
    affectsStock: false,
    capitalizedInTruck: false,
    description: "Crédito por venda de caminhão (faturamento).",
  },
  [FINANCIAL_KIND.DESPESA_OPERACIONAL]: {
    label: "Despesa Operacional",
    includeInProfit: true,
    affectsCash: true,
    affectsStock: false,
    capitalizedInTruck: false,
    description: "Despesa que reduz o resultado no período em que ocorre.",
  },
  [FINANCIAL_KIND.CAMINHAO_MANUTENCAO]: {
    label: "Manutenção de Caminhão",
    includeInProfit: true,
    affectsCash: true,
    affectsStock: false,
    capitalizedInTruck: true,
    description: "Custo direto de caminhão lançado manualmente.",
  },
  [FINANCIAL_KIND.CONSUMO_ESTOQUE_CAMINHAO]: {
    label: "Consumo de Estoque em Caminhão",
    includeInProfit: true,
    affectsCash: false,
    affectsStock: true,
    capitalizedInTruck: true,
    description: "Único evento que transforma estoque em custo do caminhão.",
  },
  [FINANCIAL_KIND.VENDA_ESTOQUE]: {
    label: "Venda de Estoque",
    includeInProfit: false,
    affectsCash: true,
    affectsStock: true,
    capitalizedInTruck: false,
    description: "Saída de estoque explicitamente marcada como venda. Entra como receita pelo valor da saída.",
  },
  [FINANCIAL_KIND.BAIXA_ESTOQUE]: {
    label: "Baixa de Estoque",
    includeInProfit: false,
    affectsCash: false,
    affectsStock: true,
    capitalizedInTruck: false,
    description: "Saída manual sem venda explícita. Baixa saldo, mas não vira receita nem custo de caminhão.",
  },
  [FINANCIAL_KIND.AQUISICAO_ESTOQUE]: {
    label: "Aquisição de Estoque",
    includeInProfit: false,
    affectsCash: false,
    affectsStock: true,
    capitalizedInTruck: false,
    description: "Aumenta o estoque (ativo). Não é despesa e não reduz lucro.",
  },
  [FINANCIAL_KIND.PAGAMENTO_ESTOQUE]: {
    label: "Pagamento de Estoque",
    includeInProfit: false,
    affectsCash: true,
    affectsStock: false,
    capitalizedInTruck: false,
    description: "Saída de caixa e quitação de obrigação. Não é nova despesa.",
  },
  [FINANCIAL_KIND.AQUISICAO_CAMINHAO]: {
    label: "Aquisição de Caminhão",
    includeInProfit: false,
    affectsCash: true,
    affectsStock: false,
    capitalizedInTruck: false,
    description: "Parcela de compra de caminhão: investimento, não despesa.",
  },
  [FINANCIAL_KIND.AQUISICAO_VEICULO_EMPRESA]: {
    label: "Aquisição de Veículo da Empresa",
    includeInProfit: false,
    affectsCash: true,
    affectsStock: false,
    capitalizedInTruck: false,
    description: "Parcela de compra de veículo da frota própria: investimento, não despesa.",
  },
  [FINANCIAL_KIND.TRANSFERENCIA_INTERNA]: {
    label: "Transferência Interna",
    includeInProfit: false,
    affectsCash: true,
    affectsStock: false,
    capitalizedInTruck: false,
    description: "Movimentação entre contas próprias: não altera resultado.",
  },
  [FINANCIAL_KIND.OFFLINE_CAMINHAO]: {
    label: "Caminhão Offline",
    includeInProfit: false,
    affectsCash: true,
    affectsStock: false,
    capitalizedInTruck: false,
    description: "Serviço/despesa de caminhão offline: pode mover caixa, mas não altera despesas, lucro ou estoque ativo.",
  },
};

export const DEFAULT_FINANCIAL_KIND: FinancialKind = FINANCIAL_KIND.DESPESA_OPERACIONAL;

export const isFinancialKind = (v: unknown): v is FinancialKind =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(FINANCIAL_KINDS, v);

export const kindSpec = (kind: unknown): FinancialKindSpec =>
  (isFinancialKind(kind) ? FINANCIAL_KINDS[kind] : undefined) ?? FINANCIAL_KINDS[DEFAULT_FINANCIAL_KIND];

export const financialKindLabel = (kind: unknown): string => kindSpec(kind).label;

/** Uma linha de custo (general_expenses OU truck_expenses OU payable). */
export type ClassifiedCostRow = {
  financial_event_kind?: unknown;
  /** general_expenses histórico: `purchase_installment_id` preenchido. */
  purchase_installment_id?: unknown;
  /** general_expenses histórico: categoria `custo_aquisicao`. */
  category?: unknown;
  /** truck_expenses: vínculo canônico com a saída de estoque que originou o custo. */
  stock_movement_id?: unknown;
  /** general_expenses / payables / truck_expenses: vínculo com a compra de estoque. */
  stock_purchase_id?: unknown;
  [key: string]: unknown;
};

/**
 * Classificação efetiva de uma linha de custo.
 * O dado estrutural manda. A herança de compatibilidade é derivada de COLUNAS,
 * nunca de texto livre.
 */
export const resolveKind = (row: ClassifiedCostRow | null | undefined): FinancialKind => {
  if (!row) return DEFAULT_FINANCIAL_KIND;
  if (isFinancialKind(row.financial_event_kind)) return row.financial_event_kind;
  if (row.purchase_installment_id) return FINANCIAL_KIND.AQUISICAO_CAMINHAO;
  if (row.category === "custo_aquisicao") return FINANCIAL_KIND.AQUISICAO_CAMINHAO;
  if (row.stock_movement_id) return FINANCIAL_KIND.CONSUMO_ESTOQUE_CAMINHAO;
  return DEFAULT_FINANCIAL_KIND;
};

/**
 * REGRA DE OURO: esta linha DEVE reduzir o lucro?
 *
 *  - Pagamento de estoque        → NÃO
 *  - Aquisição de estoque        → NÃO
 *  - Aquisição/compra de caminhão → NÃO
 *  - Transferência interna        → NÃO
 *  - Consumo de estoque          → SIM (uma única vez)
 *  - Despesa operacional         → SIM
 */
export const includeInProfit = (row: ClassifiedCostRow | null | undefined): boolean =>
  kindSpec(resolveKind(row)).includeInProfit;

export const isStockAcquisition = (row?: ClassifiedCostRow | null): boolean =>
  resolveKind(row) === FINANCIAL_KIND.AQUISICAO_ESTOQUE;

export const isStockPayment = (row?: ClassifiedCostRow | null): boolean =>
  resolveKind(row) === FINANCIAL_KIND.PAGAMENTO_ESTOQUE;

export const isStockConsumption = (row?: ClassifiedCostRow | null): boolean =>
  resolveKind(row) === FINANCIAL_KIND.CONSUMO_ESTOQUE_CAMINHAO;

/** VENDA DE ESTOQUE = receita. Saída sem caminhão aumenta entradas/lucro. */
export const isStockSale = (row?: ClassifiedCostRow | null): boolean =>
  resolveKind(row) === FINANCIAL_KIND.VENDA_ESTOQUE;

export const isAcquisitionKind = (row?: ClassifiedCostRow | null): boolean =>
  resolveKind(row) === FINANCIAL_KIND.AQUISICAO_CAMINHAO;

export const affectsCash = (row?: ClassifiedCostRow | null): boolean =>
  kindSpec(resolveKind(row)).affectsCash;

export const affectsStock = (row?: ClassifiedCostRow | null): boolean =>
  kindSpec(resolveKind(row)).affectsStock;

/** Capitalizada em `trucks.expenses_total` (fonte canônica do custo do caminhão). */
export const capitalizedInTruck = (row?: ClassifiedCostRow | null): boolean =>
  kindSpec(resolveKind(row)).capitalizedInTruck;

export const isOperationalExpense = (row?: ClassifiedCostRow | null): boolean =>
  includeInProfit(row) && !capitalizedInTruck(row);

/** Compatibilidade legada: era o filtro usado por `custo_aquisicao`/installments. */
export const isAcquisitionPayment = (row?: ClassifiedCostRow | null): boolean =>
  isAcquisitionKind(row);

/** Filtro canônico de OPEX: o que PODE entrar em "despesas gerais". */
export const includeInOpex = (row?: ClassifiedCostRow | null): boolean => includeInProfit(row);
