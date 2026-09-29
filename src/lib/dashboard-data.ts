import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { monthKey, monthLabel, dateBR, brl as brlFmt, sumMoney, money } from "@/lib/format";

export type DashboardSnapshot = Awaited<ReturnType<typeof fetchDashboardSnapshot>>;

export async function fetchDashboardSnapshot() {
  const today = new Date();
  const startYear = new Date(today.getFullYear(), 0, 1).toISOString();
  const start12m = new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString();

  const next30 = new Date(today.getTime() + 30 * 86400000).toISOString();
  // Este módulo é chamado apenas pelo Executivo (useMobileFinance é gated por
  // isAdmin). Usa consultas diretas reutilizando as políticas RLS do CRM.
  const trucks = await supabase.from("trucks").select("*").not("status", "eq", "offline");
  const [deals, customers, leads, payables, receivables, banks, txs, expenses, commissions, goals, employees, events, generalExp, services, purchaseInst] = await Promise.all([
    supabase.from("deals").select("id,stage,value,owner_id,truck_id,customer_id,title,created_at,updated_at"),
    supabase.from("customers").select("id,name,status,created_at"),
    supabase.from("leads").select("id,status,source,created_at,owner_id"),
    supabase.from("payables").select("id,description,supplier,amount,due_date,paid_at,status,category_id,truck_id,created_at,occurred_at"),
    supabase.from("receivables").select("id,description,amount,due_date,received_at,status,category_id,truck_id,customer_id,created_at,occurred_at"),
    supabase.from("bank_accounts").select("id,name,current_balance,active").eq("active", true),
    supabase.from("bank_transactions").select("id,amount,type,occurred_at,category_id").gte("occurred_at", start12m),
    supabase.from("truck_expenses").select("id,amount,truck_id,occurred_at,kind").gte("occurred_at", start12m.slice(0, 10)),
    supabase.from("commissions").select("id,amount,status,employee_id,paid_at,created_at,occurred_at"),
    supabase.from("goals").select("id,title,target_value,current_value,period,starts_at,ends_at,employee_id"),
    supabase.from("employees").select("id,full_name,salary,commission_amount,status").eq("status", "ativo"),
    supabase.from("calendar_events").select("id,title,description,starts_at,ends_at,type,priority,related_truck_id,related_deal_id").gte("starts_at", today.toISOString()).lte("starts_at", next30),
    supabase.from("general_expenses").select("id,amount,imperio_amount,c4_amount,shared,occurred_at,category,description,truck_id,purchase_installment_id,status").gte("occurred_at", start12m.slice(0, 10)),
    supabase.from("services").select("id,title,status,expected_at,completed_at,truck_id,value,created_at"),
    supabase.from("truck_purchase_installments").select("*"),
  ]);

  return {
    trucks: (trucks.data ?? []) as Tables<"trucks">[],
    deals: (deals.data ?? []) as Tables<"deals">[],
    customers: (customers.data ?? []) as Tables<"customers">[],
    leads: (leads.data ?? []) as Tables<"leads">[],
    payables: (payables.data ?? []) as Tables<"payables">[],
    receivables: (receivables.data ?? []) as Tables<"receivables">[],
    banks: (banks.data ?? []) as Tables<"bank_accounts">[],
    txs: (txs.data ?? []) as Tables<"bank_transactions">[],
    expenses: (expenses.data ?? []) as Tables<"truck_expenses">[],
    commissions: (commissions.data ?? []) as Tables<"commissions">[],
    goals: (goals.data ?? []) as Tables<"goals">[],
    employees: (employees.data ?? []) as Tables<"employees">[],
    events: (events.data ?? []) as Tables<"calendar_events">[],
    generalExp: (generalExp.data ?? []) as Tables<"general_expenses">[],
    services: (services.data ?? []) as Tables<"services">[],
    purchaseInst: (purchaseInst.data ?? []) as Tables<"truck_purchase_installments">[],
    refs: { today, startYear, start12m },
  };
}

