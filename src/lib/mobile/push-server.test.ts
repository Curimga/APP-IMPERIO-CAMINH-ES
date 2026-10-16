import { describe, it, expect } from "vitest";
import {
  authorizeRequest,
  buildPayload,
  extractRecord,
  isFinancialNotification,
  isFinancialRecipientAllowed,
  parseUserIdList,
  secretsMatch,
  FINANCE_BLOCKED_EMAILS,
} from "../../../supabase/functions/push-send/logic";

const SECRET = "s3cr3t-do-webhook";
const INDIVIDUAL = "11111111-1111-1111-1111-111111111111";
const OUTRO = "22222222-2222-2222-2222-222222222222";

describe("autenticação do webhook (x-webhook-secret)", () => {
  it("aceita POST com o segredo correto quando VAPID está configurado", async () => {
    const decision = await authorizeRequest({
      method: "POST",
      providedSecret: SECRET,
      expectedSecret: SECRET,
      vapidConfigured: true,
    });
    expect(decision).toEqual({ kind: "continue" });
  });

  it("retorna 401 quando o cabeçalho está ausente", async () => {
    const decision = await authorizeRequest({
      method: "POST",
      providedSecret: null,
      expectedSecret: SECRET,
      vapidConfigured: true,
    });
    expect(decision).toMatchObject({ kind: "response", status: 401 });
  });

  it("retorna 401 quando o cabeçalho está vazio", async () => {
    const decision = await authorizeRequest({
      method: "POST",
      providedSecret: "",
      expectedSecret: SECRET,
      vapidConfigured: true,
    });
    expect(decision).toMatchObject({ kind: "response", status: 401 });
  });

  it("retorna 401 quando o segredo é incorreto", async () => {
    const decision = await authorizeRequest({
      method: "POST",
      providedSecret: "segredo-errado",
      expectedSecret: SECRET,
      vapidConfigured: true,
    });
    expect(decision).toMatchObject({ kind: "response", status: 401 });
  });

  it("nega (401) mesmo se VAPID ainda não estiver configurado", async () => {
    const decision = await authorizeRequest({
      method: "POST",
      providedSecret: "segredo-errado",
      expectedSecret: SECRET,
      vapidConfigured: false,
    });
    expect(decision).toMatchObject({ kind: "response", status: 401 });
  });

  it("falha fechado (503) quando o segredo não está configurado no servidor", async () => {
    const decision = await authorizeRequest({
      method: "POST",
      providedSecret: SECRET,
      expectedSecret: null,
      vapidConfigured: true,
    });
    expect(decision).toMatchObject({ kind: "response", status: 503 });
  });

  it("retorna 503 quando o segredo confere mas falta VAPID", async () => {
    const decision = await authorizeRequest({
      method: "POST",
      providedSecret: SECRET,
      expectedSecret: SECRET,
      vapidConfigured: false,
    });
    expect(decision).toMatchObject({ kind: "response", status: 503 });
  });

  it("responde ao preflight OPTIONS e rejeita métodos não-POST", async () => {
    expect(
      await authorizeRequest({ method: "OPTIONS", expectedSecret: SECRET, vapidConfigured: true }),
    ).toMatchObject({ kind: "response", status: 200 });
    expect(
      await authorizeRequest({ method: "GET", expectedSecret: SECRET, vapidConfigured: true }),
    ).toMatchObject({ kind: "response", status: 405 });
  });

  it("secretsMatch é constante e correto", async () => {
    expect(await secretsMatch(SECRET, SECRET)).toBe(true);
    expect(await secretsMatch("", SECRET)).toBe(false);
    expect(await secretsMatch("curto", SECRET)).toBe(false);
    expect(await secretsMatch(`${SECRET} `, SECRET)).toBe(false);
  });
});

