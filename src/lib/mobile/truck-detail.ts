import { money, sumMoney } from "@/lib/format";
import { isFinanceExecutive } from "@/lib/mobile/perm";
import type { AppRole } from "@/hooks/use-auth";

/**
 * LÓGICA PURA DA FICHA DO CAMINHÃO — única fonte de regras de negócio exibidas
 * em `/garagem/$truckId`.
 *
 * Todas as funções são puras (sem rede, sem hooks) para serem testadas
 * diretamente no Vitest — o teste importa o código real de produção.
 *
 * Regras financeiras (idênticas ao CRM / dashboard-data.ts):
 *   custo investido = purchase_price + expenses_total
 *   lucro          = sold_price - custo investido
 *   margem         = (sold_price - custo) / sold_price * 100
 *
 * Regra de acesso: SOMENTE o Executivo (admin) recebe/consulta valores.
 */

/** Rota única da ficha — sempre a partir do `trucks.id` real. */
export function truckDetailPath(id: string): string {
  return `/garagem/${encodeURIComponent(id)}`;
}

/** Normaliza o parâmetro recebido pela URL; null para acessos inválidos. */
export function normalizeTruckIdParam(param: string | null | undefined): string | null {
  const v = param?.trim();
  return v ? v : null;
}

/** Acesso financeiro: apenas Executivo (admin). O nome do papel não prevalece. */
export function maySeeTruckFinance(roles: AppRole[]): boolean {
  return isFinanceExecutive(roles);
}

/** CPF/CNPJ do comprador segue a mesma regra das finanças (exclusivo Executivo). */
export function maySeeCpfCnpj(roles: AppRole[]): boolean {
  return isFinanceExecutive(roles);
}

export interface TruckFinanceInput {
  status?: string | null;
  purchase_price?: number | null;
  expenses_total?: number | null;
  expected_price?: number | null;
  sold_price?: number | null;
  sale_type?: string | null;
}

export interface TruckFinanceSnapshot {
  sold: boolean;
  purchasePrice: number;
  expensesTotal: number;
  investedCost: number;
  expectedPrice: number;
  soldPrice: number;
  profit: number | null;
  marginPct: number | null;
  saleType: string | null;
}

/**
 * Mesma fonte do CRM (`computeExecutiveKpis`/`computeTopTrucks`): custo =
 * compra + despesas; lucro = receita − custo; margem sobre a receita.
 */
export function truckFinanceSnapshot(t: TruckFinanceInput | null | undefined): TruckFinanceSnapshot {
  const sold = t?.status === "vendido";
  const purchasePrice = money(t?.purchase_price);
  const expensesTotal = money(t?.expenses_total);
  const investedCost = sumMoney([purchasePrice, expensesTotal]);
  const expectedPrice = money(t?.expected_price);
  const soldPrice = money(t?.sold_price);

  let profit: number | null = null;
  let marginPct: number | null = null;
  if (sold && soldPrice > 0) {
    profit = money(soldPrice - investedCost);
    marginPct = ((soldPrice - investedCost) / soldPrice) * 100;
  }

  return {
    sold,
    purchasePrice,
    expensesTotal,
    investedCost,
    expectedPrice,
    soldPrice,
    profit,
    marginPct,
    saleType: t?.sale_type ?? null,
  };
}

export interface TruckExpenseRef {
  amount: number;
  status?: string | null;
}

export interface TruckExpenseSummary {
  total: number;
  count: number;
  paid: number;
  pending: number;
}

/** Resumo da seção Despesas — pagas = status "pago". */
export function truckExpenseSummary(
  expenses: TruckExpenseRef[] | null | undefined,
): TruckExpenseSummary {
  const list = expenses ?? [];
  const paid = list.filter((e) => String(e.status ?? "").toLowerCase() === "pago").length;
  return {
    total: sumMoney(list.map((e) => e.amount)),
    count: list.length,
    paid,
    pending: list.length - paid,
  };
}

