import { describe, it, expect } from "vitest";
import {
  computeExecutiveKpis,
  computeMonthReport,
  computeWeekReport,
  computeMonthlyReports,
  computeWeeklyReports,
  imperioShare,
  reportExpenseValue,
  type DashboardSnapshot,
} from "./dashboard-data";

/**
 * Testes de PARIDADE com o CRM (`imperiocaminhoes-com-br`), inclusive dos bugs.
 *
 * Fontes replicadas:
 * - `src/lib/dashboard-data.ts`          → `computeExecutiveKpis` (tela Executivo)
 * - `src/lib/reports/monthly/monthly-report-data.ts` → `relatorios/mensal-executivo`
 * - `src/lib/reports/weekly/weekly-report-data.ts`   → `relatorios/semanal`
 *
 * Regras que os testes fixam (todas conferidas no código do CRM):
 * - Receita: trucks com `sold_at` no período e status `vendido`/`repasse`.
 *   Sem `sold_price`, conta operacionalmente, mas não entra nos valores.
 * - CMV (`costC`): Σ(purchase_price + expenses_total) dos VENDIDOS, com
 *   `expenses_total` sendo lifetime do caminhão.
 * - Despesas gerais: `payables` com `truck_id` por `occurred_at` +
 *   `general_expenses` sem `truck_id` e sem aquisição (`custo_aquisicao` ou
 *   `purchase_installment_id`). Sem filtro de status e sem `truck_expenses`.
 * - Cards do print: `lucroBruto = receita − compra`,
 *   `lucroLiquidoCaminhoes = lucroBruto − despesasDiretas` e
 *   `resultadoGlobal = lucroBruto − OPEX`.
 * - Semana do RELATÓRIO = segunda a domingo; semana do KPI = domingo a sábado.
 * - Duas regras de rateio diferentes no CRM (ver testes de `imperioShare`).
 */

function baseSnap(): DashboardSnapshot {
  return {
    refs: {
      today: new Date(2026, 8, 15),
      startYear: new Date(2026, 0, 1),
      start12m: new Date(2025, 9, 1),
    },
    trucks: [],
    payables: [],
    generalExp: [],
    receivables: [],
    banks: [],
    expenses: [],
    purchaseInst: [],
    goals: [],
  } as unknown as DashboardSnapshot;
}

function withTruck(
  snap: DashboardSnapshot,
  truck: Partial<{
    id: string;
    status: string;
    sold_at: string | null;
    updated_at: string;
    sold_price: number | null;
    purchase_price: number | null;
    expenses_total: number | null;
    purchase_date: string | null;
  }>,
): DashboardSnapshot {
  return {
    ...snap,
    trucks: [
      ...((snap.trucks ?? []) as never[]),
      {
        id: "t1",
        brand: "Volvo",
        model: "FH",
        status: "vendido",
        sold_at: "2026-09-10",
        updated_at: "2026-09-10",
        sold_price: 100000,
        purchase_price: 80000,
        expenses_total: 5000,
        purchase_date: "2026-08-01",
        ...truck,
      } as never,
    ],
  } as unknown as DashboardSnapshot;
}

function withPayable(
  snap: DashboardSnapshot,
  over: Partial<{
    id: string;
    amount: number;
    truck_id: string | null;
    occurred_at: string | null;
    due_date: string;
    status: string;
    paid_at: string | null;
  }>,
) {
  return {
    ...snap,
    payables: [
      ...((snap.payables ?? []) as never[]),
      {
        id: "p1",
        description: "Conta do caminhão",
        status: "aberto",
        amount: 2000,
        truck_id: "t1",
        paid_at: null,
        occurred_at: "2026-09-01",
        due_date: "2026-09-30",
        ...over,
      } as never,
    ],
  } as unknown as DashboardSnapshot;
}

