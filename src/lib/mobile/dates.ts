/**
 * Datas mobile — fuso America/Sao_Paulo.
 *
 * Regra crítica: datas simples (YYYY-MM-DD) nunca passam por `new Date("2026-09-08")`
 * (que interpreta como UTC e pode retroceder um dia no Brasil). Criamos as datas
 * como calendário local, sempre a partir dos componentes Y/M/D.
 */

/** Converte "YYYY-MM-DD" (ou "YYYY-MM-DDTHH:MM...") numa Date local de São Paulo. */
export function spaDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value);
  if (!m) return new Date(value);
  const [, y, mo, d, h = "0", mi = "0"] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0, 0);
}

/** "YYYY-MM-DD" local atual (sem deslocamento UTC). */
export function spaTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Substitui a data de uma ISO datetime preservando a hora local. */
export function spaSetDate(iso: string, dateISO: string): string {
  const dt = spaDate(iso);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateISO);
  if (!m) return iso;
  dt.setFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateISO}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
}

/**
 * Extrai apenas a parte "YYYY-MM-DD" (colunas `date` do banco) de qualquer
 * valor — se já for só data, devolve inalterado. Nunca envia datetime completo
 * para colunas `date` (regra do CRM).
 */
export function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return m ? m[1] : value;
}

/**
 * Converte uma hora LOCAL "YYYY-MM-DDTHH:mm[:ss]" (fuso America/Sao_Paulo do
 * usuário) para ISO UTC — mesmo contrato do CRM, que salva
 * `new Date(form.starts_at).toISOString()`. Strings que já carregam fuso
 * ("Z" ou offset) são normalizadas para o instante UTC.
 */
export function spaToUtcISO(value: string): string {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value).toISOString();
  const dt = spaDate(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toISOString();
}

/**
 * ISO/UTC → "YYYY-MM-DDTHH:mm:ss" na hora local — para formulários de edição.
 * Uma ISO gravada em UTC (ex.: 12:00Z) volta como 09:00 local, sem o
 * deslocamento de um dia que `slice(0, 10)` causaria.
 */
export function isoToSpaISO(value: string | null | undefined): string {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

export type MDate = string | Date | null | undefined;

/** dd/mm/yyyy a partir de qualquer entrada, sem deslocamento. */
export function mdBR(d: MDate): string {
  if (!d) return "—";
  if (typeof d === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const dt = d instanceof Date ? d : new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Label curto pt-BR do dia atual, ex.: "terça-feira, 8 de setembro". */
export function mdWeekdayLabel(today = new Date()): string {
  return `${WEEKDAYS[today.getDay()]}, ${today.getDate()} de ${today.toLocaleDateString("pt-BR", { month: "long" })}`;
}

/** Número de dias (inteiro) entre duas datas (positivo se b > a). */
export function mdDiffDays(a: MDate, b: MDate): number {
  const A = spaDate((a as string) ?? "");
  const B = spaDate((b as string) ?? "");
  const a0 = new Date(A.getFullYear(), A.getMonth(), A.getDate()).getTime();
  const b0 = new Date(B.getFullYear(), B.getMonth(), B.getDate()).getTime();
  return Math.round((b0 - a0) / 86400000);
}

/** Quantos dias o veículo está parado desde a data dada (>= 0). */
export function mdDaysParked(since: MDate): number {
  if (!since) return 0;
  const d = Math.max(0, mdDiffDays(since, new Date()));
  return Number.isFinite(d) ? d : 0;
}

/** "há X dias", "hoje", "amanhã", "atrasado" para exibição de prazos. */
export function mdRelative(d: MDate, ref = new Date()): string {
  if (!d) return "—";
  const diff = mdDiffDays(ref, d);
  const abs = Math.abs(diff);
  if (diff === 0) return "hoje";
  if (diff > 0) return abs === 1 ? "amanhã" : `em ${abs} dias`;
  return abs === 1 ? "atrasado há 1 d" : `atrasado há ${abs} dias`;
}

/** HH:MM a partir de ISO datetime local. */
export function mdTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /[T ](\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]}` : "—";
}
