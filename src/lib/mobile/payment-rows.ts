import type { Enums, TablesInsert } from "@/integrations/supabase/types";
import { money } from "@/lib/format";

/**
 * Construção pura das linhas de `payables` / `receivables` (lançamentos
 * financeiros do Executivo) — mesmo contrato de colunas do CRM.
 *
 * - 1..24 parcelas: cada parcela vira UMA linha, com `due_date` avançando
 *   mês a mês a partir da data base, valor quotal (`money(total / n)`),
 *   `occurrence_number` sequencial e, para contas a receber,
 *   `installment_number` + `installment_total`.
 * - Status inicial sempre "aberto"; `paid_at`/`received_at` ficam nulos.
 * - Não usa Supabase: módulo 100% determinístico para testes.
 */

export interface PaymentInput {
  kind: "pagar" | "receber";
  description: string;
  amount: number;
  due_date: string;
  occurred_at: string;
  category_id?: string | null;
  bank_account_id?: string | null;
  supplier?: string | null;
  customer_id?: string | null;
  truck_id?: string | null;
  payment_method?: Enums<"payment_method"> | null;
  is_urgent?: boolean;
  notes?: string | null;
  installments?: number;
}

const MAX_INSTALLMENTS = 24;

function installmentsOf(input: PaymentInput): number {
  const n = Math.trunc(Number(input.installments ?? 1));
  return Number.isFinite(n) && n >= 1 && n <= MAX_INSTALLMENTS ? n : 1;
}

/** Soma meses sobre uma data "YYYY-MM-DD", prendendo no último dia do mês
 *  alvo (ex.: 31/01 + 1 mês → 28/02; nunca estoura para o mês seguinte). */
export function addMonths(dateISO: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateISO);
  if (!m) return dateISO;
  const day = Number(m[3]);
  const lastDay = new Date(Number(m[1]), Number(m[2]) + months, 0).getDate();
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + months, Math.min(day, lastDay));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildPayableRows(
  input: PaymentInput,
  userId: string | null,
): TablesInsert<"payables">[] {
  const n = installmentsOf(input);
  const quota = money(input.amount / n);
  const rows: TablesInsert<"payables">[] = [];
  for (let i = 0; i < n; i += 1) {
    rows.push({
      description: input.description.trim(),
      amount: quota,
      due_date: addMonths(input.due_date, i),
      occurred_at: addMonths(input.occurred_at, i),
      category_id: input.category_id || null,
      bank_account_id: input.bank_account_id || null,
      supplier: input.supplier?.trim() || null,
      truck_id: input.truck_id || null,
      payment_method: input.payment_method || null,
      is_urgent: input.is_urgent ?? false,
      notes: input.notes?.trim() || null,
      occurrence_number: i + 1,
      status: "aberto",
      created_by: userId ?? null,
    });
  }
  return rows;
}

export function buildReceivableRows(
  input: PaymentInput,
  userId: string | null,
): TablesInsert<"receivables">[] {
  const n = installmentsOf(input);
  const quota = money(input.amount / n);
  const rows: TablesInsert<"receivables">[] = [];
  for (let i = 0; i < n; i += 1) {
    rows.push({
      description: input.description.trim(),
      amount: quota,
      due_date: addMonths(input.due_date, i),
      occurred_at: addMonths(input.occurred_at, i),
      category_id: input.category_id || null,
      bank_account_id: input.bank_account_id || null,
      customer_id: input.customer_id || null,
      truck_id: input.truck_id || null,
      payment_method: input.payment_method || null,
      is_urgent: input.is_urgent ?? false,
      notes: input.notes?.trim() || null,
      installment_number: i + 1,
      installment_total: input.amount,
      occurrence_number: i + 1,
      status: "aberto",
      created_by: userId ?? null,
    });
  }
  return rows;
}