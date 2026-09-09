import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchDashboardSnapshot, computeExecutiveKpis } from "@/lib/dashboard-data";
import { spaTodayISO } from "@/lib/mobile/dates";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Consultas do aplicativo mobile.
 *
 * Todas usam queryKeys cujo PREFIXO é invalidado pelo hub de Realtime
 * (`useRealtimeSync`) — qualquer INSERT/UPDATE/DELETE feito no aplicativo
 * aparece no CRM e vice-versa, sem duplicar dados.
 *
 * Nenhuma resposta do Supabase é cacheada no service worker.
 */

export interface TruckPhoto {
  url: string;
  is_cover: boolean;
  position: number;
}

export type TruckWithPhotos = Tables<"trucks"> & {
  truck_photos: TruckPhoto[];
};

export interface TruckRef {
  id: string;
  brand: string;
  model: string;
  plate: string | null;
}

export type ServiceTruckRef = TruckRef & {
  status: string;
};

export type CalendarEventItem = Tables<"calendar_events"> & {
  related_truck: TruckRef | null;
};

export type ServiceItem = Tables<"services"> & {
  truck: ServiceTruckRef | null;
};

export type CustomerItem = Pick<
  Tables<"customers">,
  "id" | "name" | "phone" | "email" | "city" | "status" | "created_at"
>;

export type InventoryItem = Pick<
  Tables<"inventory_items">,
  | "id"
  | "name"
  | "category"
  | "quantity"
  | "min_quantity"
  | "unit_price"
  | "unit"
  | "storage_location"
  | "supplier_name"
>;

export type SoldTruck = Pick<
  Tables<"trucks">,
  | "id"
  | "brand"
  | "model"
  | "year"
  | "plate"
  | "sold_price"
  | "sold_at"
  | "warranty_end"
  | "sold_customer_id"
  | "status"
>;

export type NotificationItem = Tables<"notifications">;

export type TruckDetail = Tables<"trucks"> & {
  truck_photos: TruckPhoto[];
  truck_expenses: Tables<"truck_expenses">[];
};

const TRUCK_SELECT = "*, truck_photos(url, is_cover, position)";
const TRUCK_DETAIL_SELECT = "*, truck_photos(url, is_cover, position), truck_expenses(*)";

export const getTruckCover = (t: { truck_photos?: TruckPhoto[] } | null): string | null =>
  t?.truck_photos?.find((p) => p.is_cover)?.url ?? t?.truck_photos?.[0]?.url ?? null;

/** Lista da garagem — todos os caminhões com foto principal. */
export function useTrucks() {
  return useQuery({
    queryKey: ["trucks-mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucks")
        .select(TRUCK_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TruckWithPhotos[];
    },
  });
}

/** Detalhe de um caminhão. */
export function useTruck(id: string | undefined) {
  return useQuery({
    queryKey: ["truck-mobile", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucks")
        .select(TRUCK_DETAIL_SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TruckDetail;
    },
  });
}

/** Compromissos: hoje e próximos 30 dias. */
export function useAgenda(days = 30) {
  const today = spaTodayISO();
  return useQuery({
    queryKey: ["agenda-mobile", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*, related_truck:trucks(id, brand, model, plate)")
        .gte("starts_at", `${today}T00:00:00`)
        .order("starts_at", { ascending: true })
        .limit(Math.min(days, 500));
      if (error) throw error;
      return (data ?? []) as CalendarEventItem[];
    },
  });
}

/** Compromissos de hoje apenas. */
export function useTodaysEvents() {
  const today = spaTodayISO();
  return useQuery({
    queryKey: ["agenda-mobile-today", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*, related_truck:trucks(id, brand, model, plate)")
        .gte("starts_at", `${today}T00:00:00`)
        .lt("starts_at", `${today}T23:59:59`)
        .order("starts_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CalendarEventItem[];
    },
  });
}

/** Serviços gerais (com o caminhão relacionado). */
export function useServices() {
  return useQuery({
    queryKey: ["services-mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, truck:trucks(id, brand, model, plate, status)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ServiceItem[];
    },
  });
}

/** Clientes — busca rápida. */
export function useCustomers(q: string) {
  return useQuery({
    queryKey: ["customers-mobile", q],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, name, phone, email, city, status, created_at");
      if (q) {
        const t = `%${q.toLowerCase()}%`;
        query = query.or(`name.ilike.${t},phone.ilike.${t},email.ilike.${t},city.ilike.${t}`);
      }
      const { data, error } = await query.order("name", { ascending: true }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Financas: snapshot do dashboard + itens financeiros essenciais. */
export function useMobileFinance() {
  return useQuery({
    queryKey: ["finance-mobile"],
    queryFn: async () => {
      const snap = await fetchDashboardSnapshot();
      const kpis = computeExecutiveKpis(snap);
      return { snap, kpis };
    },
    staleTime: 30_000,
  });
}

/** Itens de estoque de materiais. */
export function useInventory() {
  return useQuery({
    queryKey: ["inventory-mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(
          "id, name, category, quantity, min_quantity, unit_price, unit, storage_location, supplier_name",
        )
        .order("name", { ascending: true })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Caminhões vendidos (garantia 90 dias). */
export function useSoldTrucks() {
  return useQuery({
    queryKey: ["sold-trucks-mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucks")
        .select(
          "id, brand, model, year, plate, sold_price, sold_at, warranty_end, sold_customer_id, status",
        )
        .eq("status", "vendido")
        .order("sold_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const customers = await supabase
        .from("customers")
        .select("id, name")
        .in("id", (data ?? []).map((t) => t.sold_customer_id).filter(Boolean) as string[]);
      const map = new Map((customers.data ?? []).map((c) => [c.id, c.name]));
      return {
        trucks: data ?? [],
        customerName: (id: string | null) => (id ? (map.get(id) ?? "—") : "—"),
      };
    },
  });
}

/** Notificações do usuário. */
export function useNotifications() {
  const { data: session } = useAuthSession();
  return useQuery({
    queryKey: ["notifications-mobile"],
    enabled: !!session?.user,
    queryFn: async () => {
      if (!session?.user) return { items: [], unread: 0 };
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(60);
      const items = data ?? [];
      return { items, unread: items.filter((i) => !i.read).length };
    },
  });
}

function useAuthSession() {
  return useQuery({
    queryKey: ["mobile-session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data.session),
  });
}

/** Capital imobilizado (caminhões em estoque com valor investido). */
export function useCapitalImobilizado() {
  const trucks = useTrucks();
  const inStock = (trucks.data ?? []).filter((t) =>
    [
      "disponivel",
      "consignado",
      "patio",
      "oficina",
      "pintura",
      "interna",
      "despachante",
      "repasse",
    ].includes(t.status),
  );
  const total = inStock.reduce(
    (s, t) => s + Number(t.purchase_price ?? 0) + Number(t.expenses_total ?? 0),
    0,
  );
  return { trucks: inStock, total, count: inStock.length };
}
