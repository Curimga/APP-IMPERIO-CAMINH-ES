import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/mobile/perm";
import { ALL_TABLE_KEYS, invalidateKeysFor } from "@/lib/mobile/realtime-map";
import type { RealtimeKeyMap } from "@/lib/mobile/realtime-map";

/**
 * Sincronização em tempo real (PWA Império Caminhões).
 *
 * Invalidação SELETIVA: cada tabela mapeada aqui para os queryKeys (prefixos)
 * dos quais o app depende. Um INSERT/UPDATE/DELETE dispara apenas as chaves da
 * tabela correspondente — nunca uma invalidação global.
 * `invalidateQueries` faz match por prefixo de elementos, então listar a raiz
 * cobre as variantes (`["agenda-mobile"]` cobre `["agenda-mobile-today"]`).
 *
 * Apenas as tabelas existentes no banco deste app são registradas aqui, para
 * que o canal realtime não assine tabelas inexistentes.
 */

const ALL_TABLES = ALL_TABLE_KEYS;

/** O RPC de geração de alertas não está nos tipos gerados; assinatura mínima tipada. */
type GeneratePayableAlertsRpc = (
  fn: "fn_generate_payable_alerts",
) => Promise<{ error: PostgrestError | null }>;

/**
 * Sincronização global em tempo real. Monte UMA vez no layout autenticado.
 *
 * - Multiplexa um único canal Realtime para todas as tabelas relevantes.
 * - Throttle por tabela (250ms) evita storms de invalidação em imports em massa.
 * - Roda o gerador de alertas financeiros a cada 5min.
 * - Em logout, remove o canal e cancela os timers pendentes.
 */
export function useRealtimeSync(extraKeys: string[] = []) {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const rolesRef = useRef(roles);
  rolesRef.current = roles;
  const extraKeysRef = useRef(extraKeys);
  extraKeysRef.current = extraKeys;
  useEffect(() => {
    const channelName = `global-realtime-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);

    // throttle por tabela: agrupa eventos próximos em uma única invalidação
    const pending = new Map<string, ReturnType<typeof setTimeout>>();
    const flush = (table: string) => {
      pending.delete(table);
      const keys = invalidateKeysFor(table as keyof RealtimeKeyMap);
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      extraKeysRef.current.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    };
    const schedule = (table: string) => {
      const existing = pending.get(table);
      if (existing) clearTimeout(existing);
      pending.set(
        table,
        setTimeout(() => flush(table), 250),
      );
    };
    const cleanupChannel = () => {
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
      supabase.removeChannel(channel);
    };

    ALL_TABLES.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () =>
        schedule(table),
      );
    });
    channel.subscribe();

    // Gera alertas financeiros (vencimentos ≤3 dias / atrasos) periodicamente.
    // Exclusivo do Executivo: financeiro/secretaria não devem receber avisos financeiros.
    const runAlerts = async () => {
      if (!isAdmin(rolesRef.current)) return;
      try {
        const generatePayableAlerts = supabase.rpc as unknown as GeneratePayableAlertsRpc;
        await generatePayableAlerts("fn_generate_payable_alerts");
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["notifications-bell"] });
        qc.invalidateQueries({ queryKey: ["notifications-mobile"] });
      } catch {
        /* ignore — função pode não existir em ambientes antigos */
      }
    };
    runAlerts();
    const alertsTimer = setInterval(runAlerts, 5 * 60 * 1000);

    // Logout: libera o canal e timers imediatamente
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") cleanupChannel();
    });

    return () => {
      clearInterval(alertsTimer);
      authListener.subscription.unsubscribe();
      cleanupChannel();
    };
  }, [qc]);
}
