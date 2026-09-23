import { describe, it, expect } from "vitest";
import { ALL_QUERY_KEYS, TABLE_KEYS } from "./realtime-map";
import { FINANCIAL_TABLES, realtimeTablesForRoles } from "@/components/dashboard/use-realtime-sync";
import { restoreStatusAfterService, serviceCategoryToTruckStatus } from "./service-truck";

/**
 * REALTIME — cobertura de invalidação e regra de perfil.
 *
 * Garante (a) que TODOS os prefixos de queryKeys usados pelas queries do app
 * são invalidados pelo mapa Realtime (sem lacunas como agenda-range/event-mobile)
 * e (b) que Financeiro/Secretária NÃO assinam tabelas financeiras.
 */

const MOBILE_QUERY_PREFIXES = [
  "trucks-mobile",
  "truck-mobile",
  "truck-detail",
  "agenda-mobile",
  "agenda-range",
  "event-mobile",
  "agenda-mobile-today",
  "dashboard-mobile",
  "services-mobile",
  "suppliers-options",
  "customers-mobile",
  "finance-mobile",
  "capital-imobilizado",
  "inventory-mobile",
  "sold-trucks-mobile",
  "notifications-mobile",
];

describe("realtime-map — todos os prefixes mobile de queries.ts são invalidáveis", () => {
  it("ALL_QUERY_KEYS cobre cada prefixo usado pelas queries do app", () => {
    for (const prefix of MOBILE_QUERY_PREFIXES) {
      expect(ALL_QUERY_KEYS, `faltou queryKey "${prefix}" no mapa`).toContain(prefix);
    }
  });

  it("calendar_events invalida agenda-range e event-mobile (CRM→APP na agenda sem F5)", () => {
    expect(TABLE_KEYS.calendar_events).toContain("agenda-range");
    expect(TABLE_KEYS.calendar_events).toContain("event-mobile");
    expect(TABLE_KEYS.calendar_events).toContain("agenda-mobile");
    expect(TABLE_KEYS.calendar_events).toContain("agenda-mobile-today");
  });

  it("services/payables/receivables também invalidam agenda-range (eventos vinculados)", () => {
    expect(TABLE_KEYS.services).toContain("agenda-range");
    expect(TABLE_KEYS.payables).toContain("agenda-range");
    expect(TABLE_KEYS.receivables).toContain("agenda-range");
  });

  it("tabelas de mutation essenciais mantêm entradas não vazias no mapa", () => {
    for (const t of [
      "trucks",
      "truck_photos",
      "truck_status_history",
      "truck_expenses",
      "general_expenses",
      "services",
      "calendar_events",
      "customers",
      "notifications",
      "inventory_items",
    ] as const) {
      expect(TABLE_KEYS[t], `faltou TABLE_KEYS.${t}`).toBeDefined();
      expect(TABLE_KEYS[t].length).toBeGreaterThan(0);
    }
  });
});

describe("realtime hub — assinatura por perfil (financeiro/secretária não assinam finanças)", () => {
  it("admin assina TODAS as tabelas (inclusive financeiras)", () => {
    const tables = realtimeTablesForRoles(["admin"]);
    for (const fin of FINANCIAL_TABLES) {
      expect(tables, `admin deveria assinar ${fin}`).toContain(fin);
    }
  });

  it("financeiro NÃO assina nenhuma tabela financeira privada", () => {
    const tables = realtimeTablesForRoles(["financeiro"]);
    for (const fin of FINANCIAL_TABLES) {
      expect(tables, `${fin} deveria ficar fora p/ financeiro`).not.toContain(fin);
    }
  });

  it("secretaria NÃO assina nenhuma tabela financeira privada", () => {
    const tables = realtimeTablesForRoles(["secretaria"]);
    for (const fin of FINANCIAL_TABLES) {
      expect(tables, `${fin} deveria ficar fora p/ secretaria`).not.toContain(fin);
    }
  });

  it("financeiro/secretaria continuam assinando as tabelas operacionais", () => {
    const tables = realtimeTablesForRoles(["secretaria"]);
    for (const op of [
      "trucks",
      "services",
      "calendar_events",
      "customers",
      "notifications",
      "inventory_items",
      "truck_expenses",
      "suppliers",
    ] as const) {
      expect(tables, `${op} deveria continuar assinada p/ secretaria`).toContain(op);
    }
  });
});

describe("service-truck — status do caminhão segue a regra do CRM", () => {
  it("categorias operacionais viram status correspondente", () => {
    expect(serviceCategoryToTruckStatus("pintura")).toBe("pintura");
    expect(serviceCategoryToTruckStatus("oficina")).toBe("oficina");
    expect(serviceCategoryToTruckStatus("despachante")).toBe("despachante");
    expect(serviceCategoryToTruckStatus("interna")).toBe("interna");
    expect(serviceCategoryToTruckStatus("patio")).toBe("patio");
  });

  it("demais categorias (mecanica/funilaria/eletrica/pneus) → oficina", () => {
    expect(serviceCategoryToTruckStatus("mecanica")).toBe("oficina");
    expect(serviceCategoryToTruckStatus("funilaria")).toBe("oficina");
    expect(serviceCategoryToTruckStatus("eletrica")).toBe("oficina");
    expect(serviceCategoryToTruckStatus("pneus")).toBe("oficina");
    expect(serviceCategoryToTruckStatus(null)).toBe("oficina");
  });

  it("restauração: status anterior preservado; sem anterior → disponivel", () => {
    expect(restoreStatusAfterService("reservado")).toBe("reservado");
    expect(restoreStatusAfterService("venda")).toBe("venda");
    expect(restoreStatusAfterService(null)).toBe("disponivel");
    expect(restoreStatusAfterService(undefined)).toBe("disponivel");
  });
});