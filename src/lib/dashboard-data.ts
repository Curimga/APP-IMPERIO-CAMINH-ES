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
  const trucks = await supabase.from("trucks").select("*");
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
    supabase.from("general_expenses").select("id,amount,imperio_amount,c4_amount,shared,occurred_at,category,description,truck_id,purchase_installment_id").gte("occurred_at", start12m.slice(0, 10)),
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
 * Valor efetivo da Império numa despesa geral — espelho EXATO do `F` do CRM
 * (`monthly-report-data` / `weekly-report-data`): compartilhada →
 * `imperio_amount` (senão 0); NÃO compartilhada → `amount` (senão
 * `imperio_amount`). Para não-compartilhada o CRM prioriza o `amount` integral,
 * mesmo que `imperio_amount` esteja preenchido.
 */
export function imperioShare(r: { shared?: boolean | null; amount?: number | null; imperio_amount?: number | null }) {
  return r.shared ? Number(r.imperio_amount ?? 0) : Number(r.amount ?? r.imperio_amount ?? 0);
}

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const sameDay = (a: string, b: Date) => dayStart(new Date(a)).getTime() === dayStart(b).getTime();
const sameWeek = (a: string, b: Date) => {
  const da = new Date(a); const start = new Date(b); start.setDate(start.getDate() - start.getDay()); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return da >= start && da < end;
};
const sameMonth = (a: string, b: Date) => { const d = new Date(a); return d.getMonth() === b.getMonth() && d.getFullYear() === b.getFullYear(); };
const sameYear = (a: string, b: Date) => new Date(a).getFullYear() === b.getFullYear();

export function computeExecutiveKpis(s: DashboardSnapshot) {
  const today = s.refs.today;
  const sold = s.trucks.filter((t) => t.status === "vendido");
  const stock = s.trucks.filter((t) => t.status === "disponivel" || t.status === "consignado");
  const inDeal = s.trucks.filter((t) => t.status === "negociacao" || t.status === "reservado");

  const revDay = sold.filter((t) => sameDay(t.sold_at || t.updated_at, today)).reduce((s, t) => s + Number(t.sold_price ?? 0), 0);
  const revWeek = sold.filter((t) => sameWeek(t.sold_at || t.updated_at, today)).reduce((s, t) => s + Number(t.sold_price ?? 0), 0);
  const revMonth = sold.filter((t) => sameMonth(t.sold_at || t.updated_at, today)).reduce((s, t) => s + Number(t.sold_price ?? 0), 0);
  const revYear = sold.filter((t) => sameYear(t.sold_at || t.updated_at, today)).reduce((s, t) => s + Number(t.sold_price ?? 0), 0);

  // KPIs idênticos ao CRM (`computeExecutiveKpis` do dashboard): lucro bruto e
  // líquido são ACUMULADOS de todos os vendidos (lifetime); opex = contas pagas
  // (status "pago") + despesas gerais dos últimos 12 meses. Espelho EXATO do CRM.
  const grossProfit = sold.reduce((s, t) => s + (Number(t.sold_price ?? 0) - Number(t.purchase_price ?? 0)), 0);
  const totalExpenses = sumMoney((sold || []).map((t) => t?.expenses_total));
  const netProfit = money(grossProfit - totalExpenses);

  const generalOpex = (s.generalExp ?? []).reduce((sum, r) => sum + imperioShare(r), 0);
  const opex = s.payables.filter((p) => p.status === "pago").reduce((s, r) => s + Number(r.amount ?? 0), 0) + generalOpex;

  const stockExpenses = s.expenses.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const margins = sold
    .map((t) => {
      const revenue = Number(t.sold_price ?? 0);
      const cost = sumMoney([t.purchase_price, t.expenses_total]);
      return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    })
    .filter((n) => Number.isFinite(n));
  const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  const rois = sold
    .map((t) => {
      const cost = sumMoney([t.purchase_price, t.expenses_total]);
      const revenue = Number(t.sold_price ?? 0);
      return cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
    })
    .filter((n) => Number.isFinite(n));
  const avgRoi = rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : 0;
  const ticketAvg = sold.length ? sold.reduce((s, t) => s + Number(t.sold_price ?? 0), 0) / sold.length : 0;

  const balance = s.banks.reduce((s, b) => s + Number(b.current_balance ?? 0), 0);

  const openReceivable = s.receivables.filter((r) => r.status === "aberto").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const openPayable = s.payables.filter((p) => p.status === "aberto").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const openPurchase = (s.purchaseInst ?? []).filter((p) => p.status === "pendente").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const profitForecast = money(openReceivable - openPayable - openPurchase);

  const salesForecast = inDeal.reduce((s, t) => s + Number(t.expected_price ?? t.purchase_price ?? 0), 0);

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
  receita: number;
  custoCompra: number;
  despesasCaminhao: number;
  custoTotal: number;
  lucroBruto: number;
  margemBruta: number;
  opex: number;
  lucroLiquido: number;
  margemLiquida: number;
  resultadoGlobal: number;
  margemGlobal: number;
  vendas: number;
  compras: number;
  entradas: number;
  saidas: number;
}

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

