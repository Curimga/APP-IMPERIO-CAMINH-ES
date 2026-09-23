import { useQueryClient } from "@tanstack/react-query";
import { invalidateKeysFor } from "@/lib/mobile/realtime-map";
import type { RealtimeKeyMap } from "@/lib/mobile/realtime-map";

export type MobileTable = keyof RealtimeKeyMap;

/**
 * Invalidação LOCAL imediata pós-mutation (além do evento Realtime emitido pelo
 * banco). Garante que a própria tela — e telas vizinhas ainda montadas —
 * reflitam a mudança mesmo se o canal Realtime estiver degradado.
 *
 * Usa o MESMO mapa (`realtime-map.ts`) do hub para não divergir.
 */
export function useInvalidateMobile() {
  const qc = useQueryClient();
  return (tables: MobileTable[]) => {
    for (const table of tables) {
      invalidateKeysFor(table).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    }
  };
}