/** Rótulo pt-BR da categoria (kind) de uma despesa. */
export const EXPENSE_KIND_LABEL: Record<string, string> = {
  manutencao: "Manutenção",
  combustivel: "Combustível",
  documentacao: "Documentação",
  transporte: "Transporte",
  impostos: "Impostos",
  reforma: "Reforma",
  outros: "Outros",
  pecas_caminhao: "Peças",
  lavagem: "Lavagem",
  pneu: "Pneu",
  colaborador: "Colaborador",
  caminhao: "Caminhão",
};

export function expenseKindLabel(kind: string | null | undefined): string {
  if (!kind) return "—";
  return EXPENSE_KIND_LABEL[kind] ?? kind;
}

/** Linha unificada de despesa exibida na aba Despesas (de qualquer origem). */
export interface TruckExpenseLine {
  id: string;
  source: "truck" | "geral";
  kind: string | null;
  description: string | null;
  supplier: string | null;
  amount: number;
  status: string | null;
  occurred_at: string | null;
  due_date: string | null;
  notes: string | null;
  attachment_url: string | null;
}

/** Forma mínima compartilhada por `truck_expenses` e `general_expenses`. */
export interface TruckExpenseSource {
  id: string;
  kind?: string | null;
  category?: string | null;
  description?: string | null;
  supplier?: string | null;
  amount?: number | null;
  imperio_amount?: number | null;
  shared?: boolean | null;
  status?: string | null;
  occurred_at?: string | null;
  due_date?: string | null;
  notes?: string | null;
  attachment_url?: string | null;
}

/**
 * Valor efetivo de uma despesa geral — mesma regra do banco
 * (`fn_general_expense_effective_amount`) e dos relatórios do CRM
 * (`imperioShare`): compartilhada conta só a parte do Império; não
 * compartilhada conta o `amount` integral.
 */
export function generalExpenseAmount(r: TruckExpenseSource): number {
  return r.shared ? Number(r.imperio_amount ?? 0) : Number(r.amount ?? 0);
}

/**
 * Mescla `truck_expenses` com `general_expenses` (despesas gerais vinculadas ao
 * caminhão) na aba Despesas — ambas alimentam `trucks.expenses_total` no CRM.
 */
export function mergeTruckExpenses(
  expenses: TruckExpenseSource[] | null | undefined,
  generalExpenses: TruckExpenseSource[] | null | undefined,
): TruckExpenseLine[] {
  const truck = (expenses ?? []).map((e): TruckExpenseLine => ({
    id: `truck-${e.id}`,
    source: "truck",
    kind: e.kind ?? e.category ?? null,
    description: e.description ?? null,
    supplier: e.supplier ?? null,
    amount: Number(e.amount ?? 0),
    status: e.status ?? null,
    occurred_at: e.occurred_at ?? null,
    due_date: e.due_date ?? null,
    notes: e.notes ?? null,
    attachment_url: e.attachment_url ?? null,
  }));
  const geral = (generalExpenses ?? []).map((e): TruckExpenseLine => ({
    id: `geral-${e.id}`,
    source: "geral",
    kind: e.category ?? null,
    description: e.description ?? null,
    supplier: e.supplier ?? null,
    amount: generalExpenseAmount(e),
    status: e.status ?? null,
    occurred_at: e.occurred_at ?? null,
    due_date: e.due_date ?? null,
    notes: e.notes ?? null,
    attachment_url: e.attachment_url ?? null,
  }));
  return [...truck, ...geral].sort((a, b) => String(b.occurred_at ?? "").localeCompare(String(a.occurred_at ?? "")));
}