const pad2 = (n: number) => String(n).padStart(2, "0");
const dmy = (d: Date | null) => (d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : "—");

/**
 * Relatório de um período ([start, end] — ambos datas-calendário, inclusive).
 *
 * Espelho EXATO do CRM (`relatorios/mensal-executivo` e `relatorios/semanal`):
 * - Receita: soma de `sold_price` dos caminhões com `sold_at` no período.
 * - Custo de compra: soma de `purchase_price` desses caminhões.
 * - Despesas de preparação: soma de `expenses_total` desses caminhões.
 * - Lucro bruto: Receita − Custo de compra − Despesas de preparação.
 * - Opex (mode "month"): contas a pagar VINCULADAS a caminhão (truck_id) no
 *   período pelo `occurred_at` + despesas gerais administrativas (não-compra e
 *   sem vínculo de caminhão). Opex (mode "week"): `truck_expenses` do período +
 *   despesas gerais não-compra (inclui vínculo de caminhão), com as gerais
 *   sobrepondo `truck_expenses` idênticas (mesmo truck_id|data|valor).
 * - Despesas gerais de COMPRA (`custo_aquisicao`/parcela de compra) NUNCA entram
 *   no opex — entram em Compras.
 * - Lucro líquido: Lucro bruto − Opex.
 * - Compras: `purchase_price` dos caminhões com `purchase_date` no período
 *   (fora do "offline" e que ainda não viraram despesa de compra) + despesas
 *   gerais de compra no período.
 * - Entradas/Saídas: recebíveis pagos / contas pagas com vencimento no período.
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
  const inPeriod = (iso?: string | null) => {
    const d = parseLocalDay(iso);
    return !!d && d >= from && d <= until;
  };

  const isPurchaseGeneral = (r: Tables<"general_expenses">) =>
    !!r && (r.category === "custo_aquisicao" || !!r.purchase_installment_id);

  // Vendas contam somente caminhões com `sold_price` preenchido (CRM: `P`/`je`).
  // O mensal ainda restringe ao status vendido/repasse (query `ge` do CRM);
  // o semanal não restringe por status (only `sold_at` + preço).
  const sold = (s.trucks ?? []).filter((t) => {
    if (!inPeriod(t?.sold_at) || t?.sold_price == null) return false;
    if (mode === "month" && t?.status !== "vendido" && t?.status !== "repasse") return false;
    return true;
  });
  const receita = money(sold.reduce((sum, t) => sum + Number(t?.sold_price ?? 0), 0));
  const custoCompra = money(sold.reduce((sum, t) => sum + Number(t?.purchase_price ?? 0), 0));
  const despesasCaminhao = money(sold.reduce((sum, t) => sum + Number(t?.expenses_total ?? 0), 0));
  const custoTotal = money(custoCompra + despesasCaminhao);

  let opex: number;
  if (mode === "week") {
    const gerais = (s.generalExp ?? []).filter((r) => !isPurchaseGeneral(r) && inPeriod(r.occurred_at));
    const overlap = new Set(
      gerais
        .filter((r) => r.truck_id)
        .map((r) => `${r.truck_id}|${(r.occurred_at ?? "").slice(0, 10)}|${imperioShare(r).toFixed(2)}`),
    );
    const truck = (s.expenses ?? [])
      .filter((r) => inPeriod(r.occurred_at))
      .filter(
        (r) =>
          !overlap.has(
            `${r.truck_id}|${(r.occurred_at ?? "").slice(0, 10)}|${Number(r.amount ?? 0).toFixed(2)}`,
          ),
      )
      .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    opex = money(truck + gerais.reduce((sum, r) => sum + imperioShare(r), 0));
  } else {
    const truck = (s.payables ?? [])
      .filter((p) => p?.truck_id && inPeriod(p.occurred_at))
      .reduce((sum, p) => sum + Number(p?.amount ?? 0), 0);
    const admin = (s.generalExp ?? [])
      .filter((r) => !isPurchaseGeneral(r) && !r?.truck_id && inPeriod(r.occurred_at))
      .reduce((sum, r) => sum + imperioShare(r), 0);
    opex = money(truck + admin);
  }

  // Definitions do CRM:
  // - Semanal: Lucro bruto = Receita − Custo − Preparação (="Lucro líquido dos
  //   caminhões"); Resultado (líquido global) = Lucro bruto − Despesas.
  // - Mensal:  Lucro bruto = Receita − Compra; Lucro Líquido (Caminhões) =
  //   Lucro bruto − Despesas Diretas; Resultado Global = Lucro bruto − OPEX.
  let lucroBruto: number;
  let lucroLiquido: number;
  let resultadoGlobal: number;
  if (mode === "week") {
    lucroBruto = money(receita - custoCompra - despesasCaminhao);
    lucroLiquido = money(lucroBruto - opex);
    resultadoGlobal = lucroLiquido;
  } else {
    lucroBruto = money(receita - custoCompra);
    lucroLiquido = money(lucroBruto - despesasCaminhao);
    resultadoGlobal = money(lucroBruto - opex);
  }

  const purchaseGenerals = (s.generalExp ?? []).filter((r) => isPurchaseGeneral(r) && inPeriod(r.occurred_at));
  const purchaseTruckIds = new Set(purchaseGenerals.filter((r) => r.truck_id).map((r) => r.truck_id as string));
  const compras = money(
    (s.trucks ?? [])
      .filter((t) => inPeriod(t?.purchase_date) && !purchaseTruckIds.has(t.id))
      .reduce((sum, t) => sum + Number(t?.purchase_price ?? 0), 0)
      + purchaseGenerals.reduce((sum, r) => sum + imperioShare(r), 0),
  );

  const entradas = money((s.receivables ?? [])
    .filter((r) => inPeriod(r.due_date))
    .filter((r) => r?.status === "recebido" || !!r?.received_at)
    .reduce((sum, r) => sum + Number(r?.amount ?? 0), 0));
  const saidas = money((s.payables ?? [])
    .filter((p) => inPeriod(p.due_date))
    .filter((p) => p?.status === "pago" || !!p?.paid_at)
    .reduce((sum, p) => sum + Number(p?.amount ?? 0), 0));

  return {
    key: "",
    label: "",
    rangeLabel: "",
    receita,
    custoCompra,
    despesasCaminhao,
    custoTotal,
    lucroBruto,
    margemBruta: receita > 0 ? (lucroBruto / receita) * 100 : 0,
    opex,
    lucroLiquido,
    margemLiquida: receita > 0 ? (lucroLiquido / receita) * 100 : 0,
    resultadoGlobal,
    margemGlobal: receita > 0 ? (resultadoGlobal / receita) * 100 : 0,
    vendas: sold.length,
    compras,
    entradas,
    saidas,
  };
}

/** Segunda-feira da semana (CRM: `getStartOfWeek` — dia 0 = domingo retroage 6). */
const startOfWeek = (ref: Date) => {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

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
      lucro: r.lucroLiquido,
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
    .filter((t) => t?.status === "disponivel" || t.status === "consignado")
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

