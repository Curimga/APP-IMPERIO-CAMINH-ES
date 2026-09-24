import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TruckStatus } from "@/lib/truck-status";
import {
  restoreStatusAfterService,
  serviceCategoryToTruckStatus,
} from "@/lib/mobile/service-truck";
import { dateOnly, spaTodayISO, spaToUtcISO } from "@/lib/mobile/dates";
import { buildPayableRows, buildReceivableRows, type PaymentInput } from "@/lib/mobile/payment-rows";
import type { AppRole } from "@/hooks/use-auth";
import type { Enums, Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

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
  const { data, error } = await supabase
    .from("trucks")
    .insert({
      ...input,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error("Falha ao cadastrar caminhão: " + error.message);
  return data.id;
}

export async function updateTruck(id: string, patch: Partial<TruckInput>): Promise<void> {
  const { error } = await supabase
    .from("trucks")
    .update({ ...patch, updated_at: new Date().toISOString() } as TablesUpdate<"trucks">)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setTruckStatus(id: string, status: TruckStatus): Promise<void> {
  const changedAt = new Date().toISOString();
  const { error } = await supabase
    .from("trucks")
    .update({
      status,
      status_started_at: changedAt,
      updated_at: changedAt,
    })
    .eq("id", id);
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
  occurred_at?: string | null;
  due_date?: string | null;
}

/**
 * Despesa no padrão do CRM: grava em `general_expenses` vinculada ao caminhão.
 * O CRM alimenta `trucks.expenses_total` a partir desta tabela (ver bug das
 * despesas) — por isso a mesma ação é usada no lançamento de despesa do caminhão.
 */
export async function createGeneralExpense(input: GeneralExpenseInput): Promise<void> {
  const { error } = await supabase.from("general_expenses").insert({
    truck_id: input.truck_id ?? null,
    category: input.category || undefined,
    description: input.description?.trim() || input.category || "Despesa",
    notes: input.notes?.trim() || null,
    amount: input.amount,
    shared: false,
    imperio_amount: input.amount,
    payment_method: input.payment_method || null,
    status: input.status || null,
    supplier: input.supplier?.trim() || null,
    occurred_at: dateOnly(input.occurred_at) ?? spaTodayISO(),
    due_date: input.due_date || null,
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  toast.success("Despesa registrada");
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
  const { data, error } = await supabase
    .from("services")
    .insert({
      ...input,
      description: input.description?.trim() || null,
      expected_at: input.expected_at ? dateOnly(input.expected_at) : null,
      status: input.status ?? "em_andamento",
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Mesmo efeito colateral do CRM: serviço ativo → caminhão reflete o serviço.
  await syncServiceTruckState({
    serviceId: data.id,
    truckId: input.truck_id,
    category: input.category ?? null,
    previousTruckStatus: null,
    newStatus: input.status ?? "em_andamento",
  });
  toast.success("Serviço criado");
  return data.id;
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
    const { error } = await supabase
      .from("trucks")
      .update({ status: target, updated_at: changedAt })
      .eq("id", truckId);
    if (error) throw new Error(error.message);
    return;
  }

  const target = serviceCategoryToTruckStatus(category);
  let previous = previousTruckStatus;
  if (!previous) {
    const { data, error } = await supabase
      .from("trucks")
      .select("status")
      .eq("id", truckId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const current = data?.status;
    if (current && current !== target) previous = current;
    if (previous) {
      const { error: prevErr } = await supabase
        .from("services")
        .update({ truck_previous_status: previous })
        .eq("id", serviceId);
      if (prevErr) throw new Error(prevErr.message);
    }
  }
  const { error } = await supabase
    .from("trucks")
    .update({ status: target, updated_at: changedAt })
    .eq("id", truckId);
  if (error) throw new Error(error.message);
}

export async function setServiceStatus(id: string, status: Enums<"service_status">): Promise<void> {
  const { data: current, error: loadError } = await supabase
    .from("services")
    .select("id, truck_id, category, truck_previous_status, status")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);

  const patch: TablesUpdate<"services"> = { status, updated_at: new Date().toISOString() };
  if (status === "concluido") patch.completed_at = spaTodayISO();
  const { error } = await supabase.from("services").update(patch).eq("id", id);
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
      starts_at: spaToUtcISO(localDateTimeValue(cursor)),
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
  const rows = recurrenceEvents({ ...input, starts_at: spaToUtcISO(input.starts_at) }, ownerId);
  const { error } = await supabase.from("calendar_events").insert(rows);
  if (error) throw new Error(error.message);
  toast.success(rows.length > 1 ? `${rows.length} compromissos criados` : "Compromisso criado");
}

export async function updateEvent(id: string, patch: Partial<EventInput>): Promise<void> {
  const normalized = patch.starts_at
    ? { ...patch, starts_at: spaToUtcISO(patch.starts_at) }
    : patch;
  const { error } = await supabase.from("calendar_events").update(normalized).eq("id", id);
  if (error) throw new Error(error.message);
  toast.success("Compromisso atualizado");
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
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
  const payload: TablesInsert<"inventory_items"> = {
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
  const { data, error } = await supabase
    .from("inventory_items")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  toast.success("Item adicionado ao estoque");
  return data.id;
}

export interface SettleReceivableInput {
  id: string;
  received_at?: string;
}

/**
 * Guarda de segurança da mutação financeira (Executivo/admin).
 *
 * A UI já esconde o módulo para Financeiro/Secretaria, mas a mutation também
 * confere o cargo no banco antes de gravar — ninguém sem papel admin executa
 * lançamentos financeiros, mesmo chamando a função diretamente.
 */
async function assertFinanceExecutive(): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  const user = userData.user;
  if (!user) throw new Error("Sessão expirada. Entre novamente para continuar.");
  const { data: rolesData, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (rolesError) throw new Error(rolesError.message);
  const roles = ((rolesData ?? []) as { role: AppRole }[]).map((r) => r.role);
  if (!roles.includes("admin")) {
    throw new Error("Apenas o Executivo pode lançar ou quitar lançamentos financeiros.");
  }
}

/** Marca uma conta a receber como recebida (registro de recebimento). */
export async function settleReceivable(input: SettleReceivableInput): Promise<void> {
  await assertFinanceExecutive();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("receivables")
    .update({
      status: "recebido",
      received_at: dateOnly(input.received_at) ?? spaTodayISO(),
      updated_at: now,
    })
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
  await assertFinanceExecutive();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payables")
    .update({
      status: "pago",
      paid_at: dateOnly(input.paid_at) ?? spaTodayISO(),
      updated_at: now,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  toast.success("Pagamento registrado");
}

/** Desmarca um recebimento já registrado (volta a ficar em aberto). */
export async function reopenReceivable(id: string): Promise<void> {
  await assertFinanceExecutive();
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
  await assertFinanceExecutive();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payables")
    .update({ status: "aberto", paid_at: null, updated_at: now })
    .eq("id", id);
  if (error) throw new Error(error.message);
  toast.success("Lançamento reaberto");
}

/**
 * Cria conta(s) a pagar — mutação financeira exclusiva do Executivo.
 * `payables` é a MESMA tabela do CRM; as colunas `date` recebem apenas
 * "YYYY-MM-DD" e as linhas de parcela são montadas por `buildPayableRows`.
 */
export async function createPayable(input: PaymentInput): Promise<number> {
  await assertFinanceExecutive();
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const rows = buildPayableRows({ ...input, kind: "pagar" }, userId);
  const { error } = await supabase.from("payables").insert(rows);
  if (error) throw new Error(error.message);
  toast.success(rows.length > 1 ? `${rows.length} contas a pagar criadas` : "Conta a pagar criada");
  return rows.length;
}

/**
 * Cria conta(s) a receber — mutação financeira exclusiva do Executivo.
 * Mesmo contrato da tabela `receivables` do CRM (parcelas numeradas).
 */
export async function createReceivable(input: PaymentInput): Promise<number> {
  await assertFinanceExecutive();
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const rows = buildReceivableRows({ ...input, kind: "receber" }, userId);
  const { error } = await supabase.from("receivables").insert(rows);
  if (error) throw new Error(error.message);
  toast.success(rows.length > 1 ? `${rows.length} contas a receber criadas` : "Conta a receber criada");
  return rows.length;
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
  const { data: current, error: loadError } = await supabase
    .from("inventory_items")
    .select("quantity")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  const next = Math.max(0, Math.round(Number(current?.quantity ?? 0) + delta));
  const { error } = await supabase
    .from("inventory_items")
    .update({ quantity: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
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
  const { error } = await supabase
    .from("services")
    .update({ expected_at: dateOnly(expectedAt), updated_at: new Date().toISOString() })
    .eq("id", id);
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
