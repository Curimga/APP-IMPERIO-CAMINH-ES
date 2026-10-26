import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TruckStatus } from "@/lib/truck-status";
import { todayISO } from "@/lib/format";
import {
  restoreStatusAfterService,
  serviceCategoryToTruckStatus,
} from "@/lib/mobile/service-truck";
import type { Enums, Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { submitExpenseConfirmation } from "@/lib/mobile/expense-approval";

/**
 * Mutações do aplicativo mobile. Todas escrevem nas mesmas tabelas do CRM —
 * a sincronização com o CRM acontece pelo Realtime existente.
 */

export interface TruckInput {
  brand: string;
  model: string;
  year?: number | null;
  plate?: string | null;
  color?: string | null;
  chassis?: string | null;
  mileage?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  renavam?: string | null;
  origin?: string | null;
  supplier?: string | null;
  consigned?: boolean;
  purchase_date?: string | null;
  purchase_price?: number | null;
  purchase_payment_method?: string | null;
  purchase_installments_count?: number | null;
  purchase_total_paid?: number | null;
  purchase_total_pending?: number | null;
  expected_price?: number | null;
  description?: string | null;
  status?: TruckStatus;
}

export async function createTruck(input: TruckInput): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("trucks").insert({
    id,
    ...input,
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) throw new Error("Falha ao cadastrar caminhão: " + error.message);
  return id;
}

export async function updateTruck(id: string, patch: Partial<TruckInput>): Promise<void> {
  const { error } = await supabase
    .from("trucks")
    .update({ ...patch, updated_at: new Date().toISOString() } as TablesUpdate<"trucks">)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateTruckOperational(id: string, patch: Partial<TruckInput>): Promise<void> {
  const { error } = await supabase.rpc("update_truck_operational", {
    p_id: id,
    p_patch: patch as Json,
  });
  if (error) throw new Error(error.message);
}

export async function setTruckStatus(id: string, status: TruckStatus): Promise<void> {
  const changedAt = new Date().toISOString();
  const { error } = await supabase.rpc("update_truck_operational", {
    p_id: id,
    p_patch: {
      status,
      status_started_at: changedAt,
    },
  });
  if (error) throw new Error(error.message);
  toast.success("Status atualizado");
}

export interface GeneralExpenseInput {
  truck_id?: string | null;
  category?: string | null;
  description?: string | null;
  notes?: string | null;
  amount: number;
  payment_method?: string | null;
  status?: string | null;
  supplier?: string | null;
  occurred_at?: string;
  due_date?: string | null;
}

/**
 * Despesa no padrão do CRM: cria uma solicitação de confirmação.
 * A despesa só é lançada oficialmente após aprovação por um usuário autorizado.
 */
export async function createGeneralExpense(input: GeneralExpenseInput): Promise<void> {
  await submitExpenseConfirmation({
    target_type: "general_expense",
    origin: "manual",
    proposed_category: input.category ?? "outros",
    amount: input.amount,
    description: input.description?.trim() || input.category || "Despesa",
    truck_id: input.truck_id ?? null,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    due_date: input.due_date || null,
    supplier: input.supplier?.trim() || null,
    notes: input.notes?.trim() || null,
    payment_method: input.payment_method || null,
    proposed_status: input.status || null,
  });
  toast.success("Despesa enviada para confirmação");
}

export interface ServiceInput {
  truck_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  supplier_id?: string | null;
  notes?: string | null;
  expected_at?: string | null;
  status?: Enums<"service_status">;
  value?: number | null;
  total_value?: number | null;
  down_payment?: number | null;
}

export async function createService(input: ServiceInput): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("services").insert({
    id,
    ...input,
    description: input.description?.trim() || null,
    status: input.status ?? "em_andamento",
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  // Mesmo efeito colateral do CRM: serviço ativo → caminhão reflete o serviço.
  await syncServiceTruckState({
    serviceId: id,
    truckId: input.truck_id,
    category: input.category ?? null,
    previousTruckStatus: null,
    newStatus: input.status ?? "em_andamento",
  });
  toast.success("Serviço criado");
  return id;
}

export interface ServiceTruckSyncInput {
  serviceId: string;
  truckId?: string | null;
  category?: string | null;
  previousTruckStatus?: string | null;
  newStatus: Enums<"service_status">;
}

/**
 * Sincroniza o status do caminhão com o estado do serviço — mesma regra do CRM
 * (`syncServiceSideEffects`/`completeService`):
 *  - ativo (em_andamento/pendente): salva o status anterior do caminhão (1ª vez)
 *    e move o caminhão para o status da categoria do serviço (padrão "oficina");
 *  - concluído: restaura o status anterior (ou "disponivel").
 */
export async function syncServiceTruckState(input: ServiceTruckSyncInput): Promise<void> {
  const { serviceId, truckId, category, previousTruckStatus, newStatus } = input;
  if (!truckId || newStatus === "cancelado") return;
  const changedAt = new Date().toISOString();

  if (newStatus === "concluido") {
    const target = restoreStatusAfterService(previousTruckStatus);
    const { error } = await supabase.rpc("update_truck_operational", {
      p_id: truckId,
      p_patch: { status: target, status_started_at: changedAt },
    });
    if (error) throw new Error(error.message);
    return;
  }

  const target = serviceCategoryToTruckStatus(category);
  let previous = previousTruckStatus;
  if (!previous) {
    const { data, error } = await supabase
      .from("trucks_operational")
      .select("status")
      .eq("id", truckId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const current = data?.status;
    if (current && current !== target) previous = current;
    if (previous) {
      const { error: prevErr } = await supabase.rpc("update_service_operational", {
        p_id: serviceId,
        p_patch: { truck_previous_status: previous },
      });
      if (prevErr) throw new Error(prevErr.message);
    }
  }
  const { error } = await supabase.rpc("update_truck_operational", {
    p_id: truckId,
    p_patch: { status: target, status_started_at: changedAt },
  });
  if (error) throw new Error(error.message);
}

export async function setServiceStatus(id: string, status: Enums<"service_status">): Promise<void> {
  const { data: current, error: loadError } = await supabase
    .from("services_operational")
    .select("id, truck_id, category, truck_previous_status, status")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "concluido") patch.completed_at = new Date().toISOString();
  const { error } = await supabase.rpc("update_service_operational", {
    p_id: id,
    p_patch: patch as Json,
  });
  if (error) throw new Error(error.message);

  await syncServiceTruckState({
    serviceId: id,
    truckId: current?.truck_id ?? null,
    category: current?.category ?? null,
    previousTruckStatus: current?.truck_previous_status ?? null,
    newStatus: status,
  });
  toast.success("Serviço atualizado");
}

export interface EventInput {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  type?: Enums<"event_type">;
  priority?: Enums<"deal_priority">;
  related_truck_id?: string | null;
  amount?: number | null;
  recurrence?: string | null;
  reminder_minutes?: number | null;
}

function addRecurrenceStep(date: Date, recurrence: string): Date {
  const next = new Date(date);
  if (recurrence === "diario") next.setDate(next.getDate() + 1);
  else if (recurrence === "semanal") next.setDate(next.getDate() + 7);
  else if (recurrence === "mensal") next.setMonth(next.getMonth() + 1);
  return next;
}

function localDateTimeValue(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

function recurrenceEvents(input: EventInput, ownerId: string | null): TablesInsert<"calendar_events">[] {
  const recurrence = input.recurrence;
  if (!recurrence || !["diario", "semanal", "mensal"].includes(recurrence)) {
    return [{ ...input, type: input.type ?? "compromisso", priority: input.priority ?? "media", owner_id: ownerId }];
  }

  const first = new Date(input.starts_at);
  if (Number.isNaN(first.getTime())) {
    return [{ ...input, type: input.type ?? "compromisso", priority: input.priority ?? "media", owner_id: ownerId }];
  }

  const until = new Date(first);
  until.setMonth(until.getMonth() + 3);

  const rows: TablesInsert<"calendar_events">[] = [];
  let cursor = new Date(first);
  while (cursor <= until && rows.length < 120) {
    rows.push({
      ...input,
      starts_at: localDateTimeValue(cursor),
      type: input.type ?? "compromisso",
      priority: input.priority ?? "media",
      owner_id: ownerId,
    });
    cursor = addRecurrenceStep(cursor, recurrence);
  }
  return rows;
}

export async function createEvent(input: EventInput): Promise<void> {
  const ownerId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const rows = recurrenceEvents(input, ownerId);
  const { error } = await supabase.from("calendar_events").insert(rows);
  if (error) throw new Error(error.message);
  toast.success(rows.length > 1 ? `${rows.length} compromissos criados` : "Compromisso criado");
}

export async function updateEvent(
  id: string,
  patch: Partial<EventInput>,
  operationalOnly = false,
): Promise<void> {
  const { error } = operationalOnly
    ? await supabase.rpc("update_calendar_event_operational", {
        p_id: id,
        p_patch: patch as Json,
      })
    : await supabase.from("calendar_events").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  toast.success("Compromisso atualizado");
}

export async function deleteEvent(id: string, operationalOnly = false): Promise<void> {
  const { error } = operationalOnly
    ? await supabase.rpc("delete_calendar_event_operational", { p_id: id })
    : await supabase.from("calendar_events").delete().eq("id", id);
  if (error)
    throw new Error(
      /permission|policy|row-level/i.test(error.message)
        ? "Exclusão permitida apenas para administradores."
        : error.message,
    );
  toast.success("Compromisso excluído");
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  document?: string | null;
  notes?: string | null;
}

export async function createCustomer(input: CustomerInput): Promise<string> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      ...input,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  toast.success("Cliente cadastrado");
  return data.id;
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
  if (error) throw new Error(error.message);
}

export interface InventoryItemInput {
  name: string;
  category?: string | null;
  quantity?: number | null;
  min_quantity?: number | null;
  unit_price?: number | null;
  unit?: string | null;
  storage_location?: string | null;
  supplier_name?: string | null;
}

export async function createInventoryItem(input: InventoryItemInput): Promise<string> {
  const id = crypto.randomUUID();
  const payload: TablesInsert<"inventory_items"> = {
    id,
    name: input.name,
    category: input.category ?? undefined,
    quantity: input.quantity ?? 0,
    min_quantity: input.min_quantity ?? 0,
    unit_price: input.unit_price ?? 0,
    unit: input.unit ?? "un",
    storage_location: input.storage_location ?? null,
    supplier_name: input.supplier_name ?? null,
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  };
  const { error } = await supabase.from("inventory_items").insert(payload);
  if (error) throw new Error(error.message);
  toast.success("Item adicionado ao estoque");
  return id;
}

export interface SettleReceivableInput {
  id: string;
  received_at?: string;
}

/** Marca uma conta a receber como recebida (registro de recebimento). */
export async function settleReceivable(input: SettleReceivableInput): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("receivables")
    .update({ status: "recebido", received_at: input.received_at ?? now, updated_at: now })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  toast.success("Recebimento registrado");
}

export interface SettlePayableInput {
  id: string;
  paid_at?: string;
}

/** Marca uma conta a pagar como paga (registro de pagamento). */
export async function settlePayable(input: SettlePayableInput): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payables")
    .update({ status: "pago", paid_at: input.paid_at ?? now, updated_at: now })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  toast.success("Pagamento registrado");
}

/** Desmarca um recebimento já registrado (volta a ficar em aberto). */
export async function reopenReceivable(id: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("receivables")
    .update({ status: "aberto", received_at: null, updated_at: now })
    .eq("id", id);
  if (error) throw new Error(error.message);
  toast.success("Lançamento reaberto");
}

/** Desmarca um pagamento já registrado (volta a ficar em aberto). */
export async function reopenPayable(id: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payables")
    .update({ status: "aberto", paid_at: null, updated_at: now })
    .eq("id", id);
  if (error) throw new Error(error.message);
  toast.success("Lançamento reaberto");
}

export interface PaymentInput {
  kind: "pagar" | "receber";
  description: string;
  amount: number;
  due_date: string;
  supplier?: string | null;
  customer_id?: string | null;
  truck_id?: string | null;
  installment_number?: number | null;
  installment_total?: number | null;
  payment_method?: Enums<"payment_method"> | null;
  notes?: string | null;
  /** Data de ocorrência (YYYY-MM-DD). Padrão: hoje. Sem isso o lançamento nunca
   * entra nos relatórios mensais/semanais, que filtram por `occurred_at`. */
  occurred_at?: string | null;
}

/**
 * Cria um lançamento financeiro nas tabelas reais do CRM.
 *
 * - "pagar"  → `payables`   (conta a pagar, status `aberto`)
 * - "receber" → `receivables` (conta a receber, status `aberto`)
 *
 * O CRM (módulo Financeiro / aba Pagamentos) lê dessas mesmas tabelas, então o
 * lançamento aparece imediatamente após a confirmação do INSERT.
 */
export async function createPayment(input: PaymentInput): Promise<string> {
  const id = crypto.randomUUID();
  const authUser = (await supabase.auth.getUser()).data.user;
  const occurredAt = input.occurred_at?.trim() || todayISO();

  if (input.kind === "pagar") {
    const requestId = await submitExpenseConfirmation({
      target_type: "payable",
      origin: "manual",
      proposed_category: "outros",
      amount: input.amount,
      description: input.description.trim(),
      truck_id: input.truck_id ?? null,
      occurred_at: occurredAt,
      due_date: input.due_date,
      supplier: input.supplier?.trim() || null,
      notes: input.notes?.trim() || null,
      payment_method: input.payment_method ?? null,
    });
    toast.success("Pagamento enviado para confirmação");
    return requestId;
  }

  const { error } = await supabase
    .from("receivables")
    .insert({
      id,
      description: input.description.trim(),
      amount: input.amount,
      due_date: input.due_date,
      customer_id: input.customer_id ?? null,
      truck_id: input.truck_id ?? null,
      notes: input.notes?.trim() || null,
      installment_number: input.installment_number ?? null,
      installment_total: input.installment_total ?? null,
      status: "aberto",
      occurred_at: occurredAt,
      created_by: authUser?.id ?? null,
    });
  if (error) throw new Error(error.message);
  return id;
}

export interface SetExpensePaidInput {
  id: string;
  source: "truck" | "geral";
  paid: boolean;
}

/**
 * Marca/desmarca uma despesa como paga. `truck_expenses` não tem `updated_at`;
 * `general_expenses` tem. O status "pago" alimenta o resumo da aba Despesas.
 */
export async function setExpensePaid(input: SetExpensePaidInput): Promise<void> {
  const status = input.paid ? "pago" : null;
  if (input.source === "truck") {
    const { error } = await supabase
      .from("truck_expenses")
      .update({ status })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("general_expenses")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  }
  toast.success(input.paid ? "Despesa marcada como paga" : "Despesa marcada como pendente");
}

export async function adjustInventoryQuantity(id: string, delta: number): Promise<number> {
  if (!Number.isFinite(delta) || delta === 0) throw new Error("Ajuste inválido.");
  const { data, error } = await supabase.rpc("adjust_inventory_quantity", {
    p_id: id,
    p_delta: delta,
  });
  if (error) throw new Error(error.message);
  const next = Number(data ?? 0);
  toast.success(delta > 0 ? "Entrada registrada no estoque" : "Saída registrada do estoque");
  return next;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error)
    throw new Error(
      /permission|policy|row-level/i.test(error.message)
        ? "Exclusão permitida apenas para administradores."
        : error.message,
    );
  toast.success("Item removido do estoque");
}

export interface CustomerUpdate {
  name?: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  document?: string | null;
  notes?: string | null;
  status?: Enums<"customer_status">;
}

export async function updateCustomer(id: string, patch: CustomerUpdate): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  toast.success("Cliente atualizado");
}

export async function updateServiceDeadline(
  id: string,
  expectedAt: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("update_service_operational", {
    p_id: id,
    p_patch: { expected_at: expectedAt } as Json,
  });
  if (error) throw new Error(error.message);
  toast.success("Prazo do serviço atualizado");
}

/** Registra uma mutação no audit_logs quando disponível. */
export async function audit(
  tableName: string,
  action: "insert" | "update" | "delete",
  recordId?: string | null,
  diff?: unknown,
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      table_name: tableName,
      action,
      record_id: recordId ?? null,
      user_id: data.user?.id ?? null,
      diff: (diff ?? null) as Json,
    });
  } catch {
    /* audit é best-effort */
  }
}