function withGeneralExpense(
  snap: DashboardSnapshot,
  over: Partial<{
    id: string;
    amount: number;
    imperio_amount: number | null;
    c4_amount: number;
    shared: boolean;
    occurred_at: string;
    truck_id: string | null;
    category: string;
    purchase_installment_id: string | null;
    status: string;
  }>,
) {
  return {
    ...snap,
    generalExp: [
      ...((snap.generalExp ?? []) as never[]),
      {
        id: "g1",
        description: "Aluguel",
        category: "operacional",
        amount: 1250,
        imperio_amount: 1000,
        c4_amount: 250,
        shared: true,
        truck_id: null,
        status: "aberto",
        occurred_at: "2026-09-03",
        ...over,
      } as never,
    ],
  } as unknown as DashboardSnapshot;
}

function withTruckExpense(
  snap: DashboardSnapshot,
  over: Partial<{ id: string; amount: number; truck_id: string; occurred_at: string; kind: string }>,
) {
  return {
    ...snap,
    expenses: [
      ...((snap.expenses ?? []) as never[]),
      {
        id: "e1",
        kind: "mecanica",
        amount: 700,
        truck_id: "t1",
        occurred_at: "2026-09-04",
        ...over,
      } as never,
    ],
  } as unknown as DashboardSnapshot;
}

function withReceivable(
  snap: DashboardSnapshot,
  over: Partial<{ id: string; amount: number; status: string; received_at: string | null; due_date: string }>,
) {
  return {
    ...snap,
    receivables: [
      ...((snap.receivables ?? []) as never[]),
      {
        id: "r1",
        description: "Boleto",
        amount: 4000,
        status: "recebido",
        received_at: "2026-09-10",
        due_date: "2026-09-05",
        ...over,
      } as never,
    ],
  } as unknown as DashboardSnapshot;
}

describe("rateio da despesa geral — o CRM tem DUAS regras que não concordam", () => {
  it("imperioShare (dashboard/KPI): não compartilhada prefere imperio_amount", () => {
    expect(imperioShare({ shared: true, amount: 500, imperio_amount: 300 })).toBe(300);
    expect(imperioShare({ shared: true, amount: 500, imperio_amount: null })).toBe(0);
    // dashboard-data.ts:58 → `imperio_amount ?? amount`
    expect(imperioShare({ shared: false, amount: 500, imperio_amount: 300 })).toBe(300);
    expect(imperioShare({ shared: false, amount: 500, imperio_amount: null })).toBe(500);
  });

  it("reportExpenseValue (relatórios): não compartilhada prefere amount", () => {
    // monthly-report-data.ts:160 → `e.shared ? e.imperio_amount : e.amount || 0`
    expect(reportExpenseValue({ shared: true, amount: 500, imperio_amount: 300 })).toBe(300);
    expect(reportExpenseValue({ shared: true, amount: 500, imperio_amount: null })).toBe(0);
    expect(reportExpenseValue({ shared: false, amount: 500, imperio_amount: 300 })).toBe(500);
    expect(reportExpenseValue({ shared: false, amount: 500, imperio_amount: null })).toBe(500);
  });
});

