import type { TruckStatus } from "@/lib/truck-status";

/**
 * Regra pura de status do caminhão a partir de um serviço — FONTE ÚNICA.
 *
 * Mesma regra do CRM (`syncServiceSideEffects` em `service-automation.ts`):
 * categorias operacionais viram status de caminhão correspondente
 * (pintura→pintura, oficina→oficina, ...); demais categorias usam "oficina".
 */

const OPERATIONAL_CATEGORY_STATUS: Record<string, TruckStatus> = {
  pintura: "pintura",
  oficina: "oficina",
  despachante: "despachante",
  interna: "interna",
  patio: "patio",
};

/** Status operacional alvo do caminhão para um serviço ativo. */
export function serviceCategoryToTruckStatus(category?: string | null): TruckStatus {
  if (category && category in OPERATIONAL_CATEGORY_STATUS) {
    return OPERATIONAL_CATEGORY_STATUS[category];
  }
  return "oficina";
}

/** Status anterior do caminhão restaurado ao concluir/cancelar o serviço. */
export function restoreStatusAfterService(previous?: string | null): TruckStatus {
  return (previous as TruckStatus) ?? "disponivel";
}