/**
 * Valor efetivo da Império numa despesa geral.
 *
 * O CRM tem DUAS funções diferentes e elas não concordam entre si:
 * 1. `imperioShare` do DASHBOARD (`dashboard-data.ts:55-58`) — usada nos KPIs:
 *      compartilhada → `imperio_amount ?? 0`; não compartilhada →
 *      `imperio_amount ?? amount ?? 0` (prefere `imperio_amount`).
 * 2. Ternária dos RELATÓRIOS (`monthly-report-data.ts:160`,
 *    `weekly-report-data.ts:102`) — `shared ? imperio_amount : amount || 0`
 *    (não compartilhada prefere `amount`).
 * Replicamos as duas exatamente como estão; ver `reportExpenseValue` abaixo.
 */
export function imperioShare(r: { shared?: boolean | null; amount?: number | null; imperio_amount?: number | null }) {
  if (r.shared) return Number(r.imperio_amount ?? 0);
  return Number(r.imperio_amount ?? r.amount ?? 0);
}

/**
 * Regra dos RELATÓRIOS do CRM mensal (`genEffective`): compartilhada usa a
 * parte Império; não compartilhada usa `amount` e só cai para `imperio_amount`
 * se `amount` vier nulo.
 */
export const reportExpenseValue = (r: { shared?: boolean | null; amount?: number | null; imperio_amount?: number | null }) =>
  money(r.shared ? (r.imperio_amount ?? 0) : (r.amount ?? r.imperio_amount ?? 0));

const isAcquisitionPayment = (r: { category?: string | null; purchase_installment_id?: string | null }) =>
  r?.category === "custo_aquisicao" || !!r?.purchase_installment_id;

/**
 * Converte "YYYY-MM-DD..." em data LOCAL (nunca UTC). `new Date("2026-09-14")`
 * é meia-noite UTC e vira 13/09 21:00 em UTC-3, o que jogava a venda de
 * segunda-feira para a semana anterior. Mesma regra usada nos relatórios.
 */
const parseLocalDay = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateOnly = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const completedSale = (status?: string | null) => status === "vendido" || status === "repasse";
const activeStock = (status?: string | null) =>
  !!status && ["disponivel", "consignado", "patio", "oficina", "pintura", "despachante", "reservado", "negociacao"].includes(status);

/**
 * ────────────────────────────────────────────────────────────────────────────
 * REPLICAÇÃO BIT A BIT DO CRM — `imperiocaminhoes-com-br/src/lib/dashboard-data.ts`
 * ────────────────────────────────────────────────────────────────────────────
 * Os comparadores abaixo são os MESMOS do CRM, bugs inclusive. Em especial:
 * - `new Date(a)` interpreta a coluna `date` (sold_at/update_at são `date` no
 *   banco) como meia-noite UTC, que no Brasil (UTC-3) vira o dia ANTERIOR às
 *   21:00. O CRM tem esse deslocamento; o APP mantém para os números baterem.
 * - A janela do KPI é DOMINGO→SÁBADO (`start - getDay()`), diferente do
 *   relatório semanal (segunda→domingo em `relatorios.semanal.tsx`).
 */
const crmSameDay = (a: string, b: Date) => dayStart(parseLocalDay(a) ?? new Date(a)).getTime() === dayStart(b).getTime();
const crmSameWeek = (a: string, b: Date) => {
  const da = parseLocalDay(a) ?? new Date(a);
  const start = new Date(b);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return da >= start && da < end;
};
const crmSameMonth = (a: string, b: Date) => { const d = parseLocalDay(a) ?? new Date(a); return d.getMonth() === b.getMonth() && d.getFullYear() === b.getFullYear(); };
const crmSameYear = (a: string, b: Date) => (parseLocalDay(a) ?? new Date(a)).getFullYear() === b.getFullYear();
/** Receita do CRM: `t.sold_at || t.updated_at` (fallback proposital). */
const crmSoldOn = (t: Tables<"trucks">) => t?.sold_at || t?.updated_at || null;

