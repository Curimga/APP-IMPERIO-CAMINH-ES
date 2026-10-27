import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type ExpenseApprovalStatus = "pending" | "returned" | "approved";
export type ExpenseApprovalTarget = "general_expense" | "truck_expense" | "payable";
export type ExpenseApprovalOrigin = "manual" | "service" | "inventory" | "daily";

export interface ExpenseApprovalRequest {
  id: string;
  target_type: ExpenseApprovalTarget;
  origin: ExpenseApprovalOrigin;
  status: ExpenseApprovalStatus;
  created_by: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  correction_note: string | null;
  proposed_category: string | null;
  final_category: string | null;
  amount: number;
  description: string;
  truck_id: string | null;
  service_id: string | null;
  stock_movement_id: string | null;
  occurred_at: string | null;
  due_date: string | null;
  supplier: string | null;
  urgent: boolean;
  bank: string | null;
  notes: string | null;
  payment_method: string | null;
  proposed_status: string | null;
  resulting_table: string | null;
  resulting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseApprovalEvent {
  id: string;
  request_id: string;
  event_type: "submitted" | "corrected" | "returned" | "resubmitted" | "approved" | "cancelled";
  actor_id: string;
  note: string | null;
  created_at: string;
}

export type ExpenseApprovalRequestWithEvents = ExpenseApprovalRequest & {
  expense_approval_events: ExpenseApprovalEvent[];
};

export interface ExpenseApprovalInput {
  target_type: ExpenseApprovalTarget;
  origin: ExpenseApprovalOrigin;
  proposed_category: string;
  amount: number;
  description: string;
  truck_id?: string | null;
  service_id?: string | null;
  stock_movement_id?: string | null;
  occurred_at?: string | null;
  due_date?: string | null;
  supplier?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  proposed_status?: string | null;
}

export interface DailyExpenseInput {
  supplier: string;
  amount: number;
  payment_method: string;
  description: string;
  urgent: boolean;
  bank?: string | null;
  occurred_at?: string | null;
  notes?: string | null;
}

export function useExpenseApprovalAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expense-approval-access", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_approval_access")
        .select("can_approve")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.can_approve === true;
    },
  });
}

export function useExpenseApprovalRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expense-approval-requests", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_approval_requests")
        .select("*, expense_approval_events(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ExpenseApprovalRequestWithEvents[];
    },
  });
}

export function useExpenseApprovalRequest(requestId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expense-approval-request", requestId, user?.id],
    enabled: Boolean(requestId && user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_approval_requests")
        .select("*, expense_approval_events(*)")
        .eq("id", requestId!)
        .maybeSingle();
      if (error) throw error;
      return data as ExpenseApprovalRequestWithEvents | null;
    },
  });
}

export async function submitExpenseConfirmation(input: ExpenseApprovalInput): Promise<string> {
  const { data, error } = await supabase.rpc("submit_expense_approval", {
    p_target_type: input.target_type,
    p_origin: input.origin,
    p_proposed_category: input.proposed_category,
    p_amount: input.amount,
    p_description: input.description,
    p_truck_id: input.truck_id ?? null,
    p_service_id: input.service_id ?? null,
    p_stock_movement_id: input.stock_movement_id ?? null,
    p_occurred_at: toDate(input.occurred_at),
    p_due_date: input.due_date || null,
    p_supplier: input.supplier ?? null,
    p_notes: input.notes ?? null,
    p_payment_method: input.payment_method ?? null,
    p_proposed_status: input.proposed_status ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function submitDailyExpense(input: DailyExpenseInput): Promise<string> {
  const { data, error } = await supabase.rpc("submit_daily_expense", {
    p_supplier: input.supplier,
    p_amount: input.amount,
    p_payment_method: input.payment_method,
    p_description: input.description,
    p_urgent: input.urgent,
    p_bank: input.bank ?? null,
    p_occurred_at: toDate(input.occurred_at),
    p_notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function approveExpenseConfirmation(requestId: string, finalCategory: string): Promise<string> {
  const { data, error } = await supabase.rpc("approve_expense_approval", {
    p_request_id: requestId,
    p_final_category: finalCategory,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function returnExpenseConfirmation(requestId: string, correctionNote: string): Promise<void> {
  const { error } = await supabase.rpc("return_expense_approval", {
    p_request_id: requestId,
    p_correction_note: correctionNote,
  });
  if (error) throw new Error(error.message);
}

export async function correctAndResubmitExpense(
  requestId: string,
  input: Pick<ExpenseApprovalInput, "proposed_category" | "amount" | "description">,
): Promise<void> {
  const { error } = await supabase.rpc("resubmit_expense_approval", {
    p_request_id: requestId,
    p_proposed_category: input.proposed_category,
    p_amount: input.amount,
    p_description: input.description,
  });
  if (error) throw new Error(error.message);
}

export async function countPendingApprovals(): Promise<number> {
  const { count, error } = await supabase
    .from("expense_approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return error ? 0 : count ?? 0;
}

function toDate(value?: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}
