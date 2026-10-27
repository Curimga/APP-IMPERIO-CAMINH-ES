/**
 * Mapa Realtime do APP — FONTE ÚNICA de invalidação de queries.
 *
 * Extraído de `src/components/dashboard/use-realtime-sync.tsx` (que agora
 * importa daqui) para que o hub e os testes consumam EXATAMENTE o mesmo mapa.
 * Módulo 100% puro: sem JSX, sem hooks, sem cache — teste direto sem eco.
 *
 * Regra de negócio (igual ao CRM): uma mutation em `table` invalida todos os
 * queryKeys listados. `ALL_TABLE_KEYS` é a união ordenada (sem chaves vazias),
 * usada pelo hub para assinar cada tabela do realtime.
 */

export interface RealtimeKeyMap {
  trucks: string[];
  truck_photos: string[];
  truck_status_history: string[];
  truck_notes: string[];
  truck_documents: string[];
  truck_expenses: string[];
  truck_purchase_installments: string[];
  truck_warranties: string[];
  deals: string[];
  deal_events: string[];
  documents: string[];
  leads: string[];
  customers: string[];
  profiles: string[];
  user_roles: string[];
  payables: string[];
  receivables: string[];
  bank_accounts: string[];
  bank_transactions: string[];
  commissions: string[];
  goals: string[];
  calendar_events: string[];
  services: string[];
  suppliers: string[];
  employees: string[];
  notifications: string[];
  financial_categories: string[];
  general_expenses: string[];
  inventory_items: string[];
  inventory_movements: string[];
  truck_flow_access: string[];
  truck_flows: string[];
  truck_flow_steps: string[];
  truck_flow_evidence: string[];
  truck_flow_events: string[];
  expense_approval_requests: string[];
  expense_approval_events: string[];
  expense_approval_access: string[];
}

export const TABLE_KEYS: RealtimeKeyMap = {
  trucks: [
    "trucks",
    "truck",
    "stock",
    "stock-quick",
    "sold-trucks",
    "trucks-options",
    "trucks-mobile",
    "truck-mobile",
    "truck-detail",
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
  truck_photos: ["trucks-mobile", "truck-mobile", "truck-detail", "sold-trucks-mobile", "trucks", "stock-quick"],
  truck_status_history: [
    "trucks-mobile",
    "truck-mobile",
    "truck-detail",
    "sold-trucks-mobile",
    "dashboard-mobile",
    "dashboard-snapshot",
    "capital-imobilizado",
  ],
  truck_notes: ["truck-detail"],
  truck_documents: ["truck-detail"],
  truck_expenses: [
    "truck-mobile",
    "truck-detail",
    "trucks-mobile",
    "sold-trucks-mobile",
    "finance-mobile",
    "dashboard-snapshot",
    "capital-imobilizado",
    "truck-expenses",
    "truck-expenses-sum",
  ],
  truck_purchase_installments: [
    "truck-mobile",
    "truck-detail",
    "finance-mobile",
    "dashboard-snapshot",
    "sold-trucks-mobile",
  ],
  truck_warranties: ["truck-detail", "sold-trucks-mobile"],
  deals: ["deals", "trucks-mobile", "truck-mobile", "truck-detail", "sold-trucks-mobile", "dashboard-mobile", "dashboard-snapshot"],
  deal_events: ["truck-detail", "deals"],
  documents: ["truck-detail"],
  leads: ["leads", "dashboard-snapshot"],
  customers: [
    "customers",
    "customer",
    "truck-detail",
    "customers_min",
    "customers-mini",
    "customers-mobile",
    "dashboard-snapshot",
  ],
  profiles: ["profiles", "profiles_min", "truck-detail"],
  user_roles: ["user_roles", "roles"],
  payables: [
    "payables",
    "truck-detail",
    "finance-mobile",
    "calendar-events",
    "agenda",
    "agenda-range",
    "event-mobile",
    "agenda-mobile",
    "agenda-mobile-today",
    "notifications",
    "notifications-bell",
    "notifications-mobile",
    "dashboard-snapshot",
  ],
  receivables: [
    "receivables",
    "truck-detail",
    "finance-mobile",
    "agenda-range",
    "event-mobile",
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
    "agenda-range",
    "event-mobile",
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
    "truck-detail",
    "trucks-mobile",
    "agenda-range",
    "event-mobile",
    "agenda-mobile",
    "agenda-mobile-today",
    "notifications-mobile",
    "dashboard-snapshot",
    "dashboard-mobile",
  ],
  suppliers: ["suppliers", "suppliers-options", "truck-detail"],
  employees: ["employees"],
  notifications: ["notifications", "notifications-bell", "notifications-mobile"],
  financial_categories: ["financial_categories", "fin_cats", "finance-mobile"],
  general_expenses: [
    "general-expenses",
    "finance-mobile",
    "truck-detail",
    "capital-imobilizado",
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
  inventory_movements: [
    "finance-mobile",
    "dashboard-snapshot",
    "inventory-mobile",
    "inventory-items",
    "inventory-summary",
    "truck-detail",
    "truck-expenses",
    "truck-expenses-sum",
    "capital-imobilizado",
  ],
  truck_flow_access: ["truck-flow-access"],
  truck_flows: [
    "truck-flows",
    "truck-flow",
    "truck-flow-mobile",
    "dashboard-snapshot",
  ],
  truck_flow_steps: ["truck-flows", "truck-flow", "truck-flow-mobile"],
  truck_flow_evidence: ["truck-flows", "truck-flow", "truck-flow-mobile"],
  truck_flow_events: ["truck-flows", "truck-flow", "truck-flow-mobile"],
  expense_approval_requests: [
    "expense-approval-requests",
    "expense-approval",
    "daily-expenses",
    "daily-expenses-approval",
    "finance-mobile",
    "dashboard-snapshot",
    "notifications",
    "notifications-bell",
    "notifications-mobile",
  ],
  expense_approval_events: ["expense-approval-requests", "expense-approval"],
  expense_approval_access: ["expense-approval-access"],
};

/** Todas as tabelas mutáveis (chaves de TABLE_KEYS) — ordem determinística. */
export const ALL_TABLE_KEYS = Object.keys(TABLE_KEYS) as (keyof RealtimeKeyMap)[];

/** Todas as queryKeys únicas (sem vazias, ordem de aparição). */
export const ALL_QUERY_KEYS: string[] = Array.from(
  new Set(Object.values(TABLE_KEYS).flat().filter(Boolean)),
);

/** Função pura: dado o nome real da tabela, devolve as queryKeys a invalidar. */
export function invalidateKeysFor(table: keyof RealtimeKeyMap): string[] {
  return TABLE_KEYS[table] ?? ([] as string[]);
}
