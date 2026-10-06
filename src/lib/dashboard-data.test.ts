import { describe, it, expect } from "vitest";
import {
  computeExecutiveKpis,
  computeMonthReport,
  computeWeekReport,
  computeMonthlyReports,
  computeWeeklyReports,
  fetchAllPages,
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
 * - Receita: trucks com `sold_at` no período, sem filtro de status.
 *   Sem `sold_price`, conta operacionalmente com receita zero.
 * - Compra dos veículos: Σ(purchase_price) dos VENDIDOS.
 * - Despesas diretas: Σ(expenses_total) dos VENDIDOS, com `expenses_total`
 *   sendo lifetime do caminhão.
 * - Despesas gerais/OPEX: `general_expenses` ativas, sem `truck_id` e sem
 *   aquisição. Sem `truck_expenses`/`payables` de caminhão.
 * - Resultado do CRM nos cards: `receita − compra − despesas diretas − OPEX`.
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
    truckExpenseRows: [],
    purchaseInst: [],
    goals: [],
  } as unknown as DashboardSnapshot;
}

function withConsolidatedTruckExpense(
  snap: DashboardSnapshot,
  over: Partial<{
    id: string;
    amount: number;
    imperio_amount: number | null;
    shared: boolean;
    truck_id: string | null;
    occurred_at: string;
    category: string;
  }>,
) {
  return {
    ...snap,
    truckExpenseRows: [
      ...(((snap as unknown as { truckExpenseRows?: never[] }).truckExpenseRows ?? []) as never[]),
      {
        id: "ce1",
        amount: 752.49,
        imperio_amount: 752.49,
        shared: false,
        truck_id: "t1",
        occurred_at: "2026-09-03",
        category: "manutencao",
        ...over,
      } as never,
    ],
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
    financial_event_kind: string;
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
    expect(r.despesasDiretas).toBe(5000);
    expect(r.lucroBruto).toBe(20000);
    expect(r.lucroLiquidoCaminhoes).toBe(15000);
    // OPEX do CRM (`monthly-report-data.ts:151-164`) tem DUAS pernas:
    //   payable de caminhão 2000 (`truckPayables`, :155-157)
    // + despesa geral compartilhada 1000 (`general`, :158-162)
    expect(r.despesasGerais).toBe(3000);
    expect(r.opex).toBe(3000);
    // Resultado global = lucro líquido caminhões − OPEX (`segmentarVendidos():414`).
    // A despesa direta (5000) é descontada UMA vez, em `lucroLiquidoCaminhoes`.
    expect(r.resultadoGlobal).toBe(12000);
    expect(r.lucroOperacional).toBe(12000);
    expect(r.margemBruta).toBeCloseTo(20, 5);
    expect(r.margemLiquidaCaminhoes).toBeCloseTo(15, 5);
    expect(r.margemGlobal).toBeCloseTo(12, 5);
    expect(r.roiPeriodo).toBeCloseTo((15000 / 85000) * 100, 5);
    expect(r.custoAquisicao).toBe(0);
    expect(r.compras).toBe(0);
    expect(r.vendas).toBe(1);
  });

  it("receita filtra status: só vendido/repasse entra (`fetchPeriodData:310`)", () => {
    const snap = withTruck(baseSnap(), { status: "negociacao" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    // `soldTrucks` do CRM é `.in("status", ["vendido","repasse"])`: caminhão
    // em negociação com `sold_at` NÃO é faturamento nem negócio concluído.
    expect(r.vendas).toBe(0);
    expect(r.receita).toBe(0);
    expect(r.resultadoGlobal).toBe(0);
  });

  it("venda sem sold_price conta como negócio mas não como faturamento (completeSales :147)", () => {
    const snap = withTruck(baseSnap(), { sold_price: null });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    // `completeSales` (:147-148) tira da conta o caminhão sem preço, mas
    // `sales.count` (:685) conta `soldTrucks` cru. Nunca inventar prejuízo 0.
    expect(r.vendas).toBe(1);
    expect(r.receita).toBe(0);
    expect(r.custoTotal).toBe(0);
    expect(r.resultadoGlobal).toBe(0);
  });

  it("repasse com sold_at conta como venda no relatório", () => {
    const snap = withTruck(baseSnap(), { status: "repasse" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(1);
    expect(r.receita).toBe(100000);
  });

  it("offline com sold_at NÃO entra no relatório do CRM", () => {
    const snap = withTruck(baseSnap(), { status: "offline" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    // O fetch do CRM já restringe a `["vendido","repasse"]`, então `offline`
    // fica fora de todo o relatório.
    expect(r.vendas).toBe(0);
    expect(r.receita).toBe(0);
    expect(r.resultadoGlobal).toBe(0);
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

  it("opex inclui payable de caminhão e NÃO filtra status (filtro é includeInProfit)", () => {
    let snap = withPayable(baseSnap(), { status: "cancelado", amount: 2000 });
    snap = withGeneralExpense(snap, { id: "g2", status: "cancelado", amount: 4000, imperio_amount: 4000, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    // `despesasGerais` (:151-164) NÃO olha `status`: o filtro é estrutural
    // (`includeInProfit`), não por baixa/cancelamento. E o `truckPayables`
    // (:155-157) ENTRA no OPEX.
    expect(r.despesasDiretas).toBe(0);
    expect(r.despesasGerais).toBe(6000);
    expect(r.opex).toBe(6000);
  });

  it("OPEX ignora pagamento/aquisição de estoque e transferência interna", () => {
    let snap = withGeneralExpense(baseSnap(), { id: "g1", financial_event_kind: "pagamento_estoque", amount: 900, imperio_amount: 900, shared: false });
    snap = withGeneralExpense(snap, { id: "g2", financial_event_kind: "aquisicao_estoque", amount: 700, imperio_amount: 700, shared: false });
    snap = withGeneralExpense(snap, { id: "g3", financial_event_kind: "transferencia_interna", amount: 500, imperio_amount: 500, shared: false });
    snap = withGeneralExpense(snap, { id: "g4", financial_event_kind: "despesa_operacional", amount: 300, imperio_amount: 300, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    // REGRA DE OURO: um valor reduz o lucro UMA única vez. Só a despesa
    // operacional entra (`financial-class.ts:includeInProfit`).
    expect(r.opex).toBe(300);
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

describe("paridade com o CRM — setembro/2026 (valores do relatório executivo do CRM)", () => {
  // Réplica exata da tela `/relatorios/mensal-executivo` do CRM para
  // setembro/2026. Se qualquer regra de `segmentarVendidos()` mudar, este
  // teste quebra — é a trava que impede o APP de voltar a divergir do CRM.
  function setembroCrm(): DashboardSnapshot {
    let snap = baseSnap();
    snap = withTruck(snap, { id: "t1", sold_price: 182500, purchase_price: 110750, expenses_total: 19000 });
    snap = withTruck(snap, { id: "t2", sold_price: 100000, purchase_price: 70000, expenses_total: 7564.07 });
    // Perna 1 do OPEX: payable de caminhão (`truckPayables`).
    snap = withPayable(snap, { amount: 3000 });
    // Perna 2 do OPEX: despesa geral sem `truck_id`.
    snap = withGeneralExpense(snap, {
      amount: 9905.49,
      imperio_amount: 9905.49,
      shared: false,
    });
    return snap;
  }

  const r = () => computeMonthReport(setembroCrm(), new Date(2026, 8, 1));

  it("faturamento realizado", () => expect(r().receita).toBe(282500));

  it("compra dos veículos", () => expect(r().custoCompra).toBe(180750));

  it("lucro bruto = receita − compra", () => {
    expect(r().lucroBruto).toBe(101750);
    expect(r().margemBruta).toBeCloseTo(36.0, 1);
  });

  it("despesas diretas (caminhões)", () => {
    expect(r().despesasDiretas).toBe(26564.07);
    expect(r().custoTotal).toBe(207314.07);
  });

  it("despesas diretas usam despesas consolidadas reais quando existirem", () => {
    let snap = baseSnap();
    snap = withTruck(snap, { id: "t1", sold_price: 282500, purchase_price: 180750, expenses_total: 1 });
    snap = withConsolidatedTruckExpense(snap, { truck_id: "t1", amount: 27316.56, imperio_amount: 27316.56 });
    const x = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(x.despesasDiretas).toBe(27316.56);
    expect(x.lucroLiquidoCaminhoes).toBe(74433.44);
  });

  it("lucro líquido caminhões = lucro bruto − despesas diretas", () => {
    expect(r().lucroLiquidoCaminhoes).toBe(75185.93);
    expect(r().margemLiquidaCaminhoes).toBeCloseTo(26.6, 1);
  });

  it("despesas gerais / OPEX", () => expect(r().opex).toBe(12905.49));

  it("ROI do período = lucro líquido ÷ custo total", () => {
    expect(r().roiPeriodo).toBeCloseTo(36.3, 1);
  });

  it("negócios concluídos", () => expect(r().vendas).toBe(2));

  /**
   * A trava principal. O APP mostrava `lucroBruto − OPEX` (88.844,51), o que
   * zerava o efeito das despesas diretas e fazia o "lucro líquido global"
   * aparecer igual ao lucro bruto. O CRM desconta a despesa direta UMA vez.
   */
  it("resultado líquido global = lucro líquido caminhões − OPEX", () => {
    expect(r().resultadoGlobal).toBe(62280.44);
    expect(r().lucroOperacional).toBe(62280.44);
    // Guardas contra a regressão que igualava o resultado global ao bruto.
    expect(r().resultadoGlobal).not.toBe(r().lucroBruto);
    expect(r().resultadoGlobal).toBeCloseTo(62280.44, 2);
  });

  it("cadeia completa fecha sem buraco", () => {
    const x = r();
    // `money()` arredonda cada etapa; as subtrações cruas carregam erro de
    // binário, por isso a comparação é por proximidade e não identidade.
    expect(x.lucroBruto - x.despesasDiretas).toBeCloseTo(x.lucroLiquidoCaminhoes, 2);
    expect(x.lucroLiquidoCaminhoes - x.opex).toBeCloseTo(x.resultadoGlobal, 2);
    expect(x.resultadoGlobal).toBeCloseTo(x.receita - x.custoTotal - x.opex, 2);
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
    expect(r.resultadoGlobal).toBe(15000);
    expect(r.lucroOperacional).toBe(15000);
  });

  it("inclui venda no domingo que fecha a semana", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-09-13", updated_at: "2026-09-13" });
    expect(computeWeekReport(snap, new Date(2026, 8, 10)).vendas).toBe(1);
  });

  it("exclui venda em outra semana", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-09-14", updated_at: "2026-09-14" });
    expect(computeWeekReport(snap, new Date(2026, 8, 10)).vendas).toBe(0);
  });

  it("opex semanal soma payable de caminhão + geral não duplicada", () => {
    let snap = withTruck(baseSnap(), { sold_at: "2026-09-07" });
    snap = withPayable(snap, { occurred_at: "2026-09-08", amount: 2000 });
    snap = withGeneralExpense(snap, { occurred_at: "2026-09-08", amount: 2000, imperio_amount: 1000, shared: true });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.despesasDiretas).toBe(5000);
    expect(r.despesasGerais).toBe(3000);
    expect(r.opex).toBe(3000);
    expect(r.lucroLiquidoCaminhoes).toBe(15000);
    expect(r.resultadoGlobal).toBe(12000);
  });

  it("truck_expenses NÃO entram no relatório semanal do CRM", () => {
    let snap = withTruck(baseSnap(), { sold_at: "2026-09-07" });
    snap = withTruckExpense(snap, { amount: 700, occurred_at: "2026-09-08" });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.opex).toBe(0);
  });

  it("semanal restringe status e venda sem sold_price não soma custo", () => {
    let snap = withTruck(baseSnap(), { status: "negociacao", sold_at: "2026-09-09", sold_price: 100000 });
    snap = withTruck(snap, { id: "t2", sold_at: "2026-09-09", sold_price: null, purchase_price: 90000, expenses_total: 1000 });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    // `negociacao` está fora de `["vendido","repasse"]`; t2 é `vendido` mas
    // sem `sold_price`, então `completeSales` o tira dos valores.
    expect(r.vendas).toBe(1);
    expect(r.receita).toBe(0);
    expect(r.custoTotal).toBe(0);
    expect(r.resultadoGlobal).toBe(0);
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

describe("paridade com o CRM — outubro/2026 (dados reais do banco lidos em 06/10/2026)", () => {
  // As 17 linhas de `general_expenses` de outubro/2026 lidas direto do banco
  // (todas `financial_event_kind = despesa_operacional`, nenhuma com
  // `truck_id`, 2 compartilhadas com rateio Império). No fetch antigo a janela
  // de 12 meses (1.170+ linhas) era cortada em 1.000 pelo PostgREST e só 2
  // linhas sobreviviam → OPEX do APP = 736,59 em vez de 15.511,51 (CRM).
  const OUTUBRO_GERAL: Array<{
    id: string;
    occurred_at: string;
    amount: number;
    imperio_amount: number;
    shared: boolean;
    category: string;
  }> = [
    { id: "ge01", occurred_at: "2026-10-01", amount: 50, imperio_amount: 50, shared: false, category: "colaborador" },
    { id: "ge02", occurred_at: "2026-10-01", amount: 12484.66, imperio_amount: 12484.66, shared: false, category: "pecas_caminhao" },
    { id: "ge03", occurred_at: "2026-10-01", amount: 204.21, imperio_amount: 102.11, shared: true, category: "refeicao" },
    { id: "ge04", occurred_at: "2026-10-01", amount: 37.44, imperio_amount: 18.72, shared: true, category: "refeicao" },
    { id: "ge05", occurred_at: "2026-10-01", amount: 250, imperio_amount: 250, shared: false, category: "pagamentos" },
    { id: "ge06", occurred_at: "2026-10-02", amount: 55, imperio_amount: 55, shared: false, category: "caminhao" },
    { id: "ge07", occurred_at: "2026-10-02", amount: 10, imperio_amount: 10, shared: false, category: "colaborador" },
    { id: "ge08", occurred_at: "2026-10-02", amount: 681.59, imperio_amount: 681.59, shared: false, category: "veiculo_outros" },
    { id: "ge09", occurred_at: "2026-10-02", amount: 59.9, imperio_amount: 59.9, shared: false, category: "materiais" },
    { id: "ge10", occurred_at: "2026-10-02", amount: 15.15, imperio_amount: 15.15, shared: false, category: "pagamentos" },
    { id: "ge11", occurred_at: "2026-10-02", amount: 150, imperio_amount: 150, shared: false, category: "colaborador" },
    { id: "ge12", occurred_at: "2026-10-02", amount: 90, imperio_amount: 90, shared: false, category: "pagamentos" },
    { id: "ge13", occurred_at: "2026-10-02", amount: 727.9, imperio_amount: 363.95, shared: true, category: "limpeza" },
    { id: "ge14", occurred_at: "2026-10-02", amount: 164.85, imperio_amount: 82.43, shared: true, category: "refeicao" },
    { id: "ge15", occurred_at: "2026-10-02", amount: 333.45, imperio_amount: 333.45, shared: false, category: "pagamentos" },
    { id: "ge16", occurred_at: "2026-10-02", amount: 29.1, imperio_amount: 14.55, shared: true, category: "refeicao" },
    { id: "ge17", occurred_at: "2026-10-02", amount: 750, imperio_amount: 750, shared: false, category: "colaborador" },
  ];

  // Os 2 caminhões vendidos em outubro/2026 (repasse + vendido, ambos em
  // 02/10). `expenses_total` = lifetime; `truckExpenseRows` fica vazio, então
  // `truckDirectExpenseTotal` cai no `expenses_total` (mesmo efeito das
  // 13 linhas consolidadas reais, cuja soma bate com ele).
  function outubroSnap(geral = OUTUBRO_GERAL): DashboardSnapshot {
    let snap = baseSnap();
    snap = withTruck(snap, {
      id: "b00bdb08-635b-41d8-a3e8-c360564d0e46",
      status: "repasse",
      sold_at: "2026-10-02",
      updated_at: "2026-10-05",
      sold_price: 155000,
      purchase_price: 96500,
      expenses_total: 11298.69,
      purchase_date: "2026-09-21",
    });
    snap = withTruck(snap, {
      id: "c150905e-7fea-4969-9ac6-9d6beb238610",
      status: "vendido",
      sold_at: "2026-10-02",
      updated_at: "2026-10-05",
      sold_price: 127500,
      purchase_price: 84250,
      expenses_total: 16017.87,
      purchase_date: "2025-12-15",
    });
    geral.forEach((g) => {
      snap = withGeneralExpense(snap, { ...g, financial_event_kind: "despesa_operacional" });
    });
    return snap;
  }

  const r = (snap = outubroSnap()) => computeMonthReport(snap, new Date(2026, 9, 1));

  it("faturamento realizado = 2 caminhões vendidos em 02/10", () => {
    expect(r().receita).toBe(282500);
    expect(r().vendas).toBe(2);
  });

  it("compra dos veículos e despesas diretas (lifetime)", () => {
    expect(r().custoCompra).toBe(180750);
    expect(r().despesasDiretas).toBe(27316.56);
    expect(r().lucroLiquidoCaminhoes).toBe(74433.44);
  });

  it("OPEX/outubro = R$ 15.511,51 (as 17 despesas reais, 0 payables de caminhão)", () => {
    expect(r().opex).toBe(15511.51);
    expect(r().despesasGerais).toBe(15511.51);
  });

  it("resultado líquido global = R$ 58.921,93 (número do relatório do CRM)", () => {
    expect(r().resultadoGlobal).toBe(58921.93);
    expect(r().lucroOperacional).toBe(58921.93);
  });

  /**
   * Regressão da incidência: com o fetch único sem paginação o PostgREST
   * cortava a janela de 12 meses em 1.000 linhas e outubro ficava com 2 das
   * 17 linhas (55,00 + 681,59 = 736,59) — exatamente o que o APP mostrava.
   */
  it("truncamento antigo: 2 das 17 linhas → OPEX 736,59 e global 73.696,85 (APP)", () => {
    const sobreviventes = OUTUBRO_GERAL.filter((g) => g.id === "ge06" || g.id === "ge08");
    const truncado = r(outubroSnap(sobreviventes));
    expect(truncado.opex).toBe(736.59);
    expect(truncado.resultadoGlobal).toBe(73696.85);
    // A divergência reportada entre CRM e APP em outubro/2026.
    expect(r().opex - truncado.opex).toBeCloseTo(14774.92, 2);
    expect(truncado.resultadoGlobal - r().resultadoGlobal).toBeCloseTo(14774.92, 2);
  });

  it("cadeia completa de outubro fecha sem buraco", () => {
    const x = r();
    expect(x.lucroBruto - x.despesasDiretas).toBeCloseTo(x.lucroLiquidoCaminhoes, 2);
    expect(x.lucroLiquidoCaminhoes - x.opex).toBeCloseTo(x.resultadoGlobal, 2);
    expect(x.receita - x.custoCompra - x.despesasDiretas - x.opex).toBeCloseTo(x.resultadoGlobal, 2);
  });
});

describe("fetchAllPages — paginação contra o max-rows do PostgREST", () => {
  const makeRows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

  it("pagina até completar o total (caso real: 1.170 linhas > 1.000)", async () => {
    const rows = makeRows(1170);
    const offsets: number[] = [];
    const out = await fetchAllPages((from, to) => {
      offsets.push(from);
      return Promise.resolve({ data: rows.slice(from, to + 1), count: rows.length, error: null });
    });
    expect(out).toHaveLength(1170);
    expect(offsets).toEqual([0, 1000]);
  });

  it("não deixa buraco quando o servidor corta abaixo do pageSize (max-rows < 1.000)", async () => {
    const rows = makeRows(1170);
    const CAP = 400;
    const out = await fetchAllPages((from, to) => {
      const end = Math.min(to + 1, from + CAP);
      return Promise.resolve({ data: rows.slice(from, end), count: rows.length, error: null });
    }, 1000);
    // 400 + 400 + 370 = 1.170, sem pulo de offset nem linha repetida.
    expect(out).toHaveLength(1170);
    expect(out.map((r) => r.id)).toEqual(rows.map((r) => r.id));
  });

  it("para em página vazia mesmo sem count", async () => {
    const out = await fetchAllPages((from) =>
      Promise.resolve({ data: from === 0 ? [{ id: 1 }] : [], count: null, error: null }),
    );
    expect(out).toEqual([{ id: 1 }]);
  });

  it("propaga erro da consulta em vez de engolir (data ?? [] antigo)", async () => {
    await expect(
      fetchAllPages(() => Promise.resolve({ data: null, count: null, error: { message: "boom" } })),
    ).rejects.toThrow("boom");
  });
});