/** Segunda-feira da semana (CRM: `getStartOfWeek` — dia 0 = domingo retroage 6). */
const startOfWeek = (ref: Date) => {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

export function computeExecutiveKpis(s: DashboardSnapshot) {
  const today = s.refs.today;
  const sold = s.trucks.filter((t) => completedSale(t.status));
  const pricedSold = sold.filter((t) => t.sold_price != null);
  const stock = s.trucks.filter((t) => activeStock(t.status));
  const inDeal = s.trucks.filter((t) => t.status === "negociacao" || t.status === "reservado");

  const revenueOf = (inPeriod: (d: string) => boolean) =>
    pricedSold.filter((t) => crmSoldOn(t) && inPeriod(crmSoldOn(t) as string))
      .reduce((acc, t) => acc + Number(t.sold_price ?? 0), 0);
  const revDay = revenueOf((d) => crmSameDay(d, today));
  const revWeek = revenueOf((d) => crmSameWeek(d, today));
  const revMonth = revenueOf((d) => crmSameMonth(d, today));
  const revYear = revenueOf((d) => crmSameYear(d, today));

  // KPIs idênticos ao CRM (`computeExecutiveKpis` do dashboard): lucro bruto e
  // líquido são ACUMULADOS de todos os vendidos (lifetime); opex = contas pagas
  // (status "pago") + despesas gerais dos últimos 12 meses. Despesas gerais
  // vinculadas a caminhões ficam fora para não duplicar o `expenses_total`.
  const grossProfit = pricedSold.reduce((s, t) => s + (Number(t.sold_price) - Number(t.purchase_price ?? 0)), 0);
  const totalExpenses = sumMoney((pricedSold || []).map((t) => t?.expenses_total));
  const netProfit = money(grossProfit - totalExpenses);

  // CRM (dashboard-data.ts:102-103): gerais SEM filtro de status e como a
  // `imperioShare` do CRM (não compartilhada prefere imperio_amount).
  const generalOpex = (s.generalExp ?? [])
    .filter((r) => !r?.truck_id && !isAcquisitionPayment(r))
    .reduce((sum, r) => sum + imperioShare(r), 0);
  const opex = s.payables.filter((p) => p.status === "pago").reduce((s, r) => s + Number(r.amount ?? 0), 0) + generalOpex;

  const stockExpenses = s.expenses.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const margins = pricedSold
    .map((t) => {
      const revenue = Number(t.sold_price ?? 0);
      const cost = sumMoney([t.purchase_price, t.expenses_total]);
      return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    })
    .filter((n) => Number.isFinite(n));
  const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  const rois = pricedSold
    .map((t) => {
      const cost = sumMoney([t.purchase_price, t.expenses_total]);
      const revenue = Number(t.sold_price ?? 0);
      return cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
    })
    .filter((n) => Number.isFinite(n));
  const avgRoi = rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : 0;
  // CRM (dashboard-data.ts:100): divisão crua, sem money().
  const pricedSoldThisMonth = pricedSold.filter((t) => crmSoldOn(t) && crmSameMonth(crmSoldOn(t) as string, today));
  const ticketAvg = pricedSoldThisMonth.length ? revMonth / pricedSoldThisMonth.length : 0;

  // CRM (dashboard-data.ts:105): soma simples, sem money().
  const balance = s.banks.reduce((s, b) => s + Number(b.current_balance ?? 0), 0);

  // CRM (dashboard-data.ts:107-109): SOMENTE status "aberto". "vencido" e
  // "cancelado" ficam fora por causa do filtro estrito — não os adicionar.
  const openReceivable = s.receivables.filter((r) => r.status === "aberto").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const openPayable = s.payables.filter((p) => p.status === "aberto").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const openPurchase = (s.purchaseInst ?? []).filter((p) => p.status === "pendente").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const profitForecast = money(openReceivable - openPayable - openPurchase);

  // CRM (dashboard-data.ts:112): `expected_price ?? purchase_price`, sem money().
  const salesForecast = inDeal.reduce((s, t) => s + Number(t.expected_price || t.purchase_price || 0), 0);

  const goalsHit = s.goals.filter((g) => Number(g.current_value ?? 0) >= Number(g.target_value ?? 0)).length;

  return {
    revDay, revWeek, revMonth, revYear,
    grossProfit, netProfit, avgRoi, avgMargin, ticketAvg,
    soldCount: sold.length, inDealCount: inDeal.length, stockCount: stock.length,
    opex, stockExpenses, balance,
    profitForecast, salesForecast,
    goalsHit, goalsTotal: s.goals.length,
  };
}

/* ============================================================
   RELATÓRIOS FINANCEIROS (mensal e semanal) — exclusivo Executivo
   ============================================================ */

export interface PeriodReport {
  key: string;
  label: string;
  rangeLabel: string;
  /** Σ `sold_price` dos trucks com `sold_at` no período. */
  receita: number;
  /** Componente do CMV: Σ `purchase_price` dos vendidos. */
  custoCompra: number;
  /** Componente do CMV: Σ `expenses_total` dos vendidos (lifetime do truck). */
  despesasCaminhao: number;
  /** `costC` do CRM: Σ(purchase_price + expenses_total) dos vendidos. */
  custoTotal: number;
  /** DRE: Σ `purchase_price` dos trucks com `purchase_date` no período. */
  custoAquisicao: number;
  /** Despesas dos caminhões vendidos (`expenses_total`), já incluídas no CMV. */
  despesasDiretas: number;
  /** Despesas gerais/OPEX do período, sem duplicar despesas de caminhão. */
  despesasGerais: number;
  /** Alias para despesas do período do CRM. */
  opex: number;
  /** CRM do card: `receita − purchase_price`. */
  lucroBruto: number;
  margemBruta: number;
  /** CRM do card: `lucroBruto − expenses_total`. */
  lucroLiquidoCaminhoes: number;
  margemLiquidaCaminhoes: number;
  /** Mantido para gráficos: mesmo valor de `resultadoGlobal`. */
  lucroOperacional: number;
  margemOperacional: number;
  /** CRM do card: `lucroLiquidoCaminhoes − despesas do período`. */
  resultadoGlobal: number;
  margemGlobal: number;
  roiPeriodo: number;
  vendas: number;
  compras: number;
  entradas: number;
  saidas: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const dmy = (d: Date | null) => (d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : "—");

/**
 * Relatório de um período ([start, end] — ambos datas-calendário, inclusive).
 *
 * ESPELHO BIT A BIT do CRM, bugs inclusive:
 * `relatorios/mensal-executivo` (`monthly-report-data.ts`) e
 * `relatorios/semanal` (`weekly-report-data.ts`).
 *
 * Receita: `trucks` com `sold_at` no período. O CRM não filtra status aqui.
 * Compra dos veículos: Σ `purchase_price` DOS VENDIDOS.
 * Despesas diretas: Σ `expenses_total` DOS VENDIDOS — lifetime do caminhão.
 * Despesas gerais/OPEX: `general_expenses` ativas, sem `truck_id` e sem
 *   aquisição. Despesas vinculadas a caminhão já aparecem em `expenses_total`;
 *   aquisições são compra, não OPEX.
 * Cards do CRM:
 *   - Lucro bruto = faturamento − compra dos veículos.
 *   - Lucro líquido caminhões = lucro bruto − despesas diretas.
 *   - Resultado líquido global = lucro líquido caminhões − despesas do período.
 * Compras: investimento em caminhões: compras do período (exceto offline e
 *   exceto caminhões já pagos por lançamento de aquisição) + pagamentos de
 *   aquisição em `general_expenses`.
 * Entradas/Saídas: vencimento (`due_date`) no período e quitado
 *   (`status === "pago"` OU `received_at`/`paid_at`). Sem filtro de cancelado.
 *   `monthly-report-data.ts:108-109,374-393`.
 */
export function computePeriodReport(
  s: DashboardSnapshot,
  start: Date,
  end: Date,
  mode: "week" | "month" = "month",
): PeriodReport {
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const until = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  until.setHours(23, 59, 59, 999);
  const fromISO = `${from.getFullYear()}-${pad2(from.getMonth() + 1)}-${pad2(from.getDate())}`;
  const untilISO = `${until.getFullYear()}-${pad2(until.getMonth() + 1)}-${pad2(until.getDate())}`;
  const inPeriod = (iso?: string | null) => {
    const d = dateOnly(iso);
    return !!d && d >= fromISO && d <= untilISO;
  };
  const sold = (s.trucks ?? []).filter((t) => inPeriod(t?.sold_at));
  const receita = sumMoney(sold.map((t) => t?.sold_price));
  const custoCompra = sumMoney(sold.map((t) => t?.purchase_price));
  const despesasCaminhao = sumMoney(sold.map((t) => t?.expenses_total));
  const custoTotal = money(custoCompra + despesasCaminhao);

  // OPEX do card: somente despesas gerais não duplicadas. Contas/despesas
  // vinculadas a caminhão já foram absorvidas em `expenses_total`.
  const opexGeral = sumMoney(
    (s.generalExp ?? [])
      .filter(
        (r) =>
          inPeriod(r?.occurred_at) &&
          r?.status !== "cancelado" &&
          !r?.truck_id &&
          !isAcquisitionPayment(r),
      )
      .map(reportExpenseValue),
  );
  const opex = money(opexGeral);

  // Compras do período (`calculatePurchases`): caminhões comprados, excluindo
  // offline e caminhões já representados por pagamento de aquisição, + pagamentos.
  const acquisitionPayments = (s.generalExp ?? []).filter((r) => inPeriod(r?.occurred_at) && isAcquisitionPayment(r));
  const paidTruckIds = new Set(acquisitionPayments.filter((r) => r?.truck_id).map((r) => r.truck_id));
  const comprasCaminhoes = sumMoney(
    (s.trucks ?? [])
      .filter((t) => inPeriod(t?.purchase_date) && String(t?.status) !== "offline" && !paidTruckIds.has(t.id))
      .map((t) => t?.purchase_price),
  );
  const compras = money(comprasCaminhoes + sumMoney(acquisitionPayments.map(reportExpenseValue)));

  const lucroBruto = money(receita - custoCompra);
  const lucroLiquidoCaminhoes = money(lucroBruto - despesasCaminhao);
  const resultadoGlobal = money(lucroLiquidoCaminhoes - opex);
  const lucroOperacional = resultadoGlobal;

  // CRM: `status === "pago" || received_at`. Em receivable o status "pago" NUNCA
  // casa (o enum é aberto|recebido|vencido|cancelado) — replicamos só o
  // `received_at`, que é o efeito real da expressão do CRM.
  const entradas = sumMoney(
    (s.receivables ?? [])
      .filter((r) => inPeriod(r?.due_date) && !!r?.received_at)
      .map((r) => r?.amount),
  );
  const saidas = sumMoney(
    (s.payables ?? [])
      .filter((p) => inPeriod(p?.due_date) && (p?.status === "pago" || !!p?.paid_at))
      .map((p) => p?.amount),
  );

  return {
    key: mode === "week" ? "week" : "month",
    label: "",
    rangeLabel: "",
    receita,
    custoCompra,
    despesasCaminhao,
    custoTotal,
    custoAquisicao: compras,
    despesasDiretas: despesasCaminhao,
    despesasGerais: opex,
    lucroBruto,
    margemBruta: receita > 0 ? (lucroBruto / receita) * 100 : 0,
    opex,
    lucroLiquidoCaminhoes,
    margemLiquidaCaminhoes: receita > 0 ? (lucroLiquidoCaminhoes / receita) * 100 : 0,
    lucroOperacional,
    margemOperacional: receita > 0 ? (lucroOperacional / receita) * 100 : 0,
    resultadoGlobal,
    margemGlobal: receita > 0 ? (resultadoGlobal / receita) * 100 : 0,
    roiPeriodo: custoTotal > 0 ? (lucroLiquidoCaminhoes / custoTotal) * 100 : 0,
    vendas: sold.length,
    compras,
    entradas,
    saidas,
  };
}

const weekOfYear = (d: Date) => {
  const base = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - base.getTime()) / 86400000 + base.getDay() + 1) / 7);
};

