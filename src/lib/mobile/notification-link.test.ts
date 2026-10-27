import { describe, it, expect } from "vitest";
import { notificationLinkTarget } from "./notification-link";

/**
 * NOTIFICATION LINK — links vindos do banco (criados pelo CRM ou por outros
 * sistemas) devem ser validados contra as rotas reais do app. Links para
 * rotas inexistentes (`/estoque/<id>`, `/servicos/<id>`) devem
 * devolver `undefined` para a UI não renderizar um Link quebrado. As
 * sub-rotas financeiras do CRM (`/financeiro/contas-pagar`) sao redirecionadas
 * para `/financeiro`, que e a rota real do app.
 */
describe("notificationLinkTarget", () => {
  it("aceita rotas de lista conhecidas (com e sem barra final)", () => {
    for (const path of ["/garagem", "/servicos", "/agenda", "/clientes", "/financeiro", "/estoque", "/vendidos", "/notificacoes", "/menu", "/pendencias", "/busca", "/perfil", "/fluxo-caminhao", "/confirmacao-despesas", "/secretaria/lancamento-do-dia", "/secretaria/aprovacao-executivo"]) {
      expect(notificationLinkTarget(path)).toBe(path);
    }
    expect(notificationLinkTarget("/garagem/")).toBe("/garagem");
  });

  it("aceita detalhes do fluxo somente no formato /fluxo-caminhao/<truckId>", () => {
    expect(notificationLinkTarget("/fluxo-caminhao/truck-123")).toBe("/fluxo-caminhao/truck-123");
    expect(notificationLinkTarget("/fluxo-caminhao/truck-123/outro")).toBeUndefined();
  });

  it("aceita a rota de detalhe de caminhão /garagem/<id>", () => {
    expect(notificationLinkTarget("/garagem/abc-123")).toBe("/garagem/abc-123");
  });

  it("ignora query e hash ao normalizar", () => {
    expect(notificationLinkTarget("/servicos?truck_id=xyz&tab=atrasados")).toBe("/servicos");
    expect(notificationLinkTarget("/garagem/abc#foto")).toBe("/garagem/abc");
  });

  it("redireciona sub-rotas financeiras do CRM para /financeiro", () => {
    expect(notificationLinkTarget("/financeiro/contas-pagar")).toBe("/financeiro");
    expect(notificationLinkTarget("/financeiro/contas-pagar?id=abc-123")).toBe("/financeiro");
    expect(notificationLinkTarget("/financeiro/contas-receber?id=abc-123")).toBe("/financeiro");
    expect(notificationLinkTarget("/financeiro/contas")).toBe("/financeiro");
  });

  it("rejeita destinos que nao existem no app", () => {
    expect(notificationLinkTarget("/estoque/abc-123")).toBeUndefined();
    expect(notificationLinkTarget("/servicos/abc-123")).toBeUndefined();
    expect(notificationLinkTarget("/clientes/abc-123")).toBeUndefined();
    expect(notificationLinkTarget("/vendas/abc-123")).toBeUndefined();
    expect(notificationLinkTarget("https://example.com/x")).toBeUndefined();
    expect(notificationLinkTarget(null)).toBeUndefined();
    expect(notificationLinkTarget(undefined)).toBeUndefined();
  });
});
