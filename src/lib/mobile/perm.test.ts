import { describe, it, expect } from "vitest";
import {
  canAccessBanking,
  canSeeFinanceNotifications,
  isFinanceExecutive,
  isIndividualFinanceUser,
} from "./perm";
import type { AppRole } from "@/hooks/use-auth";

const ADMIN_EMAIL = "executivo@imperiocaminhoes.com.br";
const OUTRO = "99999999-9999-4999-8999-999999999999";

describe("permissão financeira individual (por UUID, sem admin)", () => {
  it("não reconhece um UUID qualquer como autorizado", () => {
    expect(isIndividualFinanceUser(OUTRO)).toBe(false);
    expect(isIndividualFinanceUser(null)).toBe(false);
    expect(isIndividualFinanceUser(undefined)).toBe(false);
  });

  it("não concede acesso a não-admin enquanto a allowlist está vazia", () => {
    const roles: AppRole[] = ["secretaria"];
    expect(canAccessBanking(roles, "x@imperiocaminhoes.com.br", OUTRO)).toBe(false);
    expect(canSeeFinanceNotifications(roles, "x@imperiocaminhoes.com.br", OUTRO)).toBe(false);
  });

  it("admin (não bloqueado) acessa bancos e notificações financeiras", () => {
    const roles: AppRole[] = ["admin"];
    expect(isFinanceExecutive(roles, ADMIN_EMAIL)).toBe(true);
    expect(canAccessBanking(roles, ADMIN_EMAIL, "any")).toBe(true);
    expect(canSeeFinanceNotifications(roles, ADMIN_EMAIL, "any")).toBe(true);
  });

  it("a regra de bancos e a de notificações financeiras são idênticas", () => {
    const cases: Array<[AppRole[], string | null, string | null]> = [
      [["admin"], ADMIN_EMAIL, "u1"],
      [["financeiro"], "fin@imperiocaminhoes.com.br", "u2"],
      [["secretaria"], "sec@imperiocaminhoes.com.br", "u3"],
      [["admin"], "josemar.essing@gmail.com", "u4"],
      [[], null, null],
    ];
    for (const [roles, email, userId] of cases) {
      expect(canAccessBanking(roles, email, userId)).toBe(
        canSeeFinanceNotifications(roles, email, userId),
      );
    }
  });
});
