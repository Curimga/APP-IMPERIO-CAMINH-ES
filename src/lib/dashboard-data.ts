import { supabase } from "@/integrations/supabase/client";
import { monthKey, monthLabel, dateBR, brl as brlFmt, sumMoney, money } from "@/lib/format";

export type DashboardSnapshot = Awaited<ReturnType<typeof fetchDashboardSnapshot>>;

export async function fetchDashboardSnapshot() {
  const today = new Date();
  const startYear = new Date(today.getFullYear(), 0, 1).toISOString();
  const start12m = new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString();

  const next30 = new Date(today.getTime() + 30 * 86400000).toISOString();
  const [trucks, deals, customers, leads, payables, receivables, banks, txs, expenses, commissions, goals, employees, events, generalExp, services, purchaseInst] = await Promise.all([
    supabase.from("trucks").select("id,status,brand,model,year,plate,purchase_price,expected_price,sold_price,expenses_total,created_at,updated_at,purchase_date,sold_at,warranty_end,status_expected_end"),
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
    supabase.from("general_expenses").select("id,amount,imperio_amount,c4_amount,shared,occurred_at,category,description").gte("occurred_at", start12m.slice(0, 10)),
    supabase.from("services").select("id,title,status,expected_at,completed_at,truck_id,value,created_at"),
    supabase.from("truck_purchase_installments" as any).select("*"),
  ]);

  return {
    trucks: (trucks.data ?? []) as any[],
    deals: (deals.data ?? []) as any[],
    customers: (customers.data ?? []) as any[],
    leads: (leads.data ?? []) as any[],
    payables: (payables.data ?? []) as any[],
    receivables: (receivables.data ?? []) as any[],
    banks: (banks.data ?? []) as any[],
    txs: (txs.data ?? []) as any[],
    expenses: (expenses.data ?? []) as any[],
    commissions: (commissions.data ?? []) as any[],
    goals: (goals.data ?? []) as any[],
    employees: (employees.data ?? []) as any[],
    events: (events.data ?? []) as any[],
    generalExp: (generalExp.data ?? []) as any[],
    services: (services.data ?? []) as any[],
    purchaseInst: (purchaseInst.data ?? []) as any[],
    refs: { today, startYear, start12m },
  };
}

/**
 * Império's effective share of a general expense.
 */
export function imperioShare(r: { shared?: boolean | null; amount?: number | null; imperio_amount?: number | null }) {
  if (r.shared) return Number(r.imperio_amount ?? 0);
  return Number(r.imperio_amount ?? r.amount ?? 0);
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

  const grossProfit = sold.reduce((s, t) => s + (Number(t.sold_price ?? 0) - Number(t.purchase_price ?? 0)), 0);
  const totalExpenses = sumMoney((sold || []).map(t => t?.expenses_total));
  const netProfit = money(grossProfit - totalExpenses);
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

  const generalOpex = (s.generalExp ?? []).reduce((sum, r) => sum + imperioShare(r), 0);
  const opex = s.payables.filter((p) => p.status === "pago").reduce((s, r) => s + Number(r.amount ?? 0), 0) + generalOpex;
  const stockExpenses = s.expenses.reduce((s, r) => s + Number(r.amount ?? 0), 0);
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

export function computeMonthlySeries(s: DashboardSnapshot, months = 12) {
  const today = s.refs.today;
  const arr: { key: string; mes: string; vendas: number; receita: number; lucro: number; despesas: number; entradas: number; saidas: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const k = monthKey(d);
    const soldM = (s.trucks || []).filter((t) => t?.status === "vendido" && monthKey(new Date(t.sold_at || t.updated_at)) === k);
    const vendas = soldM.length;
    const receita = soldM.reduce((s, t) => s + Number(t.sold_price ?? 0), 0);
    const custo = soldM.reduce((s, t) => s + Number(t.purchase_price ?? 0) + Number(t.expenses_total ?? 0), 0);
    const lucro = receita - custo;
    const despesasPay = (s.payables || []).filter((p) => monthKey(new Date(p.occurred_at || p.due_date)) === k).reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const despesasGen = (s.generalExp ?? []).filter((r) => monthKey(new Date(r.occurred_at)) === k).reduce((sum, r) => sum + imperioShare(r), 0);
    const despesas = despesasPay + despesasGen;
    const entradas = (s.receivables || []).filter((p) => monthKey(new Date(p.occurred_at || p.due_date)) === k).reduce((s, p) => s + Number(p.amount ?? 0), 0);
    arr.push({ key: k, mes: monthLabel(k), vendas, receita, lucro, despesas, entradas, saidas: despesas });
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

  const truckById = new Map(s.trucks.map((t: any) => [t.id, t]));
  const truckLabel = (id?: string | null) => {
    if (!id) return undefined;
    const t: any = truckById.get(id);
    return t ? `${t.brand} ${t.model}${t.year ? ` ${t.year}` : ""}${t.plate ? ` · ${t.plate}` : ""}` : undefined;
  };

  // FINANCEIRO — contas a pagar
  (s.payables || []).filter((p: any) => p?.status === "aberto").forEach((p: any) => {
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
  (s.receivables || []).filter((r: any) => r?.status === "aberto").forEach((r: any) => {
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
  (s.services ?? []).forEach((sv: any) => {
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
  (s.trucks || []).forEach((t: any) => {
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
  (s.events ?? []).forEach((ev: any) => {
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
  (s.purchaseInst ?? []).filter((p: any) => p.status === "pendente").forEach((p: any) => {
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
  
  // PARCELAS DE COMPRA — próximos vencimentos
  (s.purchaseInst ?? []).filter((p: any) => p.status === "pendente").forEach((p: any) => {
    const b = bucketOf(p.due_date);
    if (!b) return;
    const truck = truckById.get(p.truck_id);
    out.push({
      id: `pur-${p.id}`,
      bucket: b,
      category: "financeiro",
      priority: b === "atrasado" ? "alta" : "media",
      title: `Parcela ${p.installment_number}/${p.total_installments} · ${truck ? (truck as any).brand + ' ' + (truck as any).model : 'Compra'}`,
      subtitle: truck ? (truck as any).plate : undefined,
      detail: b === "atrasado" ? `Vencida há ${Math.abs(daysBetween(new Date(p.due_date), today))} dia(s)` : b === "hoje" ? "Vence hoje" : `Vence em ${daysBetween(new Date(p.due_date), today)} dia(s)`,
      amount: Number(p.amount ?? 0),
      date: p.due_date,
    });
  });

  return out;
}