describe("computeMonthReport — espelho de relatorios/mensal-executivo", () => {
  it("faturamento, lucro bruto, lucro líquido caminhões e resultado global", () => {
    let snap = baseSnap();
    snap = withTruck(snap, {});
    snap = withPayable(snap, {});
    snap = withGeneralExpense(snap, {});
    const r = computeMonthReport(snap, new Date(2026, 8, 1));

    expect(r.receita).toBe(100000);
    // CMV dos vendidos
    expect(r.custoCompra).toBe(80000);
    expect(r.despesasCaminhao).toBe(5000);
    expect(r.custoTotal).toBe(85000);
    // Cards do print: despesas diretas são as despesas dos caminhões vendidos;
    // despesas gerais/OPEX somam payables com truck_id + gerais não duplicadas.
    expect(r.despesasDiretas).toBe(5000);
    expect(r.despesasGerais).toBe(3000);
    expect(r.opex).toBe(3000);
    expect(r.lucroBruto).toBe(20000);
    expect(r.lucroLiquidoCaminhoes).toBe(15000);
    expect(r.resultadoGlobal).toBe(17000);
    expect(r.lucroOperacional).toBe(17000);
    expect(r.margemBruta).toBeCloseTo(20, 5);
    expect(r.margemLiquidaCaminhoes).toBeCloseTo(15, 5);
    expect(r.margemGlobal).toBeCloseTo(17, 5);
    expect(r.roiPeriodo).toBeCloseTo((15000 / 85000) * 100, 5);
    expect(r.custoAquisicao).toBe(0);
    expect(r.compras).toBe(0);
    expect(r.vendas).toBe(1);
  });

  it("receita filtra status: negociacao com sold_at não entra", () => {
    const snap = withTruck(baseSnap(), { status: "negociacao" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(0);
    expect(r.receita).toBe(0);
  });

  it("receita NÃO exige sold_price: caminhão sem preço conta como venda com 0", () => {
    const snap = withTruck(baseSnap(), { sold_price: null });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(1);
    expect(r.receita).toBe(0);
  });

  it("repasse com sold_at conta como venda no relatório", () => {
    const snap = withTruck(baseSnap(), { status: "repasse" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(1);
    expect(r.receita).toBe(100000);
  });

  it("offline fica fora dos indicadores financeiros", () => {
    const snap = withTruck(baseSnap(), { status: "offline" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(0);
    expect(r.receita).toBe(0);
  });

  it("não usa updated_at como receita: sem sold_at o caminhão fica fora", () => {
    const snap = withTruck(baseSnap(), { sold_at: null, updated_at: "2026-09-15" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(0);
    expect(r.receita).toBe(0);
  });

  it("não conta caminhão vendido fora do mês", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-08-10", updated_at: "2026-08-10" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(0);
    expect(r.receita).toBe(0);
    expect(r.lucroOperacional).toBe(0);
  });

  it("despesa geral vinculada a caminhão não entra no opex", () => {
    const snap = withGeneralExpense(baseSnap(), { truck_id: "t1", amount: 1500, imperio_amount: 1500, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(0);
  });

  it("despesa geral vinculada a caminhão vendido no período não duplica no opex", () => {
    let snap = withTruck(baseSnap(), { id: "t1", expenses_total: 1500 });
    snap = withGeneralExpense(snap, { truck_id: "t1", amount: 1500, imperio_amount: 1500, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(0);
  });

  it("despesa geral de COMPRA não entra no opex e entra em compras", () => {
    let snap = withGeneralExpense(baseSnap(), {
      category: "custo_aquisicao",
      amount: 50000,
      imperio_amount: 50000,
      shared: false,
    });
    snap = withGeneralExpense(snap, {
      id: "g2",
      category: "custo_aquisicao",
      purchase_installment_id: "inst1",
      amount: 30000,
      imperio_amount: 30000,
      shared: false,
    });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(0);
    expect(r.compras).toBe(80000);
  });

  it("opex do CRM NÃO filtra status: payable e despesa cancelados entram", () => {
    let snap = withPayable(baseSnap(), { status: "cancelado", amount: 2000 });
    snap = withGeneralExpense(snap, { id: "g2", status: "cancelado", amount: 4000, imperio_amount: 4000, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.despesasDiretas).toBe(0);
    expect(r.despesasGerais).toBe(6000);
    expect(r.opex).toBe(6000);
  });

  it("truck_expenses NÃO entram no relatório mensal do CRM", () => {
    const snap = withTruckExpense(baseSnap(), { amount: 700, occurred_at: "2026-09-08" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(0);
  });

  it("compras = purchase_price de quem foi comprado no período, sem nenhum filtro", () => {
    let snap = withTruck(baseSnap(), { purchase_date: "2026-09-02" });
    snap = withTruck(snap, { id: "t2", status: "disponivel", sold_at: null, purchase_date: "2026-09-03", purchase_price: 60000 });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    // t1 (80k, vendido) + t2 (60k, comprado em setembro)
    expect(r.compras).toBe(140000);
    expect(r.custoAquisicao).toBe(140000);
    // O card de lucro bruto do print usa a compra dos vendidos, não compras do mês.
    expect(r.lucroBruto).toBe(20000);
  });

  it("compras exclui caminhão já representado por pagamento de aquisição", () => {
    let snap = withTruck(baseSnap(), { status: "disponivel", sold_at: null, purchase_date: "2026-09-03" });
    snap = withGeneralExpense(snap, {
      id: "g2",
      category: "custo_aquisicao",
      truck_id: "t1",
      amount: 80000,
      imperio_amount: 80000,
      shared: false,
    });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.compras).toBe(80000);
    expect(r.opex).toBe(0);
  });

  it("entradas/saídas: vencimento no período e quitado (sem filtro de cancelado)", () => {
    let snap = baseSnap();
    snap = withReceivable(snap, { amount: 4000, received_at: "2026-09-10" });
    snap = withReceivable(snap, { id: "r2", amount: 9000, received_at: null, due_date: "2026-09-01" });
    snap = withPayable(snap, { amount: 2000, status: "pago", paid_at: "2026-09-10", due_date: "2026-09-30" });
    snap = withPayable(snap, { id: "p2", amount: 7000, status: "aberto", paid_at: null, due_date: "2026-09-15" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.entradas).toBe(4000);
    expect(r.saidas).toBe(2000);
  });

  it("rotula mês e intervalo", () => {
    const r = computeMonthReport(baseSnap(), new Date(2026, 8, 15));
    expect(r.label).toBeTruthy();
    expect(r.rangeLabel).toMatch(/^\d{2}\/\d{2}\/\d{4} – \d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("computeWeekReport — espelho de relatorios/semanal", () => {
  it("semana é segunda a domingo (getStartOfWeek do CRM)", () => {
    // 07/09/2026 é segunda; 13/09/2026 domingo fecha.
    const snap = withTruck(baseSnap(), { sold_at: "2026-09-07", updated_at: "2026-09-07" });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.receita).toBe(100000);
    expect(r.custoTotal).toBe(85000);
    expect(r.opex).toBe(0);
    expect(r.lucroBruto).toBe(20000);
    expect(r.lucroLiquidoCaminhoes).toBe(15000);
    expect(r.resultadoGlobal).toBe(20000);
    expect(r.lucroOperacional).toBe(20000);
  });

  it("inclui venda no domingo que fecha a semana", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-09-13", updated_at: "2026-09-13" });
    expect(computeWeekReport(snap, new Date(2026, 8, 10)).vendas).toBe(1);
  });

  it("exclui venda em outra semana", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-09-14", updated_at: "2026-09-14" });
    expect(computeWeekReport(snap, new Date(2026, 8, 10)).vendas).toBe(0);
  });

  it("opex semanal usa payables com truck_id + gerais não duplicadas — igual ao mensal", () => {
    let snap = withTruck(baseSnap(), { sold_at: "2026-09-07" });
    snap = withPayable(snap, { occurred_at: "2026-09-08", amount: 2000 });
    snap = withGeneralExpense(snap, { occurred_at: "2026-09-08", amount: 2000, imperio_amount: 1000, shared: true });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.despesasDiretas).toBe(5000);
    expect(r.despesasGerais).toBe(3000);
    expect(r.opex).toBe(3000);
    expect(r.lucroLiquidoCaminhoes).toBe(15000);
    expect(r.resultadoGlobal).toBe(100000 - 80000 - 3000);
  });

  it("truck_expenses NÃO entram no relatório semanal do CRM", () => {
    let snap = withTruck(baseSnap(), { sold_at: "2026-09-07" });
    snap = withTruckExpense(snap, { amount: 700, occurred_at: "2026-09-08" });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.opex).toBe(0);
  });

  it("semanal restringe status e ignora venda sem sold_price nos valores", () => {
    let snap = withTruck(baseSnap(), { status: "negociacao", sold_at: "2026-09-09", sold_price: 100000 });
    snap = withTruck(snap, { id: "t2", sold_at: "2026-09-09", sold_price: null, purchase_price: 90000, expenses_total: 1000 });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.vendas).toBe(1);
    expect(r.receita).toBe(0);
    expect(r.custoTotal).toBe(0);
  });

  it("despesa de compra não entra no opex semanal", () => {
    let snap = withTruck(baseSnap(), { sold_at: "2026-09-07" });
    snap = withGeneralExpense(snap, {
      occurred_at: "2026-09-09",
      category: "custo_aquisicao",
      amount: 40000,
      imperio_amount: 40000,
      shared: false,
    });
    expect(computeWeekReport(snap, new Date(2026, 8, 10)).opex).toBe(0);
  });
});

describe("compute*Reports — séries de tendência", () => {
  it("devolve 12 meses na ordem cronológica (mais antigo primeiro)", () => {
    const series = computeMonthlyReports(baseSnap());
    expect(series.length).toBe(12);
    expect(series[0].rangeLabel).toBe(computeMonthReport(baseSnap(), new Date(2025, 9, 1)).rangeLabel);
    expect(series[11].rangeLabel).toBe(computeMonthReport(baseSnap(), new Date(2026, 8, 1)).rangeLabel);
  });

  it("devolve 8 semanas e todas com rangeLabel preenchido", () => {
    const series = computeWeeklyReports(baseSnap());
    expect(series.length).toBe(8);
    series.forEach((w) => expect(w.rangeLabel.length).toBeGreaterThan(0));
  });
});

describe("computeExecutiveKpis — espelho de computeExecutiveKpis do CRM", () => {
  // refs.today = 15/09/2026 (terça). O KPI do CRM usa janela DOMINGO→SÁBADO:
  // start = today − getDay() = domingo 13/09 00:00; end = domingo 20/09 00:00.
  function kpiSnap(): DashboardSnapshot {
    return { ...baseSnap() };
  }

  it("semana do KPI começa no DOMINGO (não na segunda, ao contrário do relatório)", () => {
    let snap = kpiSnap();
    snap = withTruck(snap, { id: "w1", sold_at: "2026-09-14", sold_price: 100000, purchase_price: 80000 });
    // sábado 12/09 pertence à janela anterior (domingo 06/09 → sábado 12/09)
    snap = withTruck(snap, { id: "w2", sold_at: "2026-09-12", sold_price: 50000, purchase_price: 40000 });
    expect(computeExecutiveKpis(snap).revWeek).toBe(100000);
    // o relatório semanal, esse mesmo dia, cai na semana de 14/09
    expect(computeWeekReport(snap, new Date(2026, 8, 15)).receita).toBe(100000);
  });

  it("conta repasse como venda concluída no KPI", () => {
    const snap = withTruck(kpiSnap(), {
      status: "repasse",
      sold_at: "2026-09-10",
      sold_price: 100000,
      purchase_price: 80000,
      expenses_total: 5000,
    });
    const kpis = computeExecutiveKpis(snap);
    expect(kpis.soldCount).toBe(1);
    expect(kpis.revMonth).toBe(100000);
    expect(kpis.netProfit).toBe(15000);
  });

  it("receita do KPI tem fallback para updated_at quando sold_at é nulo", () => {
    const snap = withTruck(kpiSnap(), { sold_at: null, updated_at: "2026-09-15", sold_price: 100000 });
    const kpis = computeExecutiveKpis(snap);
    // O CRM atual usa parse local: 2026-09-15 conta no próprio dia.
    expect(kpis.revDay).toBe(100000);
    expect(kpis.revWeek).toBe(100000);
    expect(kpis.revMonth).toBe(100000);
  });

  it("lucro bruto acumulado desconta só a compra; líquido desconta as despesas", () => {
    let snap = kpiSnap();
    snap = withTruck(snap, { sold_at: "2026-09-10", sold_price: 100000, purchase_price: 80000, expenses_total: 5000 });
    snap = withTruck(snap, { id: "t2", sold_at: "2026-08-10", sold_price: 70000, purchase_price: 60000, expenses_total: 2000 });
    const kpis = computeExecutiveKpis(snap);
    expect(kpis.grossProfit).toBe(30000); // (100k−80k) + (70k−60k)
    expect(kpis.netProfit).toBe(23000); // 30000 − (5000+2000)
    expect(kpis.soldCount).toBe(2);
  });

  it("opex do KPI = payables pagos + gerais sem truck_id e sem aquisição", () => {
    let snap = kpiSnap();
    snap = withTruck(snap, { id: "t1", status: "vendido", expenses_total: 9000 });
    snap = withPayable(snap, { id: "p1", status: "pago", amount: 5000, truck_id: "t1" });
    snap = withPayable(snap, { id: "p2", status: "aberto", amount: 3000, truck_id: "t1" });
    snap = withPayable(snap, { id: "p3", status: "cancelado", amount: 4000, truck_id: "t1" });
    snap = withGeneralExpense(snap, { id: "g1", shared: true, amount: 1250, imperio_amount: 1000 });
    // não compartilhada: no KPI o imperio_amount vence (diferente do relatório)
    snap = withGeneralExpense(snap, { id: "g2", shared: false, amount: 7000, imperio_amount: 3000 });
    snap = withGeneralExpense(snap, { id: "g3", shared: false, amount: 5000, imperio_amount: null });
    // gerais não têm filtro de status no KPI do CRM
    snap = withGeneralExpense(snap, { id: "g4", shared: false, amount: 200, imperio_amount: 200, status: "cancelado" });
    // geral vinculada a caminhão já compõe `expenses_total`, então fica fora do OPEX.
    snap = withGeneralExpense(snap, { id: "g5", shared: false, amount: 9000, imperio_amount: 9000, truck_id: "t1" });
    // vinculada a caminhão não entra no OPEX geral, mesmo sem venda no período.
    snap = withGeneralExpense(snap, { id: "g6", shared: false, amount: 800, imperio_amount: 800, truck_id: "stock1" });
    const kpis = computeExecutiveKpis(snap);
    expect(kpis.opex).toBe(5000 + 1000 + 3000 + 5000 + 200);
  });

  it("a receber/pagar em aberto contam SOMENTE status `aberto`", () => {
    let snap = kpiSnap();
    snap = withReceivable(snap, { id: "r1", status: "aberto", amount: 1000, received_at: null, due_date: "2026-09-20" });
    snap = withReceivable(snap, { id: "r2", status: "vencido", amount: 2000, received_at: null, due_date: "2026-09-01" });
    snap = withReceivable(snap, { id: "r3", status: "cancelado", amount: 4000, received_at: null, due_date: "2026-09-01" });
    snap = withPayable(snap, { id: "p1", status: "aberto", amount: 500, truck_id: null });
    // previsão = aberto a receber − aberto a pagar − parcelas pendentes
    expect(computeExecutiveKpis(snap).profitForecast).toBe(500);
  });

  it("ticket médio e saldo seguem o CRM (divisão crua, sem arredondar)", () => {
    const snap = {
      ...kpiSnap(),
      banks: [{ id: "b1", name: "CC", active: true, current_balance: 1000.005 }],
      trucks: [
        { id: "a", status: "vendido", sold_at: "2026-09-10", sold_price: 333.33, purchase_price: 100, expenses_total: 0 },
        { id: "b", status: "vendido", sold_at: "2026-09-10", sold_price: 333.33, purchase_price: 100, expenses_total: 0 },
        { id: "c", status: "vendido", sold_at: "2026-09-10", sold_price: 333.34, purchase_price: 100, expenses_total: 0 },
      ],
    } as unknown as DashboardSnapshot;
    const kpis = computeExecutiveKpis(snap);
    expect(kpis.ticketAvg).toBeCloseTo(333.333, 3);
    expect(kpis.balance).toBe(1000.005);
  });

  it("estoque do KPI usa todos os status ativos do CRM", () => {
    let snap = kpiSnap();
    for (const [i, status] of ["disponivel", "consignado", "patio", "oficina", "repasse", "interna"].entries()) {
      snap = withTruck(snap, { id: `s${i}`, status, sold_at: null, purchase_price: 1000 });
    }
    expect(computeExecutiveKpis(snap).stockCount).toBe(4);
  });
});
