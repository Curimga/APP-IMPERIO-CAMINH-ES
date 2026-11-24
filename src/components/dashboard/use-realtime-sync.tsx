import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError, RealtimeChannel } from "@supabase/supabase-js";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { canAccessBanking, isFinanceExecutive } from "@/lib/mobile/perm";
import { ALL_REALTIME_TABLES } from "@/lib/mobile/realtime-map";

export const FINANCIAL_TABLES: readonly string[] = [
  "payables",
  "receivables",
  "bank_accounts",
  "bank_transactions",
  "commissions",
  "financial_categories",
  "general_expenses",
  "inventory_movements",
  "financial_attachments",
  "general_expense_closings",
  "inventory_expenses",
  "truck_purchase_installments",
  "sale_formalizations",
  "sale_formalization_events",
  "sale_formalization_logs",
  "sale_signatures",
  "company_vehicles",
  "company_vehicle_maintenances",
  "financial_event_kinds",
  "inventory_truck_usage",
  "receivable_bank_splits",
  "recurrences",
  "stock_purchases",
];

const BANKING_TABLES = ["bank_accounts", "bank_transactions", "financial_categories"] as const;

/** Tabelas que cada perfil pode observar; a leitura continua sob RLS no Supabase. */
export function realtimeTablesForRoles(roles: AppRole[], email?: string | null, userId?: string | null): string[] {
  const canAccessFinance = isFinanceExecutive(roles, email);
  const canAccessBankTables = canAccessBanking(roles, email, userId);
  return ALL_REALTIME_TABLES.filter(
    (table) =>
      canAccessFinance ||
      !FINANCIAL_TABLES.includes(table) ||
      (canAccessBankTables && BANKING_TABLES.includes(table as (typeof BANKING_TABLES)[number])),
  );
}

const INITIAL_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;
const INVALIDATE_DEBOUNCE_MS = 250;

type GeneratePayableAlertsRpc = (
  fn: "fn_generate_payable_alerts",
) => Promise<{ error: PostgrestError | null }>;

/**
 * Um canal global cobre as tabelas publicadas do mesmo Supabase usado pelo CRM.
 * O callback não usa o conteúdo do evento: apenas invalida consultas; toda leitura
 * posterior continua autenticada e protegida pelas políticas RLS do banco.
 */
export function useRealtimeSync(extraKeys: string[] = []) {
  const qc = useQueryClient();
  const { roles, user } = useAuth();
  const rolesRef = useRef(roles);
  const emailRef = useRef(user?.email ?? null);
  const userIdRef = useRef(user?.id ?? null);
  rolesRef.current = roles;
  emailRef.current = user?.email ?? null;
  userIdRef.current = user?.id ?? null;

  const tables = realtimeTablesForRoles(roles, user?.email, user?.id);
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const signature = `${tables.join("|")}|${extraKeys.join("|")}`;

  useEffect(() => {
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = INITIAL_RETRY_MS;

    const invalidateAll = () => {
      if (disposed) return;
      void qc.invalidateQueries({ refetchType: "active" });
    };

    const scheduleInvalidate = () => {
      if (invalidateTimer || disposed) return;
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        invalidateAll();
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const clearTimers = () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (invalidateTimer) clearTimeout(invalidateTimer);
      retryTimer = null;
      invalidateTimer = null;
    };

    const teardownChannel = () => {
      clearTimers();
      if (channel) {
        const current = channel;
        channel = null;
        void supabase.removeChannel(current);
      }
    };

    const scheduleRetry = () => {
      if (disposed || retryTimer) return;
      const delay = retryDelay;
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        setupChannel();
      }, delay);
    };

    const setupChannel = () => {
      if (disposed || channel) return;
      const name = `global-realtime-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const next = supabase.channel(name);
      channel = next;

      tablesRef.current.forEach((table) => {
        next.on("postgres_changes", { event: "*", schema: "public", table }, scheduleInvalidate);
      });

      next.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          retryDelay = INITIAL_RETRY_MS;
          invalidateAll(); // reconcilia também a janela entre login e inscrição
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (channel === next) {
            channel = null;
            void supabase.removeChannel(next);
            scheduleRetry();
          }
        }
      });
    };

    setupChannel();

    const reconcile = () => {
      if (!disposed && navigator.onLine && document.visibilityState === "visible") invalidateAll();
    };
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") teardownChannel();
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") setupChannel();
    });

    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcile);

    // Vencimentos seguem o gerador existente do CRM, somente para Executivo.
    const runAlerts = async () => {
      if (!isFinanceExecutive(rolesRef.current, emailRef.current)) return;
      try {
        const generatePayableAlerts = supabase.rpc as unknown as GeneratePayableAlertsRpc;
        await generatePayableAlerts("fn_generate_payable_alerts");
        void qc.invalidateQueries({ queryKey: ["notifications"] });
        void qc.invalidateQueries({ queryKey: ["notifications-bell"] });
        void qc.invalidateQueries({ queryKey: ["notifications-mobile"] });
      } catch {
        /* A função pode não existir em ambientes antigos. */
      }
    };
    void runAlerts();
    const alertsTimer = setInterval(() => void runAlerts(), 5 * 60 * 1000);

    return () => {
      disposed = true;
      clearInterval(alertsTimer);
      authListener.subscription.unsubscribe();
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
      teardownChannel();
    };
  }, [qc, signature]);
}