/** Relatório mensal referente a um mês específico (qualquer dia do mês). */
export function computeMonthReport(s: DashboardSnapshot, ref: Date): PeriodReport {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return {
    ...computePeriodReport(s, start, end, "month"),
    key: monthKey(ref),
    label: monthLabel(monthKey(ref)),
    rangeLabel: `${dmy(start)} – ${dmy(end)}`,
  };
}

/** Relatório semanal (segunda a domingo, como o CRM) contendo `ref`. */
export function computeWeekReport(s: DashboardSnapshot, ref: Date): PeriodReport {
  const start = startOfWeek(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    ...computePeriodReport(s, start, end, "week"),
    key: `${start.getFullYear()}-W${String(weekOfYear(start)).padStart(2, "0")}`,
    label: `Semana ${weekOfYear(start)}`,
    rangeLabel: `${dmy(start)} – ${dmy(end)}`,
  };
}

/** Séries mensais (mais antigas primeiro) — relatório mensal do Executivo. */
export function computeMonthlyReports(s: DashboardSnapshot, months = 12): PeriodReport[] {
  const today = s.refs.today;
  const out: PeriodReport[] = [];
  for (let i = months - 1; i >= 0; i--) {
    out.push(computeMonthReport(s, new Date(today.getFullYear(), today.getMonth() - i, 1)));
  }
  return out;
}

