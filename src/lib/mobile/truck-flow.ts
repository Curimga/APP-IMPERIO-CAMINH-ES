import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const TRUCK_FLOW_STEPS = [
  { key: "vistoria_despachante", label: "Vistoria despachante", order: 1, description: "Conferência inicial com o despachante.", descriptionRequired: false },
  { key: "vistoria_josemar", label: "Vistoria Josemar", order: 2, description: "Avaliação e validação do veículo.", descriptionRequired: false },
  { key: "orcamento_estetica_interna", label: "Orçamento de estética interna", order: 3, description: "Levantar orçamento e prazo da estética interna.", descriptionRequired: true },
  { key: "orcamento_estetica_externa", label: "Orçamento de estética externa", order: 4, description: "Levantar orçamento e prazo da estética externa.", descriptionRequired: true },
  { key: "pecas_diana", label: "Solicitação de peças Diana", order: 5, description: "Registrar as peças necessárias para o veículo.", descriptionRequired: true },
  { key: "virada_documento", label: "Virada de documento", order: 6, description: "Realizar a virada e conferência documental.", descriptionRequired: false },
  { key: "nf_entrada", label: "Emissão de nota fiscal de entrada", order: 7, description: "Emitir e anexar a nota fiscal de entrada.", descriptionRequired: false },
  { key: "lavagem_anuncio", label: "Lavagem para fotos e anúncio", order: 8, description: "Preparar o veículo para fotos e publicação.", descriptionRequired: false },
  { key: "venda_nf_saida", label: "Venda e emissão de nota fiscal de saída", order: 9, description: "Concluir a venda e emitir a nota fiscal de saída.", descriptionRequired: false },
] as const;

export type TruckFlowStepKey = (typeof TRUCK_FLOW_STEPS)[number]["key"];
export type TruckFlowAccessLevel = "editor" | "viewer";

export interface TruckFlowAccess {
  user_id: string;
  access_level: TruckFlowAccessLevel;
}

export interface TruckFlowEvidence {
  id: string;
  flow_step_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface TruckFlowStep {
  id: string;
  flow_id: string;
  step_key: TruckFlowStepKey;
  display_order: number;
  status: "pending" | "completed";
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  evidence: TruckFlowEvidence[];
}

export interface TruckFlowEvent {
  id: string;
  flow_id: string;
  step_id: string | null;
  event_type: "created" | "step_completed" | "step_reopened" | "flow_completed" | "flow_reopened" | "evidence_added" | "evidence_removed";
  reason: string | null;
  actor_id: string;
  created_at: string;
}

export interface TruckSummary {
  id: string;
  brand: string;
  model: string;
  plate: string | null;
  year: number | null;
  color: string | null;
  status: string;
}

export interface TruckFlow {
  id: string;
  truck_id: string;
  status: "in_progress" | "completed";
  started_at: string;
  started_by: string;
  completed_at: string | null;
  completed_by: string | null;
  updated_at: string;
  truck: TruckSummary | null;
  steps: TruckFlowStep[];
  events: TruckFlowEvent[];
}

export function useTruckFlowAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["truck-flow-access", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("truck_flow_access")
        .select("user_id, access_level")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as TruckFlowAccess | null;
    },
  });
}

export function useTruckFlows() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["truck-flows", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: flowRows, error } = await supabase
        .from("truck_flows")
        .select("*, steps:truck_flow_steps(id, flow_id, step_key, display_order, status, completed_at, completed_by, notes)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const truckIds = (flowRows ?? []).map((flow) => flow.truck_id);
      const { data: trucks, error: truckError } = truckIds.length
        ? await supabase.from("trucks_operational").select("id, brand, model, plate, year, color, status").in("id", truckIds)
        : { data: [], error: null };
      if (truckError) throw truckError;
      const trucksById = new Map((trucks ?? []).map((truck) => [truck.id, truck as TruckSummary]));
      return (flowRows ?? []).map((flow) => ({
        ...flow,
        truck: trucksById.get(flow.truck_id) ?? null,
        events: [],
        steps: flow.steps.map((step) => ({ ...step, evidence: [] })),
      })) as TruckFlow[];
    },
  });
}

export function useTruckFlow(truckId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["truck-flow", truckId, user?.id],
    enabled: Boolean(truckId && user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("truck_flows")
        .select("*, steps:truck_flow_steps(*, evidence:truck_flow_evidence(*)), events:truck_flow_events(*)")
        .eq("truck_id", truckId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: truck, error: truckError } = await supabase
        .from("trucks_operational")
        .select("id, brand, model, plate, year, color, status")
        .eq("id", truckId!)
        .maybeSingle();
      if (truckError) throw truckError;
      return {
        ...data,
        truck: truck as TruckSummary | null,
        steps: [...data.steps].sort((a, b) => a.display_order - b.display_order),
        events: [...data.events].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      } as TruckFlow;
    },
  });
}

export function useAvailableTrucksForFlow() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["truck-flow-available-trucks", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [{ data: flows, error: flowError }, { data: trucks, error: truckError }] = await Promise.all([
        supabase.from("truck_flows").select("truck_id"),
        supabase.from("trucks_operational").select("id, brand, model, plate, year, color, status").order("created_at", { ascending: false }),
      ]);
      if (flowError) throw flowError;
      if (truckError) throw truckError;
      const used = new Set((flows ?? []).map((flow) => flow.truck_id));
      return (trucks ?? []).filter((truck) => !used.has(truck.id)) as TruckSummary[];
    },
  });
}

export async function createTruckFlow(truckId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_truck_flow", { p_truck_id: truckId });
  if (error) throw new Error(error.message);
  return data;
}

export async function completeTruckFlowStep(flowId: string, stepKey: TruckFlowStepKey, notes?: string): Promise<void> {
  const { error } = await supabase.rpc("complete_truck_flow_step", {
    p_flow_id: flowId,
    p_step_key: stepKey,
    p_notes: notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function reopenTruckFlowStep(flowId: string, stepKey: TruckFlowStepKey, reason: string): Promise<void> {
  const { error } = await supabase.rpc("reopen_truck_flow_step", {
    p_flow_id: flowId,
    p_step_key: stepKey,
    p_reason: reason.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function uploadTruckFlowEvidence(flowStepId: string, file: File): Promise<void> {
  if (!file.type.match(/^(image\/(jpeg|png|webp)|application\/pdf)$/)) {
    throw new Error("Envie uma imagem JPG, PNG, WEBP ou um PDF.");
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 10 MB.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storagePath = `${flowStepId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("truck-flow-evidence")
    .upload(storagePath, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.rpc("add_truck_flow_evidence", {
    p_flow_step_id: flowStepId,
    p_storage_path: storagePath,
    p_file_name: file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size,
  });
  if (error) {
    await supabase.storage.from("truck-flow-evidence").remove([storagePath]);
    throw new Error(error.message);
  }
}

export async function removeTruckFlowEvidence(evidence: Pick<TruckFlowEvidence, "id" | "storage_path">): Promise<void> {
  const { error: storageError } = await supabase.storage.from("truck-flow-evidence").remove([evidence.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.rpc("remove_truck_flow_evidence", { p_evidence_id: evidence.id });
  if (error) throw new Error(error.message);
}

export async function getTruckFlowEvidenceUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("truck-flow-evidence").createSignedUrl(storagePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function truckFlowStepDefinition(stepKey: string) {
  return TRUCK_FLOW_STEPS.find((step) => step.key === stepKey);
}

export function isTruckFlowDetailPath(pathname: string) {
  return /^\/fluxo-caminhao\/[^/]+$/.test(pathname);
}
