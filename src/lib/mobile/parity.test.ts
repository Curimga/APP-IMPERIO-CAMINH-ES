import { describe, it, expect } from "vitest";
import {
  spaDate,
  spaSetDate,
  mdDiffDays,
  mdRelative,
  mdDaysParked,
  mdIsPastDue,
} from "./dates";
import {
  isFinanceExecutive,
  canSeeFinance,
  canEditFinance,
  canEditInventory,
  canManageTrucks,
  canRegisterExpense,
  roleLabel,
  MOBILE_MENU,
} from "./perm";
import { STATUS_OPTIONS } from "../truck-status";
import { sortTruckPhotos, getTruckCoverPhoto, getTruckCover, isFinancialNotification } from "./queries";
import { TABLE_KEYS } from "./realtime-map";

/**
 * PARITY — garante equivalência CRM ↔ APP testando o CÓDIGO REAL do APP
 * (não re-implementações locais). Todas são funções puras: sem rede, sem UI.
 */

describe("datas — fuso America/Sao_Paulo (sem regressão de meia-noite)", () => {
  it("spaDate(\"2026-09-08\") cria 8/set às 00:00 (sem ir para 07/set UTC)", () => {
    const d = spaDate("2026-09-08");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(0);
  });

  it("spaDate preserva hora local de ISO datetime (HH:MM)", () => {
    const d = spaDate("2026-09-08T23:30:00");
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(30);
  });

  it("spaSetDate(T23:30, 2026-09-09) mantém 23:30 e troca o dia", () => {
    const r = spaSetDate("2026-09-08T23:30:00", "2026-09-09");
    expect(r).toBe("2026-09-09T23:30:00");
  });

  it("mdDiffDays entre 08/set e 09/set = 1 (mesmo às 23:59 → 00:01)", () => {
    expect(mdDiffDays("2026-09-08", "2026-09-09")).toBe(1);
    expect(mdDiffDays("2026-09-08T23:59:00", "2026-09-09T00:01:00")).toBe(1);
  });

  it("mdDaysParked nunca negativo", () => {
    expect(mdDaysParked("2099-01-01")).toBe(0);
    expect(mdDaysParked("2020-01-01")).toBeGreaterThan(0);
  });

  it("mdRelative: atrasado/hoje/amanhã em pt-BR", () => {
    const ref = spaDate("2026-09-08");
    expect(mdRelative("2026-09-07", ref)).toContain("atrasado");
    expect(mdRelative("2026-09-08", ref)).toBe("hoje");
    expect(mdRelative("2026-09-09", ref)).toBe("amanhã");
  });

  it("mdIsPastDue considera hoje dentro do prazo", () => {
    expect(mdIsPastDue("2026-09-07", "2026-09-08")).toBe(true);
    expect(mdIsPastDue("2026-09-08", "2026-09-08")).toBe(false);
    expect(mdIsPastDue("2026-09-09", "2026-09-08")).toBe(false);
  });
});

describe("permissões — financeiro SOMENTE Executivo; estoque p/ secretaria/financeiro", () => {
  it("isFinanceExecutive aceita apenas admin", () => {
    expect(isFinanceExecutive(["admin"])).toBe(true);
    expect(isFinanceExecutive(["admin"], "josemar.essing@gmail.com")).toBe(false);
    expect(isFinanceExecutive(["financeiro"])).toBe(false);
    expect(isFinanceExecutive(["secretaria"])).toBe(false);
    expect(isFinanceExecutive([])).toBe(false);
  });

  it("canSeeFinance/canEditFinance = mesma regra (esconde valor para não-exec)", () => {
    expect(canSeeFinance(["admin"])).toBe(true);
    expect(canSeeFinance(["admin"], "josemar.essing@gmail.com")).toBe(false);
    expect(canSeeFinance(["financeiro"])).toBe(false);
    expect(canEditFinance(["financeiro"])).toBe(false);
  });

  it("estoque editável p/ admin, financeiro e secretaria", () => {
    expect(canEditInventory(["admin"])).toBe(true);
    expect(canEditInventory(["financeiro"])).toBe(true);
    expect(canEditInventory(["secretaria"])).toBe(true);
    // Sem papel definido → sem permissão (regra real; não existe role "vendedor")
    expect(canEditInventory([])).toBe(false);
  });

  it("cadastro (caminhão/cliente/serviço) — admin/financeiro/secretaria", () => {
    expect(canManageTrucks(["admin"])).toBe(true);
    expect(canManageTrucks(["financeiro"])).toBe(true);
    expect(canManageTrucks(["secretaria"])).toBe(true);
    expect(canManageTrucks([])).toBe(false);
  });

  it("despesa financeira — apenas Executivo", () => {
    expect(canRegisterExpense(["admin"])).toBe(true);
    expect(canRegisterExpense(["financeiro"])).toBe(false);
  });

  it("menu: módulo Financeiro visível apenas para admin", () => {
    const fin = MOBILE_MENU.find((m) => m.to === "/financeiro");
    expect(fin?.allowed(["admin"])).toBe(true);
    expect(fin?.allowed(["financeiro"])).toBe(false);
    expect(fin?.allowed(["secretaria"])).toBe(false);
  });

  it("roleLabel — ordem de precedência admin > financeiro > secretaria", () => {
    expect(roleLabel(["financeiro", "admin"])).toBe("Executivo");
    expect(roleLabel(["financeiro"])).toBe("Financeiro");
    expect(roleLabel(["secretaria"])).toBe("Secretaria");
    expect(roleLabel([])).toBe("Usuário");
  });
});

