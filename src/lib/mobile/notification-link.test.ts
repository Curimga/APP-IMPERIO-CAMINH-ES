import { describe, it, expect } from "vitest";
import { notificationLinkTarget } from "./notification-link";

/**
 * NOTIFICATION LINK — links vindos do banco (criados pelo CRM ou por outros
 * sistemas) devem ser validados contra as rotas reais do app. Links para
 * rotas inexistentes (`/estoque/<id>`, `/financeiro/contas-pagar`) devem
 * devolver `undefined` para a UI não renderizar um Link quebrado.
 */
describe("notificationLinkTarget", () => {
  it("aceita rotas de lista conhecidas (com e sem barra final)", () => {
    for (const path of ["/garagem", "/servicos", "/agenda", "/clientes", "/financeiro", "/estoque", "/vendidos", "/notificacoes", "/menu", "/pendencias", "/busca", "/perfil"]) {
      expect(notificationLinkTarget(path)).toBe(path);
    }
    expect(notificationLinkTarget("/garagem/")).toBe("/garagem");
  });

  it("aceita a rota de detalhe de caminhão /garagem/<id>", () => {
    expect(notificationLinkTarget("/garagem/abc-123")).toBe("/garagem/abc-123");
  });

  it("ignora query e hash ao normalizar", () => {
    expect(notificationLinkTarget("/servicos?truck_id=xyz&tab=atrasados")).toBe("/servicos");
    expect(notificationLinkTarget("/garagem/abc#foto")).toBe("/garagem/abc");
  });

  it("rejeita destinos que não existem no app", () => {
    expect(notificationLinkTarget("/estoque/abc-123")).toBeUndefined();
    expect(notificationLinkTarget("/financeiro/contas-pagar")).toBeUndefined();
    expect(notificationLinkTarget("/servicos/abc-123")).toBeUndefined();
    expect(notificationLinkTarget("/clientes/abc-123")).toBeUndefined();
    expect(notificationLinkTarget("/vendas/abc-123")).toBeUndefined();
    expect(notificationLinkTarget("https://example.com/x")).toBeUndefined();
    expect(notificationLinkTarget(null)).toBeUndefined();
    expect(notificationLinkTarget(undefined)).toBeUndefined();
  });
});