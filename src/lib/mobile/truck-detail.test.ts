import { describe, expect, it } from "vitest";
import {
  expenseKindLabel,
  maySeeCpfCnpj,
  maySeeTruckFinance,
  normalizeTruckIdParam,
  resolveTruckSale,
  truckDetailPath,
  truckDocumentsList,
  truckExpenseSummary,
  truckFinanceSnapshot,
  truckIndicator,
  type TruckCustomerRef,
  type TruckDealRef,
} from "./truck-detail";

const deal = (overrides: Partial<TruckDealRef>): TruckDealRef => ({
  id: "deal-1",
  truck_id: "truck-1",
  customer_id: "customer-1",
  stage: "negociacao",
  title: "Negociação",
  notes: null,
  value: null,
  priority: "media",
  owner_id: null,
  occurred_at: null,
  created_at: "2026-09-01T10:00:00",
  updated_at: "2026-09-02T10:00:00",
  ...overrides,
});

const customers: TruckCustomerRef[] = [
  { id: "customer-1", name: "Cliente Um", phone: "111", document: "000" },
  { id: "customer-2", name: "Cliente Dois", phone: "222", document: "111" },
];

describe("truck-detail — rota e acesso", () => {
  it("monta a ficha sempre por trucks.id", () => {
    expect(truckDetailPath("abc 123")).toBe("/garagem/abc%20123");
  });

  it("normaliza parâmetro inválido", () => {
    expect(normalizeTruckIdParam(" truck-1 ")).toBe("truck-1");
    expect(normalizeTruckIdParam(" ")).toBeNull();
    expect(normalizeTruckIdParam(undefined)).toBeNull();
  });

  it("valores financeiros e CPF/CNPJ são exclusivos do Executivo", () => {
    expect(maySeeTruckFinance(["admin"])).toBe(true);
    expect(maySeeTruckFinance(["financeiro"])).toBe(false);
    expect(maySeeTruckFinance(["secretaria"])).toBe(false);
    expect(maySeeCpfCnpj(["admin"])).toBe(true);
    expect(maySeeCpfCnpj(["financeiro"])).toBe(false);
  });
});

describe("truck-detail — financeiro", () => {
  it("calcula compra + despesas como custo investido", () => {
    const r = truckFinanceSnapshot({ purchase_price: 100_000, expenses_total: 12_345.67 });
    expect(r.investedCost).toBe(112_345.67);
  });

  it("calcula lucro e margem de vendido pela mesma regra do CRM", () => {
    const r = truckFinanceSnapshot({ status: "vendido", purchase_price: 100_000, expenses_total: 20_000, sold_price: 150_000 });
    expect(r.profit).toBe(30_000);
    expect(r.marginPct).toBe(20);
  });

  it("não calcula lucro/margem de caminhão não vendido", () => {
    const r = truckFinanceSnapshot({ status: "disponivel", purchase_price: 100_000, expected_price: 150_000 });
    expect(r.profit).toBeNull();
    expect(r.marginPct).toBeNull();
  });

  it("resume despesas por total, pagas e pendentes", () => {
    expect(truckExpenseSummary([{ amount: 10, status: "pago" }, { amount: 15, status: "pendente" }])).toEqual({
      total: 25,
      count: 2,
      paid: 1,
      pending: 1,
    });
  });
});

describe("truck-detail — venda e comprador", () => {
  it("resolve comprador por sold_customer_id antes do deal", () => {
    const r = resolveTruckSale({
      truckId: "truck-1",
      truck: { status: "vendido", sold_customer_id: "customer-2", sold_price: 150_000, sold_at: "2026-09-10" },
      deals: [deal({ stage: "vendido", customer_id: "customer-1" })],
      customers,
    });
    expect(r.sold).toBe(true);
    expect(r.customer?.id).toBe("customer-2");
  });

  it("usa customer_id do deal vendido quando sold_customer_id está ausente", () => {
    const r = resolveTruckSale({
      truckId: "truck-1",
      truck: { status: "vendido", sold_customer_id: null, sold_price: 150_000 },
      deals: [deal({ stage: "vendido", customer_id: "customer-1" })],
      customers,
    });
    expect(r.customer?.name).toBe("Cliente Um");
  });

  it("resolve reserva/negociação ativa para caminhão ainda não vendido", () => {
    const r = resolveTruckSale({
      truckId: "truck-1",
      truck: { status: "reservado" },
      deals: [deal({ stage: "negociacao", customer_id: "customer-1" })],
      customers,
    });
    expect(r.sold).toBe(false);
    expect(r.activeDeal?.stage).toBe("negociacao");
    expect(r.customer?.id).toBe("customer-1");
  });
});

describe("truck-detail — exibição operacional", () => {
  it("gera indicadores de venda/reserva/disponível", () => {
    expect(truckIndicator("vendido")).toBe("Vendido");
    expect(truckIndicator("reservado")).toBe("Reservado");
    expect(truckIndicator("disponivel")).toBe("Disponível");
    expect(truckIndicator("oficina")).toBeNull();
  });

  it("mescla truck_documents e documents em ordem mais recente", () => {
    const docs = truckDocumentsList({
      truckDocuments: [{ id: "1", file_name: "CRLV", file_type: "pdf", category: "doc", created_at: "2026-09-01", file_path: "a.pdf" }],
      documents: [{ id: "2", title: "Contrato", kind: "contrato", url: null, storage_path: "b.pdf", mime_type: "pdf", notes: null, created_at: "2026-09-10" }],
    });
    expect(docs.map((d) => d.name)).toEqual(["Contrato", "CRLV"]);
    expect(docs[0].path).toBe("b.pdf");
  });

  it("traduz categorias conhecidas de despesa", () => {
    expect(expenseKindLabel("manutencao")).toBe("Manutenção");
    expect(expenseKindLabel("x")).toBe("x");
  });
});