/** Séries semanais (mais antigas primeiro) — relatório semanal do Executivo. */
export function computeWeeklyReports(s: DashboardSnapshot, weeks = 8): PeriodReport[] {
  const today = s.refs.today;
  const out: PeriodReport[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    out.push(computeWeekReport(s, new Date(today.getFullYear(), today.getMonth(), today.getDate() - i * 7)));
  }
  return out;
}

export function computeMonthlySeries(s: DashboardSnapshot, months = 12) {
  const today = s.refs.today;
  const arr: { key: string; mes: string; vendas: number; receita: number; lucro: number; despesas: number; entradas: number; saidas: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const r = computeMonthReport(s, new Date(today.getFullYear(), today.getMonth() - i, 1));
    arr.push({
      key: r.key,
      mes: r.label,
      vendas: r.vendas,
      receita: r.receita,
      lucro: r.lucroOperacional,
      despesas: r.opex,
      entradas: r.entradas,
      saidas: r.saidas,
    });
  }
  return arr;
}

export function computeFunnel(s: DashboardSnapshot) {
  const stages = [
    ["novo_lead", "Novo Lead"],
    ["contato_iniciado", "Contato"],
    ["proposta_enviada", "Proposta"],
    ["negociacao", "Negociação"],
    ["aguardando_resposta", "Aguardando"],
    ["aprovado", "Aprovado"],
    ["vendido", "Vendido"],
    ["pos_venda", "Pós-venda"],
  ] as const;
  return stages.map(([k, label]) => ({
    stage: label,
    value: s.deals.filter((d) => d.stage === k).length,
  }));
}

