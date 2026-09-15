import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/mobile/perm";

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
const TABLE_KEYS: Record<string, string[]> = {
  trucks: [
    "trucks",
    "truck",
    "stock",
    "stock-quick",
    "sold-trucks",
    "trucks-options",
    "trucks-mobile",
    "truck-mobile",
    "sold-trucks-mobile",
    "finance-mobile",
    "dashboard-snapshot",
    "capital-imobilizado",
    "calendar-events",
    "agenda",
    "agenda-mobile",
    "agenda-mobile-today",
    "agenda-range",
    "event-mobile",
    "dashboard-mobile",
  ],
  truck_photos: ["trucks-mobile", "truck-mobile", "sold-trucks-mobile", "trucks", "stock-quick"],
  truck_expenses: [
    "truck-mobile",
    "trucks-mobile",
    "sold-trucks-mobile",
    "finance-mobile",
    "dashboard-snapshot",
    "truck-expenses",
    "truck-expenses-sum",
  ],
  truck_purchase_installments: [
    "truck-mobile",
    "finance-mobile",
    "dashboard-snapshot",
    "sold-trucks-mobile",
  ],
  deals: ["deals", "dashboard-snapshot"],
  leads: ["leads", "dashboard-snapshot"],
  customers: [
    "customers",
    "customer",
    "customers_min",
    "customers-mini",
    "customers-mobile",
    "dashboard-snapshot",
  ],
  profiles: ["profiles", "profiles_min"],
  user_roles: ["user_roles", "roles"],
  payables: [
    "payables",
    "finance-mobile",
    "calendar-events",
    "agenda",
    "agenda-mobile",
    "agenda-mobile-today",
    "notifications",
    "notifications-bell",
    "notifications-mobile",
    "dashboard-snapshot",
  ],
  receivables: [
    "receivables",
    "finance-mobile",
    "agenda-mobile",
    "agenda-mobile-today",
    "notifications-mobile",
    "notifications",
    "notifications-bell",
    "dashboard-snapshot",
  ],
  bank_accounts: ["finance-mobile", "bank_accounts", "dashboard-snapshot"],
  bank_transactions: ["finance-mobile", "bank_transactions", "dashboard-snapshot"],
  commissions: ["finance-mobile", "commissions", "dashboard-snapshot"],
  goals: ["goals", "dashboard-snapshot"],
  calendar_events: [
    "calendar-events",
    "agenda",
    "agenda-mobile",
    "agenda-mobile-today",
    "notifications-mobile",
    "dashboard-snapshot",
    "dashboard-mobile",
  ],
  services: [
    "services",
    "service",
    "services-mobile",
    "truck-mobile",
    "trucks-mobile",
    "agenda-mobile",
    "agenda-mobile-today",
    "notifications-mobile",
    "dashboard-snapshot",
    "dashboard-mobile",
  ],
  suppliers: ["suppliers", "suppliers-options"],
  employees: ["employees"],
  notifications: ["notifications", "notifications-bell", "notifications-mobile"],
  financial_categories: ["financial_categories", "fin_cats", "finance-mobile"],
  general_expenses: [
    "general-expenses",
    "finance-mobile",
    "truck-expenses",
    "truck-expenses-sum",
    "dashboard-snapshot",
  ],
  inventory_items: [
    "inventory-mobile",
    "inventory-items",
    "inventory-item",
    "inventory-summary",
    "dashboard-snapshot",
  ],
};

const ALL_TABLES = Object.keys(TABLE_KEYS);

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
      const keys = TABLE_KEYS[table] ?? [];
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
