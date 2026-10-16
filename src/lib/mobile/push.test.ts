// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  buildPushPayload,
  urlBase64ToUint8Array,
  subscriptionToRow,
  pushEnableMessage,
  selectNewNotifications,
  pruneSeenIds,
} from "./push";
import { isFinancialNotification } from "./queries";

describe("buildPushPayload — payload exibido pelo Service Worker", () => {
  it("usa título de fallback e mantém mensagem e id", () => {
    const payload = buildPushPayload({ id: "n1", title: "  ", message: "Caminhão BBY5H79 no pátio", link: null });
    expect(payload.title).toBe("Império Caminhões");
    expect(payload.body).toBe("Caminhão BBY5H79 no pátio");
    expect(payload.notificationId).toBe("n1");
    expect(payload.tag).toBe("n1");
    expect(payload.link).toBeNull();
  });

  it("valida o link contra as rotas reais do app", () => {
    expect(buildPushPayload({ id: "n2", title: "Serviço", link: "/garagem/abc" }).link).toBe("/garagem/abc");
    expect(buildPushPayload({ id: "n3", title: "Financeiro", link: "/financeiro/contas-pagar" }).link).toBeNull();
    expect(buildPushPayload({ id: "n4", title: "Externo", link: "https://example.com" }).link).toBeNull();
  });
});

describe("urlBase64ToUint8Array — chave pública VAPID", () => {
  it("decodifica base64 padrão", () => {
    expect(Array.from(urlBase64ToUint8Array("AAECAw"))).toEqual([0, 1, 2, 3]);
  });

  it("decodifica base64url (troca - e _)", () => {
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([251, 255]);
  });
});

describe("subscriptionToRow — inscrição do dispositivo", () => {
  const valid = {
    endpoint: "https://push.example/abc",
    keys: { p256dh: "p256", auth: "authkey" },
  };

  it("monta a linha vinculada ao UUID autenticado", () => {
    const row = subscriptionToRow("user-1", valid, "UA", "2026-10-16T00:00:00.000Z");
    expect(row).toEqual({
      user_id: "user-1",
      endpoint: "https://push.example/abc",
      p256dh: "p256",
      auth: "authkey",
      user_agent: "UA",
      last_seen_at: "2026-10-16T00:00:00.000Z",
    });
  });

  it("rejeita inscrição incompleta (resposta de erro)", () => {
    expect(() => subscriptionToRow("user-1", { endpoint: "https://x" })).toThrow();
    expect(() => subscriptionToRow("user-1", { endpoint: "https://x", keys: {} })).toThrow();
  });
});

describe("pushEnableMessage — resposta de erro ao usuário", () => {
  it("mapeia cada motivo para uma mensagem", () => {
    expect(pushEnableMessage("unsupported")).toMatch(/navegador/i);
    expect(pushEnableMessage("not_configured")).toMatch(/servidor/i);
    expect(pushEnableMessage("denied")).toMatch(/bloqueadas/i);
    expect(pushEnableMessage("insecure")).toMatch(/HTTPS/i);
    expect(pushEnableMessage("error")).toMatch(/não foi possível/i);
  });
});

describe("deduplicação — selects de novas notificações", () => {
  const items = [
    { id: "a", read: false },
    { id: "b", read: true },
    { id: "c", read: false },
  ];

  it("ignora lidas e ids já exibidos", () => {
    expect(selectNewNotifications(items, ["a"]).map((i) => i.id)).toEqual(["c"]);
    expect(selectNewNotifications(items, []).map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("mantém apenas os últimos ids vistos", () => {
    expect(pruneSeenIds(["a", "b", "c"], 2)).toEqual(["b", "c"]);
    expect(pruneSeenIds(["a", "a", "b"], 10)).toEqual(["a", "b"]);
  });

  it("respeita o filtro financeiro no pipeline do complemento", () => {
    const all = [
      { id: "f", read: false, title: "Conta a pagar", message: "R$ 1.200 vence hoje", link: null },
      { id: "o", read: false, title: "Caminhão chegou", message: "BBY5H79 no pátio", link: null },
    ];
    const visibleToNonExec = all.filter((n) => !isFinancialNotification(n));
    expect(selectNewNotifications(visibleToNonExec, []).map((i) => i.id)).toEqual(["o"]);
    expect(selectNewNotifications(all, []).length).toBe(2);
  });
});
