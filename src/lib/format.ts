/**
 * POLÍTICA MONETÁRIA ÚNICA DO CRM
 * - Todo valor monetário é normalizado para 2 casas decimais (half-up, sem sinal negativo perdido).
 * - Toda exibição usa `brl()` (padrão pt-BR, sempre 2 casas).
 * - Toda entrada do usuário passa por `parseMoney()`.
 * - Toda soma/subtração/multiplicação monetária deve usar `money()` / `sumMoney()`.
 */

/** Arredonda um valor monetário para exatamente 2 casas, eliminando resíduos de ponto flutuante. */
export const money = (value: number | string | null | undefined): number => {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  // usa string exponencial para evitar erros de binário (ex.: 1.005 -> 1.00)
  const r = Math.round(Number(`${Math.abs(n)}e+2`)) / 100;
  return n < 0 ? -r : r;
};

/** Soma segura de valores monetários. */
export const sumMoney = (values: Array<number | string | null | undefined>): number =>
  money(values.reduce((acc: number, v) => acc + money(v), 0));

/** Multiplicação segura (ex.: quantidade × preço unitário). */
export const mulMoney = (a: number | string | null | undefined, b: number | string | null | undefined): number =>
  money(Number(a ?? 0) * Number(b ?? 0));

export const brl = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(money(typeof n === "string" ? parseMoney(n) : n));

/** Formata sem símbolo (para exportações/planilhas), sempre com 2 casas. */
export const money2 = (n: number | string | null | undefined) => money(n).toFixed(2);

export const parseMoney = (value: number | string | null | undefined, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? money(value) : fallback;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? money(parsed) : fallback;
};


/**
 * Returns today's date as a "YYYY-MM-DD" string using the user's local timezone.
 * Avoid UTC-based conversions that can return yesterday/tomorrow for users
 * in negative/positive offsets (e.g. Brazil UTC-3).
 */
export const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Formats a date value (Date | ISO string | "YYYY-MM-DD") as "dd/mm/yyyy" (pt-BR).
 * Date-only strings ("YYYY-MM-DD") are parsed as calendar dates (no timezone shift),
 * fixing the bug where a selected date like 09/08/2026 rendered as 08/08/2026 in UTC-3.
 */
export const dateBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  if (typeof d === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("pt-BR");
  }
  return new Date(d).toLocaleDateString("pt-BR");
};

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const monthLabel = (k: string) => {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};