export function computeTopTrucks(s: DashboardSnapshot, n = 6) {
  return (s.trucks || [])
    .filter((t) => t?.status === "vendido")
    .map((t) => {
      const revenue = Number(t.sold_price ?? 0);
      const cost = sumMoney([t.purchase_price, t.expenses_total]);
      const lucro = money(revenue - cost);
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
      return { id: t.id, label: `${t.brand} ${t.model}${t.year ? ` ${t.year}` : ""}`, lucro, roi, receita: revenue };
    })
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, n);
}

export function computeAgingStock(s: DashboardSnapshot) {
  const today = s.refs.today.getTime();
  return (s.trucks || [])
    .filter((t) => !t?.sold_at && (t?.status === "disponivel" || t.status === "consignado"))
    .map((t) => {
      const start = new Date(t.purchase_date ?? t.created_at).getTime();
      const days = Math.max(0, Math.floor((today - start) / 86400000));
      return { id: t.id, label: `${t.brand} ${t.model}`, dias: days, capital: Number(t.purchase_price ?? 0) + Number(t.expenses_total ?? 0) };
    })
    .sort((a, b) => b.dias - a.dias);
}

export function computeAlerts(s: DashboardSnapshot, kpis: ReturnType<typeof computeExecutiveKpis>) {
  const today = s.refs.today;
  const todayStr = today.toISOString().slice(0, 10);
  const aging = computeAgingStock(s);
  const alerts: { id: string; severity: "critical" | "warning" | "info"; title: string; description: string; link?: string }[] = [];

  aging.filter((a) => a.dias > 90).slice(0, 5).forEach((a) =>
    alerts.push({ id: `aging-${a.id}`, severity: "warning", title: `Caminhão parado há ${a.dias} dias`, description: `${a.label} · capital imobilizado de ${brl(a.capital)}`, link: `/estoque/${a.id}` }),
  );

  (s.payables || []).filter((p) => p?.status === "aberto" && p.due_date <= todayStr).slice(0, 5).forEach((p) =>
    alerts.push({ id: `pay-${p.id}`, severity: "critical", title: `Conta vencida · ${brl(Number(p.amount))}`, description: `Vencimento em ${dateBR(p.due_date)}`, link: "/financeiro/contas-pagar" }),
  );

  (s.receivables || []).filter((r) => r?.status === "aberto" && r.due_date <= todayStr).slice(0, 5).forEach((r) =>
    alerts.push({ id: `rec-${r.id}`, severity: "warning", title: `Boleto vencido · ${brl(Number(r.amount))}`, description: `Vencimento em ${dateBR(r.due_date)}`, link: "/financeiro/contas-receber" }),
  );

  if (kpis.avgMargin > 0 && kpis.avgMargin < 8) {
    alerts.push({ id: "low-margin", severity: "warning", title: `Margem média baixa: ${kpis.avgMargin.toFixed(1)}%`, description: "Avalie revisão de preços e despesas operacionais." });
  }

  (s.trucks || []).filter((t) => t?.status === "vendido").forEach((t) => {
    const cost = Number(t.purchase_price ?? 0) + Number(t.expenses_total ?? 0);
    if (Number(t.sold_price ?? 0) < cost) {
      alerts.push({ id: `loss-${t.id}`, severity: "critical", title: `Possível prejuízo: ${t.brand} ${t.model}`, description: `Receita ${brl(Number(t.sold_price))} < custo ${brl(cost)}`, link: `/estoque/${t.id}` });
    }
  });

  (s.goals || []).forEach((g) => {
    const pct = Number(g.target_value) > 0 ? (Number(g.current_value) / Number(g.target_value)) * 100 : 0;
    if (pct < 50 && new Date(g.ends_at) < new Date(today.getTime() + 14 * 86400000)) {
      alerts.push({ id: `goal-${g.id}`, severity: "warning", title: `Meta abaixo: ${g.title}`, description: `${pct.toFixed(0)}% atingido · prazo em ${new Date(g.ends_at).toLocaleDateString("pt-BR")}` });
    }
  });

  return alerts.slice(0, 12);
}