describe("status — trucks.status é a fonte única (capa/ordenação idêntica ao CRM)", () => {
  it("STATUS_OPTIONS cobre todos os rótulos exibidos", () => {
    expect(STATUS_OPTIONS.length).toBeGreaterThanOrEqual(8);
    expect(STATUS_OPTIONS.map((o) => o.v)).toContain("disponivel");
    expect(STATUS_OPTIONS.map((o) => o.v)).toContain("reservado");
  });

  it("sortTruckPhotos põe is_cover=true primeiro", () => {
    const r = sortTruckPhotos([
      { id: "1", url: "https://a.jpg", is_cover: false, position: 0, created_at: "x" },
      { id: "2", url: "https://b.jpg", is_cover: true, position: 1, created_at: "y" },
    ]);
    expect(r[0].id).toBe("2");
  });

  it("getTruckCoverPhoto → null sem foto/nula (placeholder, não quebra)", () => {
    expect(getTruckCoverPhoto(null)).toBeNull();
    expect(getTruckCoverPhoto({ truck_photos: [] })).toBeNull();
  });

  it("getTruckCover → URL da capa ou null", () => {
    const t = {
      truck_photos: [{ id: "1", url: "https://cover.jpg", is_cover: true, position: 0, created_at: "x" }],
    };
    expect(getTruckCover(t)).toBe("https://cover.jpg");
    expect(getTruckCover({ truck_photos: [] })).toBeNull();
  });
});

describe("Realtime — mapas de invalidação existem p/ todas as tabelas de mutation", () => {
  const MUTATION_TABLES = [
    "trucks",
    "truck_photos",
    "truck_status_history",
    "truck_expenses",
    "truck_purchase_installments",
    "services",
    "calendar_events",
    "customers",
    "notifications",
    "inventory_items",
    "deals",
    "leads",
    "payables",
    "receivables",
  ];

  it("cada tabela de mutation tem entrada no mapa", () => {
    for (const t of MUTATION_TABLES as (keyof typeof TABLE_KEYS)[]) {
      expect(TABLE_KEYS[t], `faltou TABLE_KEYS.${t}`).toBeDefined();
      expect(TABLE_KEYS[t].length).toBeGreaterThan(0);
    }
  });

  it("truck_photos invalida trucks-mobile e truck-mobile (capa)", () => {
    expect(TABLE_KEYS.truck_photos).toContain("trucks-mobile");
    expect(TABLE_KEYS.truck_photos).toContain("truck-mobile");
  });

  it("truck_status_history invalida trucks-mobile + dashboard-mobile", () => {
    expect(TABLE_KEYS.truck_status_history).toContain("trucks-mobile");
    expect(TABLE_KEYS.truck_status_history).toContain("dashboard-mobile");
  });

  it("services invalida services-mobile E dashboard-mobile", () => {
    expect(TABLE_KEYS.services).toContain("services-mobile");
    expect(TABLE_KEYS.services).toContain("dashboard-mobile");
  });

  it("calendar_events invalida agenda-mobile (CRM→APP sem F5)", () => {
    expect(TABLE_KEYS.calendar_events).toContain("agenda-mobile");
    expect(TABLE_KEYS.calendar_events).toContain("agenda-mobile-today");
  });
});

describe("notificações financeiras — ocultas fora do Financeiro/Executivo", () => {
  it("link /financeiro → financeira", () => {
    expect(isFinancialNotification({ title: "x", link: "/financeiro/contas" })).toBe(true);
  });

  it("menção a R$/pagamento/vencimento → financeira", () => {
    expect(isFinancialNotification({ title: "Conta a pagar", message: "R$ 1.200 vence hoje" })).toBe(true);
    expect(isFinancialNotification({ title: "Resumo", message: "Boleto pago" })).toBe(true);
  });

  it("texto operacional → NÃO é financeira", () => {
    expect(isFinancialNotification({ title: "Caminhão chegou", message: "BBY5H79 no pátio" })).toBe(false);
    expect(isFinancialNotification({ title: "Serviço em andamento", link: "/servicos/1" })).toBe(false);
  });
});
