import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { notificationLinkTarget } from "./notification-link";

/**
 * Paridade entre o validador de rotas do Service Worker (public/sw.js) e a
 * fonte única do app (notification-link.ts). O SW é JS estático e não pode
 * importar TS; este teste garante que a lista de rotas não divergiu.
 */
const SW_PATH = new URL("../../../public/sw.js", import.meta.url);
const swSource = readFileSync(SW_PATH, "utf8");

describe("paridade de rotas do Service Worker", () => {
  it("inclui handlers de push e clique na notificação", () => {
    expect(swSource).toContain('addEventListener("push"');
    expect(swSource).toContain('addEventListener("notificationclick"');
    expect(swSource).toContain("showNotification");
  });

  it("contém todas as rotas reais do app", () => {
    const routes = [
      "/garagem",
      "/servicos",
      "/agenda",
      "/clientes",
      "/financeiro",
      "/estoque",
      "/vendidos",
      "/notificacoes",
      "/menu",
      "/pendencias",
      "/busca",
      "/perfil",
    ];
    for (const route of routes) {
      expect(swSource).toContain(`"${route}"`);
      expect(notificationLinkTarget(route)).toBe(route);
    }
  });

  it("usa a rota real de detalhe do caminhão (history routing, sem hash)", () => {
    expect(swSource).toContain("/garagem/");
    expect(notificationLinkTarget("/garagem/abc-123")).toBe("/garagem/abc-123");
    expect(notificationLinkTarget("/garagem/abc-123")).not.toContain("#");
  });
});