const brl = (n: number) => brlFmt(n);

// ============================================================
// DAILY ALERTS CENTER — operational view (today / upcoming / overdue)
// ============================================================
export type DailyAlertCategory = "financeiro" | "servico" | "garantia" | "agenda" | "estoque";
export type DailyAlertBucket = "atrasado" | "hoje" | "proximos" | "prioritario";
export type DailyAlert = {
  id: string;
  bucket: DailyAlertBucket;
  category: DailyAlertCategory;
  priority: "alta" | "media" | "baixa";
  title: string;
  subtitle?: string;
  detail?: string;
  amount?: number;
  date: string; // ISO
  time?: string;
  link?: string;
};

const daysBetween = (a: Date, b: Date) => Math.floor((dayStart(a).getTime() - dayStart(b).getTime()) / 86400000);

export function computeDailyAlerts(s: DashboardSnapshot, horizonDays = 7): DailyAlert[] {
  const today = dayStart(s.refs.today);
  const out: DailyAlert[] = [];

  const bucketOf = (dateISO: string): DailyAlertBucket | null => {
    const d = dayStart(new Date(dateISO));
    const diff = daysBetween(d, today);
    if (diff < 0) return "atrasado";
    if (diff === 0) return "hoje";
    if (diff <= horizonDays) return "proximos";
    return null;
  };

  const truckById = new Map(s.trucks.map((t) => [t.id, t]));
  const truckLabel = (id?: string | null) => {
    if (!id) return undefined;
    const t = truckById.get(id);
    return t ? `${t.brand} ${t.model}${t.year ? ` ${t.year}` : ""}${t.plate ? ` · ${t.plate}` : ""}` : undefined;
  };

  // FINANCEIRO — contas a pagar
  (s.payables || []).filter((p) => p?.status === "aberto").forEach((p) => {
    const b = bucketOf(p.due_date);
    if (!b) return;
    out.push({
      id: `pay-${p.id}`,
      bucket: b,
      category: "financeiro",
      priority: b === "atrasado" ? "alta" : b === "hoje" ? "alta" : "media",
      title: p.description || "Conta a pagar",
      subtitle: p.supplier || truckLabel(p.truck_id),
      detail: b === "atrasado" ? `Vencida há ${Math.abs(daysBetween(new Date(p.due_date), today))} dia(s)` : b === "hoje" ? "Vence hoje" : `Vence em ${daysBetween(new Date(p.due_date), today)} dia(s)`,
      amount: Number(p.amount ?? 0),
      date: p.due_date,
    });
  });

  // FINANCEIRO — contas a receber
  (s.receivables || []).filter((r) => r?.status === "aberto").forEach((r) => {
    const b = bucketOf(r.due_date);
    if (!b) return;
    out.push({
      id: `rec-${r.id}`,
      bucket: b,
      category: "financeiro",
      priority: b === "atrasado" ? "alta" : "media",
      title: r.description || "Boleto a receber",
      subtitle: truckLabel(r.truck_id),
      detail: b === "atrasado" ? `Atrasado há ${Math.abs(daysBetween(new Date(r.due_date), today))} dia(s)` : b === "hoje" ? "Recebimento hoje" : `Receber em ${daysBetween(new Date(r.due_date), today)} dia(s)`,
      amount: Number(r.amount ?? 0),
      date: r.due_date,
    });
  });

  // SERVIÇOS — previsão de entrega (somente pendentes/em andamento)
  (s.services ?? []).forEach((sv) => {
    if (!sv.expected_at) return;
    if (sv.status === "concluido" || sv.status === "cancelado") return;
    if (sv.completed_at) return;
    const b = bucketOf(sv.expected_at);
    if (!b) return;

    const diff = daysBetween(new Date(sv.expected_at), today);
    out.push({
      id: `svc-${sv.id}`,
      bucket: b,
      category: "servico",
      priority: b === "atrasado" ? "alta" : b === "hoje" ? "alta" : "media",
      title: sv.title || "Serviço",
      subtitle: truckLabel(sv.truck_id),
      detail: b === "atrasado" ? `Atrasado há ${Math.abs(diff)} dia(s)` : b === "hoje" ? "Entrega prevista hoje" : `Entrega em ${diff} dia(s)`,
      amount: Number(sv.value ?? 0) || undefined,
      date: sv.expected_at,
    });
  });

  // GARANTIAS — caminhões com garantia próximas do vencimento
  (s.trucks || []).forEach((t) => {
    if (!t.warranty_end) return;
    const b = bucketOf(t.warranty_end);
    if (!b) return;
    const diff = daysBetween(new Date(t.warranty_end), today);
    out.push({
      id: `war-${t.id}`,
      bucket: b,
      category: "garantia",
      priority: b === "atrasado" || b === "hoje" ? "alta" : "media",
      title: `Garantia · ${t.brand} ${t.model}`,
      subtitle: t.plate ? `Placa ${t.plate}` : undefined,
      detail: b === "atrasado" ? `Encerrada há ${Math.abs(diff)} dia(s)` : b === "hoje" ? "Encerra hoje" : `Encerra em ${diff} dia(s)`,
      date: t.warranty_end,
    });
  });

  // AGENDA — compromissos
  (s.events ?? []).forEach((ev) => {
    const b = bucketOf(ev.starts_at);
    if (!b) return;
    const d = new Date(ev.starts_at);
    out.push({
      id: `evt-${ev.id}`,
      bucket: b,
      category: "agenda",
      priority: ev.priority === "alta" ? "alta" : ev.priority === "baixa" ? "baixa" : "media",
      title: ev.title || "Compromisso",
      subtitle: ev.description || undefined,
      detail: b === "hoje" ? "Hoje" : b === "atrasado" ? "Atrasado" : `Em ${daysBetween(d, today)} dia(s)`,
      date: ev.starts_at,
      time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    });
  });

  // COMPRA CAMINHÃO — parcelas a pagar
  (s.purchaseInst ?? []).filter((p) => p.status === "pendente").forEach((p) => {
    const b = bucketOf(p.due_date);
    if (!b) return;
    out.push({
      id: `pur-${p.id}`,
      bucket: b,
      category: "financeiro",
      priority: b === "atrasado" ? "alta" : b === "hoje" ? "alta" : "media",
      title: `Parcela Compra · ${p.installment_number}/${p.total_installments}`,
      subtitle: truckLabel(p.truck_id),
      detail: b === "atrasado" ? `Vencida há ${Math.abs(daysBetween(new Date(p.due_date), today))} dia(s)` : b === "hoje" ? "Vence hoje" : `Vence em ${daysBetween(new Date(p.due_date), today)} dia(s)`,
      amount: Number(p.amount ?? 0),
      date: p.due_date,
    });
  });

  return out;
}

