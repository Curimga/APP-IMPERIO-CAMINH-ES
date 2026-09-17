import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TruckStatus } from "@/lib/truck-status";
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
  purchase_price?: number | null;
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
    .update(patch as TablesUpdate<"trucks">)
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

export interface ExpenseInput {
  truck_id: string;
  amount: number;
  description?: string | null;
  kind?: Enums<"expense_kind">;
  occurred_at?: string;
  supplier?: string | null;
}

export async function createTruckExpense(input: ExpenseInput): Promise<void> {
  const { error } = await supabase.from("truck_expenses").insert({
    ...input,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  toast.success("Despesa registrada");
}

export interface ServiceInput {
  truck_id: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  expected_at?: string | null;
  status?: Enums<"service_status">;
  value?: number | null;
}

export async function createService(input: ServiceInput): Promise<void> {
  const { error } = await supabase.from("services").insert({
    ...input,
    status: input.status ?? "em_andamento",
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  toast.success("Serviço criado");
}

export async function setServiceStatus(id: string, status: Enums<"service_status">): Promise<void> {
  const patch: TablesUpdate<"services"> = { status, updated_at: new Date().toISOString() };
  if (status === "concluido") patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from("services").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
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

export async function createEvent(input: EventInput): Promise<void> {
  const { error } = await supabase.from("calendar_events").insert({
    ...input,
    type: input.type ?? "compromisso",
    priority: input.priority ?? "media",
    owner_id: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  toast.success("Compromisso criado");
}

export async function updateEvent(id: string, patch: Partial<EventInput>): Promise<void> {
  const { error } = await supabase.from("calendar_events").update(patch).eq("id", id);
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
