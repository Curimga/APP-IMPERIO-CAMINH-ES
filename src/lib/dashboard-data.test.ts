import { describe, it, expect } from "vitest";
import {
  computeMonthReport,
  computeWeekReport,
  computeMonthlyReports,
  computeWeeklyReports,
  type DashboardSnapshot,
} from "./dashboard-data";

/**
 * Testes do relatório financeiro (mensal/semanal) — espelho EXATO do CRM
 * (relatorios/mensal-executivo e relatorios/semanal):
 * - Receita = sold_price dos caminhões com sold_at no período (sem status).
 * - Custo = purchase_price + expenses_total; Lucro bruto = Receita − Custo.
 * - Opex MENSAL = payables com truck_id pelo occurred_at + despesas gerais
 *   administrativas (não-compra e sem vínculo de caminhão).
 * - Opex SEMANAL = truck_expenses do período + despesas gerais não-compra
 *   (inclui vínculo de caminhão, com as gerais sobrepondo truck_expenses iguais).
 * - Valor das gerais = `F` do CRM: compartilhada → imperio_amount (senão 0);
 *   NÃO compartilhada → amount (senão imperio_amount).
 * - Despesas gerais de COMPRA (custo_aquisicao / parcela) nunca entram no opex;
 *   entram em Compras, junto com o purchase_price dos caminhões comprados
 *   (fora do "offline" e que ainda não viraram despesa de compra).
 * - Lucro líquido = Lucro bruto − Opex.
 * - Semana = segunda a domingo (getStartOfWeek do CRM).
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

function withPayable(snap: DashboardSnapshot, over: Partial<{ id: string; amount: number; truck_id: string | null; occurred_at: string | null; due_date: string; status: string; paid_at: string | null }>) {
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
    imperio_amount: number;
    c4_amount: number;
    shared: boolean;
    occurred_at: string;
    truck_id: string | null;
    category: string;
    purchase_installment_id: string | null;
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
        occurred_at: "2026-09-03",
        ...over,
      } as never,
    ],
  } as unknown as DashboardSnapshot;
}

function withTruckExpense(snap: DashboardSnapshot, over: Partial<{ id: string; amount: number; truck_id: string; occurred_at: string; kind: string }>) {
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

function withReceivable(snap: DashboardSnapshot, over: Partial<{ id: string; amount: number; status: string; received_at: string | null; due_date: string }>) {
  return {
    ...snap,
    receivables: [
      ...((snap.receivables ?? []) as never[]),
      {
        id: "r1",
        description: "Boleto",
        amount: 4000,
        status: "pago",
        received_at: "2026-09-10",
        due_date: "2026-09-05",
        ...over,
      } as never,
    ],
  } as unknown as DashboardSnapshot;
}

describe("computeMonthReport — relatório mensal do Executivo (espelho CRM)", () => {
  it("calcula faturamento, lucro bruto, liquido e resultado global de um mês", () => {
    let snap = baseSnap();
    snap = withTruck(snap, {});
    snap = withPayable(snap, {});
    snap = withGeneralExpense(snap, {});

    const r = computeMonthReport(snap, new Date(2026, 8, 15));
    expect(r.receita).toBe(100000);
    expect(r.custoCompra).toBe(80000);
    expect(r.despesasCaminhao).toBe(5000);
    expect(r.custoTotal).toBe(85000);
    expect(r.lucroBruto).toBe(20000); // Lucro Bruto = Venda − Compra (CRM mensal)
    expect(r.margemBruta).toBeCloseTo(20, 5);
    expect(r.opex).toBe(3000); // 2000 payable com truck + 1000 imperio_share
    expect(r.lucroLiquido).toBe(15000); // Lucro Líquido (caminhões) = Bruto − Despesas Diretas
    expect(r.margemLiquida).toBeCloseTo(15, 5);
    expect(r.resultadoGlobal).toBe(17000); // Resultado Global = Bruto − OPEX
    expect(r.margemGlobal).toBeCloseTo(17, 5);
    expect(r.vendas).toBe(1);
  });

  it("considera payable com vínculo de caminhão pelo occurred_at (mesmo aberto)", () => {
    const snap = withPayable(baseSnap(), { status: "aberto", paid_at: null });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(2000);
  });

  it("ignora payable sem vínculo de caminhão (espelho do CRM)", () => {
    const snap = withPayable(baseSnap(), { truck_id: null });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(0);
  });

  it("receita usa somente sold_at (sem fallback de updated_at)", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-07-10", updated_at: "2026-09-10" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.receita).toBe(0);
    expect(r.vendas).toBe(0);
  });

  it("mensal ignora caminhão vendido sem sold_price e fora de vendido/repasse (espelho do CRM)", () => {
    let snap = withTruck(baseSnap(), { sold_price: null });
    snap = withTruck(snap, { id: "t2", status: "negociacao", sold_at: "2026-09-09", sold_price: 150000, purchase_price: 120000 });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.receita).toBe(0);
    expect(r.compras).toBe(0);
    expect(r.vendas).toBe(0);
    expect(r.resultadoGlobal).toBe(0);
  });

  it("mensal conta caminhão repasse como venda (espelho do CRM)", () => {
    const snap = withTruck(baseSnap(), { status: "repasse", sold_at: "2026-09-10", sold_price: 100000, purchase_price: 80000 });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(1);
    expect(r.receita).toBe(100000);
  });

  it("não conta caminhões vendidos fora do mês", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-08-10", updated_at: "2026-08-10" });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.vendas).toBe(0);
    expect(r.receita).toBe(0);
    expect(r.lucroLiquido).toBe(0);
  });

  it("respeita a parte da Império em despesa geral compartilhada (imperio_amount)", () => {
    const snap = withGeneralExpense(baseSnap(), { amount: 5000, imperio_amount: 3000, shared: true });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(3000);
  });

  it("despesa geral não compartilhada conta pelo amount integral mesmo com imperio_amount preenchido (espelho do CRM)", () => {
    const snap = withGeneralExpense(baseSnap(), { amount: 5000, imperio_amount: 3000, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(5000);
  });

  it("despesa de COMPRA (custo_aquisicao) não entra no opex — vai para Compras", () => {
    let snap = baseSnap();
    snap = withGeneralExpense(snap, { category: "custo_aquisicao", amount: 50000, imperio_amount: 50000, shared: false });
    snap = withGeneralExpense(snap, { id: "g2", category: "custo_aquisicao", purchase_installment_id: "inst1", amount: 30000, imperio_amount: 30000, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(0);
    expect(r.compras).toBe(80000);
  });

  it("despesa geral com vínculo de caminhão não entra no opex mensal", () => {
    const snap = withGeneralExpense(baseSnap(), { truck_id: "t1", amount: 1500, imperio_amount: 1500, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.opex).toBe(0);
  });

  it("compras somam purchase_price dos caminhões com purchase_date no mês", () => {
    let snap = withTruck(baseSnap(), { purchase_date: "2026-09-02" });
    snap = withTruck(snap, { id: "t2", status: "disponivel", sold_at: null, purchase_date: "2026-09-03", purchase_price: 60000 });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.compras).toBe(140000);
  });

  it("compras não duplica caminhão que já virou despesa de compra", () => {
    let snap = withTruck(baseSnap(), { status: "disponivel", sold_at: null, purchase_date: "2026-09-03", purchase_price: 60000 });
    snap = withGeneralExpense(snap, { id: "g2", category: "custo_aquisicao", truck_id: "t1", amount: 60000, imperio_amount: 60000, shared: false });
    const r = computeMonthReport(snap, new Date(2026, 8, 1));
    expect(r.compras).toBe(60000);
    expect(r.opex).toBe(0);
  });

  it("entradas/saídas consideram somente quitados com vencimento no período", () => {
    let snap = baseSnap();
    snap = withReceivable(snap, { amount: 4000, status: "recebido" });
    snap = withReceivable(snap, { id: "r2", amount: 9000, status: "aberto", received_at: null });
    snap = withPayable(snap, { amount: 2000, status: "pago" });
    snap = withPayable(snap, { id: "p2", amount: 7000, status: "aberto", paid_at: null, occurred_at: "2026-09-01" });
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

describe("computeWeekReport — relatório semanal (segunda a domingo)", () => {
  it("agrupa pela semana contida (segunda a domingo)", () => {
    // 07/09/2026 é segunda-feira; 13/09/2026 domingo fecha a semana.
    const snap = withTruck(baseSnap(), { sold_at: "2026-09-07", updated_at: "2026-09-07" });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.receita).toBe(100000);
    expect(r.lucroLiquido).toBe(15000);
  });

  it("inclui venda no domingo que fecha a semana", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-09-13", updated_at: "2026-09-13" });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.vendas).toBe(1);
  });

  it("exclui venda em outra semana", () => {
    const snap = withTruck(baseSnap(), { sold_at: "2026-09-14", updated_at: "2026-09-14" });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.vendas).toBe(0);
  });

  it("despesas da semana = truck_expenses do período + gerais não-compra", () => {
    let snap = withTruckExpense(baseSnap(), { amount: 700, occurred_at: "2026-09-08" });
    snap = withTruckExpense(snap, { id: "e2", amount: 300, occurred_at: "2026-09-12" });
    snap = withGeneralExpense(snap, { occurred_at: "2026-09-08", amount: 2000, imperio_amount: 1000, shared: true });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.opex).toBe(2000); // 700 + 300 + 1000
  });

  it("não conta truck_expense fora da semana", () => {
    const snap = withTruckExpense(baseSnap(), { amount: 700, occurred_at: "2026-09-14" });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.opex).toBe(0);
  });

  it("semanal NÃO usa boletos/contas de caminhão (base é truck_expenses)", () => {
    const snap = withPayable(baseSnap(), { amount: 5000, truck_id: "t1", occurred_at: "2026-09-08", due_date: "2026-10-01" });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.opex).toBe(0);
  });

  it("semanal não restringe status e ignora venda sem sold_price (espelho do CRM)", () => {
    let snap = withTruck(baseSnap(), { status: "negociacao", sold_at: "2026-09-09", sold_price: 100000 });
    snap = withTruck(snap, { id: "t2", sold_at: "2026-09-09", sold_price: null, purchase_price: 90000, expenses_total: 1000 });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.vendas).toBe(1);
    expect(r.receita).toBe(100000);
    expect(r.lucroLiquido).toBe(15000);
  });

  it("despesa de compra não entra no opex semanal e vai para Compras", () => {
    let snap = baseSnap();
    snap = withGeneralExpense(snap, { occurred_at: "2026-09-09", category: "custo_aquisicao", amount: 40000, imperio_amount: 40000, shared: false });
    const r = computeWeekReport(snap, new Date(2026, 8, 10));
    expect(r.opex).toBe(0);
    expect(r.compras).toBe(40000);
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