export interface TruckDealRef {
  id: string;
  truck_id: string | null;
  customer_id: string | null;
  stage: string | null;
  title: string;
  notes: string | null;
  value: number | null;
  priority: string | null;
  owner_id: string | null;
  occurred_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TruckCustomerRef {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  document?: string | null;
}

export interface TruckSaleResult {
  sold: boolean;
  soldAt: string | null;
  soldPrice: number | null;
  saleType: string | null;
  saleNotes: string | null;
  customerId: string | null;
  customer: TruckCustomerRef | null;
  /** Negociação/reserva que originou a venda (stage vendido/pos_venda). */
  saleDeal: TruckDealRef | null;
  /** Negociação ou reserva ativa (caminhão ainda não vendido). */
  activeDeal: TruckDealRef | null;
}

const SALE_STAGES = new Set(["vendido", "pos_venda"]);
const INTEREST_STAGES = new Set([
  "novo_lead",
  "contato_iniciado",
  "negociacao",
  "proposta_enviada",
  "aguardando_resposta",
  "aprovado",
]);

/**
 * Resolução do comprador via RELACIONAMENTO REAL (sold_customer_id →
 * deals.customer_id → customers.id). Nunca localiza cliente por nome.
 */
export function resolveTruckSale(opts: {
  truckId: string;
  truck: {
    status?: string | null;
    sold_at?: string | null;
    sold_customer_id?: string | null;
    sold_price?: number | null;
    sale_type?: string | null;
    sale_notes?: string | null;
  };
  deals: TruckDealRef[];
  customers: TruckCustomerRef[];
}): TruckSaleResult {
  const { truckId, truck, deals, customers } = opts;
  const trucksDeals = (deals ?? []).filter((d) => d.truck_id === truckId);
  const customersById = new Map((customers ?? []).map((c) => [c.id, c]));
  const getCustomer = (id?: string | null): TruckCustomerRef | null =>
    id ? customersById.get(id) ?? null : null;

  const saleDeal =
    trucksDeals.find((d) => SALE_STAGES.has(d.stage ?? "")) ?? null;
  const sold = truck.status === "vendido";

  if (sold) {
    const buyerId = truck.sold_customer_id ?? saleDeal?.customer_id ?? null;
    return {
      sold: true,
      soldAt: truck.sold_at ?? null,
      soldPrice: truck.sold_price != null ? Number(truck.sold_price) : null,
      saleType: truck.sale_type ?? null,
      saleNotes: truck.sale_notes ?? saleDeal?.notes ?? null,
      customerId: buyerId,
      customer: getCustomer(buyerId),
      saleDeal,
      activeDeal: null,
    };
  }

  const activeDeal =
    trucksDeals.find((d) => INTEREST_STAGES.has(d.stage ?? "")) ?? null;
  const interestedId = activeDeal?.customer_id ?? null;
  return {
    sold: false,
    soldAt: null,
    soldPrice: null,
    saleType: null,
    saleNotes: null,
    customerId: interestedId,
    customer: getCustomer(interestedId),
    saleDeal: null,
    activeDeal,
  };
}

/** Indicador de venda do cabeçalho. */
export function truckIndicator(
  status: string | null | undefined,
): "Vendido" | "Reservado" | "Disponível" | null {
  if (!status) return null;
  if (status === "vendido") return "Vendido";
  if (status === "reservado") return "Reservado";
  if (status === "disponivel" || status === "consignado") return "Disponível";
  return null;
}

export interface TruckDocumentRef {
  id: string;
  name: string;
  type: string | null;
  date: string | null;
  path: string | null;
  url: string | null;
  notes?: string | null;
}

export interface TruckDocSource {
  truckDocuments?: Array<{
    id: string;
    file_name: string;
    file_type: string | null;
    category: string | null;
    created_at: string;
    file_path: string;
  }>;
  documents?: Array<{
    id: string;
    title: string;
    kind: string | null;
    url: string | null;
    storage_path: string | null;
    mime_type: string | null;
    notes: string | null;
    created_at: string;
  }>;
}

/** Mescla documentos reais do caminhão (truck_documents + documents). */
export function truckDocumentsList(src: TruckDocSource | null | undefined): TruckDocumentRef[] {
  const out: TruckDocumentRef[] = [];
  for (const d of src?.truckDocuments ?? []) {
    if (!d.file_name) continue;
    out.push({
      id: `td-${d.id}`,
      name: d.file_name,
      type: d.file_type ?? d.category,
      date: d.created_at ?? null,
      path: d.file_path || null,
      url: null,
    });
  }
  for (const d of src?.documents ?? []) {
    if (!d.title) continue;
    out.push({
      id: `doc-${d.id}`,
      name: d.title,
      type: d.kind ?? d.mime_type,
      date: d.created_at ?? null,
      path: d.storage_path || null,
      url: d.url || null,
      notes: d.notes,
    });
  }
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}