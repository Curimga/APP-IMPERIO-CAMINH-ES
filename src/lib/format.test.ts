import { describe, it, expect } from "vitest";
import { money, sumMoney, mulMoney, parseMoney, money2, brl } from "./format";

describe("parseMoney — entrada pt-BR do usuário", () => {
  it("lê milhar com ponto e decimal com vírgula", () => {
    // Regressão: o parser antigo trocava "." por "" e depois "," por ".",
    // transforming "1.500,00" em 1.5.
    expect(parseMoney("1.500,00")).toBe(1500);
    expect(parseMoney("1.500,00")).not.toBe(1.5);
    expect(parseMoney("12.345,67")).toBe(12345.67);
  });

  it("aceita apenas vírgula decimal", () => {
    expect(parseMoney("1500,50")).toBe(1500.5);
    expect(parseMoney("0,01")).toBe(0.01);
  });

  it("lê número simples e texto com R$ ou espaços", () => {
    expect(parseMoney("1500")).toBe(1500);
    expect(parseMoney("R$ 1.500,00")).toBe(1500);
    expect(parseMoney(" 700,90 ")).toBe(700.9);
  });

  it("preserva sinal negativo", () => {
    expect(parseMoney("-1.500,50")).toBe(-1500.5);
  });

  it("usa fallback em entrada vazia ou inválida", () => {
    expect(parseMoney("")).toBe(0);
    expect(parseMoney(null, 7)).toBe(7);
    expect(parseMoney("abc", 42)).toBe(42);
    expect(parseMoney(undefined, NaN)).toBeNaN();
  });

  it("normaliza número já numérico para 2 casas", () => {
    expect(parseMoney(10.005)).toBe(10.01);
    expect(parseMoney(10)).toBe(10);
  });
});

describe("money — half-up em centavos, sem perder o sinal", () => {
  it("arredonda meio centavo para cima", () => {
    expect(money(1.005)).toBe(1.01);
    expect(money(0.005)).toBe(0.01);
    expect(money(1.004999)).toBe(1);
  });

  it("mantém o sinal em valores negativos", () => {
    expect(money(-1.005)).toBe(-1.01);
    expect(money(-0.004)).toBe(0);
  });

  it("trata nulo, indefinido e não numérico como zero", () => {
    expect(money(null)).toBe(0);
    expect(money(undefined)).toBe(0);
    expect(money(NaN)).toBe(0);
    expect(money(Infinity)).toBe(0);
    expect(money("")).toBe(0);
  });
});

describe("sumMoney / mulMoney — agregados sem resíduo de ponto flutuante", () => {
  it("soma centavos sem derivar para mais/menos", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    // a política arredonda CADA item antes de somar: 10.01 + 20.01
    expect(sumMoney([10.005, 20.005])).toBe(30.02);
    expect(sumMoney([100, null, undefined, "50,50"])).toBe(150.5);
    expect(sumMoney([])).toBe(0);
  });

  it("multiplica arredondando o resultado", () => {
    expect(mulMoney(3, 33.335)).toBe(100.01);
    expect(mulMoney(null, 10)).toBe(0);
  });
});

describe("brl / money2 — exibição sempre em 2 casas", () => {
  it("formata em pt-BR com símbolo", () => {
    expect(brl(1500)).toMatch(/1\.500,00/);
    expect(brl("1.500,00")).toMatch(/1\.500,00/);
  });

  it("money2 sempre devolve string com 2 casas", () => {
    expect(money2(10)).toBe("10.00");
    expect(money2(10.005)).toBe("10.01");
    expect(money2(null)).toBe("0.00");
  });
});
