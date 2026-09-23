import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError, RealtimeChannel } from "@supabase/supabase-js";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/mobile/perm";
import {
  ALL_QUERY_KEYS,
  ALL_TABLE_KEYS,
  invalidateKeysFor,
} from "@/lib/mobile/realtime-map";
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
 * Perfis: as tabelas financeiras (contas a pagar/receber, bancos, comissões,
 * categorias financeiras, despesas gerais) são assinadas SOMENTE pelo Executivo
 * (admin). Financeiro e Secretaria não recebem/não assinam esses eventos —
 * mesmas regras de `perm.ts` e dos SELECTs de `queries.ts`.
 *
 * Resiliência de conexão: trata SUBSCRIBED (reconexão → invalida tudo uma vez
 * para reconciliar eventos perdidos), CHANNEL_ERROR e TIMED_OUT (remove o canal
 * e tenta reassinar após pequeno backoff). Em logout, libera canal e timers.
 */

/** Tabelas com dados financeiros/dinheiro — assinatura exclusiva do Executivo. */
export const FINANCIAL_TABLES: readonly (keyof RealtimeKeyMap)[] = [
  "payables",
  "receivables",
  "bank_accounts",
  "bank_transactions",
  "commissions",
  "financial_categories",
  "general_expenses",
];

/** Função pura: quais tabelas assinar para um perfil. Financeiras só p/ admin. */
export function realtimeTablesForRoles(roles: AppRole[]): (keyof RealtimeKeyMap)[] {
  const admin = isAdmin(roles);
  return ALL_TABLE_KEYS.filter((t) => admin || !FINANCIAL_TABLES.includes(t));
}

const RECONNECT_MS = 5_000;
const THROTTLE_MS = 250;

/** O RPC de geração de alertas não está nos tipos gerados; assinatura mínima tipada. */
type GeneratePayableAlertsRpc = (
  fn: "fn_generate_payable_alerts",
) => Promise<{ error: PostgrestError | null }>;

/**
 * Sincronização global em tempo real. Monte UMA vez no layout autenticado.
 *
 * - Multiplexa um único canal Realtime para as tabelas permitidas ao perfil.
 * - Throttle por tabela (250ms) evita storms de invalidação em imports em massa.
 * - Reassina em CHANNEL_ERROR/TIMED_OUT e invalida tudo ao reconectar.
 * - Roda o gerador de alertas financeiros a cada 5min (só Executivo).
 * - Em logout, remove o canal e cancela os timers pendentes.
 */
export function useRealtimeSync(extraKeys: string[] = []) {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const rolesRef = useRef(roles);
  rolesRef.current = roles;
  const extraKeysRef = useRef(extraKeys);
  extraKeysRef.current = extraKeys;

  // Re-assina quando o perfil muda (ex.: roles carregam após o login).
  const signature = `${realtimeTablesForRoles(roles).join("|")}|${extraKeys.join("|")}`;

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const tables = realtimeTablesForRoles(rolesRef.current);

    const invalidateAll = () => {
      ALL_QUERY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    };
    const invalidateTable = (table: string) => {
      invalidateKeysFor(table as keyof RealtimeKeyMap).forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      extraKeysRef.current.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    };

    // throttle por tabela: agrupa eventos próximos em uma única invalidação
    const pending = new Map<string, ReturnType<typeof setTimeout>>();
    const flush = (table: string) => {
      pending.delete(table);
      invalidateTable(table);
    };
    const schedule = (table: string) => {
      const existing = pending.get(table);
      if (existing) clearTimeout(existing);
      pending.set(table, setTimeout(() => flush(table), THROTTLE_MS));
    };

    let channel: RealtimeChannel | null = null;
    let everSubscribed = false;

    const teardownChannel = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const setupChannel = () => {
      if (disposed) return;
      const channelName = `global-realtime-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ch = supabase.channel(channelName);
      channel = ch;

      tables.forEach((table) => {
        ch.on("postgres_changes", { event: "*", schema: "public", table }, () =>
          schedule(table),
        );
      });

      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Reconexão (não o primeiro join): invalida tudo para reconciliar
          // eventos perdidos enquanto esteve fora.
          if (everSubscribed) invalidateAll();
          everSubscribed = true;
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            `[realtime] canal "${channelName}" em "${status}" — reassinando em ${RECONNECT_MS}ms`,
          );
          teardownChannel();
          if (!disposed) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              setupChannel();
            }, RECONNECT_MS);
          }
          return;
        }
        // CLOSED (removeChannel/limpeza) ou outros: sem ação.
      });
    };
    setupChannel();

    // Gera alertas financeiros (vencimentos ≤3 dias / atrasos) periodicamente.
    // Exclusivo do Executivo: financeiro/secretaria não devem receber avisos financeiros.
    const runAlerts = async () => {
      if (!isAdmin(rolesRef.current)) return;
      try {
        const generatePayableAlerts = supabase.rpc as unknown as GeneratePayableAlertsRpc;
        await generatePayableAlerts("fn_generate_payable_alerts");
        ["notifications", "notifications-bell", "notifications-mobile"].forEach((k) =>
          qc.invalidateQueries({ queryKey: [k] }),
        );
      } catch {
        /* ignore — função pode não existir em ambientes antigos */
      }
    };
    runAlerts();
    const alertsTimer = setInterval(runAlerts, 5 * 60 * 1000);

    // Logout: libera o canal e timers imediatamente
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") teardownChannel();
    });

    return () => {
      disposed = true;
      clearInterval(alertsTimer);
      authListener.subscription.unsubscribe();
      teardownChannel();
    };
  }, [qc, signature]);
}