describe("extractRecord e payload", () => {
  it("aceita o corpo do webhook do Supabase ({ type, record })", () => {
    const record = extractRecord({
      type: "INSERT",
      table: "notifications",
      record: { id: "n1", title: "Olá", user_id: INDIVIDUAL },
    });
    expect(record).toMatchObject({ id: "n1", title: "Olá", user_id: INDIVIDUAL });
  });

  it("aceita { notification } e o próprio registro", () => {
    expect(extractRecord({ notification: { id: "n2", title: "B" } })?.id).toBe("n2");
    expect(extractRecord({ id: "n3", title: "C" })?.id).toBe("n3");
  });

  it("descarta corpo sem id/title ou não-objeto", () => {
    expect(extractRecord(null)).toBeNull();
    expect(extractRecord({ title: "sem id" })).toBeNull();
    expect(extractRecord({ id: "sem titulo" })).toBeNull();
    expect(extractRecord("texto")).toBeNull();
  });

  it("buildPayload usa título padrão e link nulo", () => {
    const payload = buildPayload({ id: "n1", title: "   ", message: null, link: 123 as never });
    expect(payload.title).toBe("Império Caminhões");
    expect(payload.body).toBe("");
    expect(payload.link).toBeNull();
    expect(payload.tag).toBe("n1");
  });
});

describe("classificação financeira", () => {
  it("reconhece link do módulo financeiro e termos monetários", () => {
    expect(isFinancialNotification({ id: "1", title: "x", link: "/financeiro/contas" })).toBe(true);
    expect(isFinancialNotification({ id: "1", title: "Pagamento recebido" })).toBe(true);
    expect(isFinancialNotification({ id: "1", title: "Vencimento hoje" })).toBe(true);
    expect(isFinancialNotification({ id: "1", title: "Boleto em atraso" })).toBe(true);
  });

  it("não classifica notificação neutra como financeira", () => {
    expect(isFinancialNotification({ id: "1", title: "Novo caminhão cadastrado" })).toBe(false);
    expect(isFinancialNotification({ id: "1", title: "Serviço atualizado" })).toBe(false);
  });
});

describe("autorização financeira individual (sem cargo admin)", () => {
  it("autoriza o UUID individual mesmo sem ser admin", () => {
    expect(
      isFinancialRecipientAllowed({
        isAdmin: false,
        userId: INDIVIDUAL,
        individualUserIds: parseUserIdList(`${INDIVIDUAL},${OUTRO}`),
      }),
    ).toBe(true);
  });

  it("nega quem não é admin nem tem UUID individual", () => {
    expect(
      isFinancialRecipientAllowed({
        isAdmin: false,
        userId: OUTRO,
        individualUserIds: parseUserIdList(INDIVIDUAL),
      }),
    ).toBe(false);
  });

  it("admin fora da lista de bloqueio é autorizado; e-mail bloqueado nunca", () => {
    expect(
      isFinancialRecipientAllowed({
        isAdmin: true,
        email: "admin@imperio.com",
        userId: ADMIN_UUID,
        individualUserIds: new Set(),
      }),
    ).toBe(true);
    for (const blocked of FINANCE_BLOCKED_EMAILS) {
      expect(
        isFinancialRecipientAllowed({
          isAdmin: true,
          email: blocked.toUpperCase(),
          userId: ADMIN_UUID,
          individualUserIds: new Set(),
        }),
      ).toBe(false);
      expect(
        isFinancialRecipientAllowed({
          isAdmin: false,
          email: blocked,
          userId: INDIVIDUAL,
          individualUserIds: parseUserIdList(INDIVIDUAL),
        }),
      ).toBe(false);
    }
  });
});

describe("parseUserIdList", () => {
  it("normaliza, separa por vírgula/espaço e ignora não-UUID", () => {
    const ids = parseUserIdList(`${INDIVIDUAL.toUpperCase()}, nao-e-uuid; ${OUTRO}`);
    expect(ids.has(INDIVIDUAL)).toBe(true);
    expect(ids.has(OUTRO)).toBe(true);
    expect(ids.size).toBe(2);
    expect(parseUserIdList("").size).toBe(0);
    expect(parseUserIdList(null).size).toBe(0);
    expect(parseUserIdList("usuario@imperio.com").size).toBe(0);
  });
});

const ADMIN_UUID = "33333333-3333-3333-3333-333333333333";
