import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchDashboardSnapshot, computeExecutiveKpis } from "@/lib/dashboard-data";
import { spaTodayISO } from "@/lib/mobile/dates";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/mobile/perm";
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

/** Foto de um caminhão (colunas reais de `truck_photos` no CRM). */
export interface TruckPhoto {
  id: string;
  url: string;
  is_cover: boolean;
  position: number;
  created_at: string;
}

/** Colunas operacionais de um caminhão — sem valores financeiros. */
export type OperationalTruck = Pick<
  Tables<"trucks">,
  | "id"
  | "brand"
  | "model"
  | "year"
  | "plate"
  | "color"
  | "status"
  | "status_started_at"
  | "status_expected_end"
  | "status_notes"
  | "status_supplier_id"
  | "supplier"
  | "origin"
  | "consigned"
  | "created_by"
  | "created_at"
  | "updated_at"
  | "purchase_date"
  | "sold_at"
  | "warranty_end"
  | "sold_customer_id"
  | "chassis"
  | "renavam"
  | "mileage"
  | "fuel"
  | "transmission"
>;

/** Campos financeiros — retornados pelo banco apenas para o Executivo. */
export type ExecTruckFinance = Partial<
  Pick<
    Tables<"trucks">,
    | "purchase_price"
    | "purchase_payment_method"
    | "purchase_installments_count"
    | "purchase_total_paid"
    | "purchase_total_pending"
    | "expected_price"
    | "sold_price"
    | "sale_type"
    | "sale_notes"
    | "expenses_total"
  >
>;

export type TruckWithPhotos = OperationalTruck &
  ExecTruckFinance & {
    truck_photos: TruckPhoto[];
  };

/**
 * SELECT operacional (sem valores financeiros) — usado por Financeiro e
 * Secretaria. As colunas financeiras não saem do banco para esses usuários.
 * Nota: o projeto real do CRM não revoga colunas no nível do banco; o controle
 * é feito aqui, na camada de consulta do app (ver relatório de divergências).
 */
export const TRUCK_OPERATIONAL_SELECT =
  "id, brand, model, year, plate, color, status, status_started_at, status_expected_end, status_notes, status_supplier_id, supplier, origin, consigned, created_by, created_at, updated_at, purchase_date, sold_at, warranty_end, sold_customer_id, chassis, renavam, mileage, fuel, transmission, truck_photos(id, url, is_cover, position, created_at)" as const;

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

/** Subconjunto enxuto de caminhões usado apenas pelo dashboard (home). */
export interface DashboardTruck {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  status: string;
  status_started_at: string | null;
  status_expected_end: string | null;
  purchase_date: string | null;
  sold_at: string | null;
  warranty_end: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Subconjunto enxuto de serviços usado apenas pelo dashboard (home). */
export type DashboardService = Pick<
  Tables<"services">,
  "id" | "title" | "status" | "expected_at" | "completed_at" | "created_at"
> & { truck: TruckRef | null };

/** Subconjunto enxuto de compromissos do dia usado apenas pelo dashboard (home). */
export type DashboardEvent = Pick<
  Tables<"calendar_events">,
  "id" | "title" | "starts_at" | "all_day" | "created_at"
> & { related_truck: TruckRef | null };

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
  "id" | "brand" | "model" | "year" | "plate" | "sold_at" | "warranty_end" | "sold_customer_id" | "status"
> & {
  /** Presente apenas para o Executivo (admin). */
  sold_price?: number | null;
};

export type NotificationItem = Tables<"notifications">;

export interface GlobalSearchTruck {
  id: string;
  brand: string;
  model: string;
  plate: string | null;
  status: string;
}

export interface GlobalSearchService {
  id: string;
  title: string;
  status: string;
  expected_at: string | null;
  truck: TruckRef | null;
}

export interface GlobalSearchResults {
  trucks: GlobalSearchTruck[];
  customers: CustomerItem[];
  services: GlobalSearchService[];
  hasQuery: boolean;
}

export type TruckDetail = Tables<"trucks"> & {
  truck_photos: TruckPhoto[];
  truck_expenses: Tables<"truck_expenses">[];
};

/**
 * Mantém a mesma regra do CRM: foto marcada como capa; se não houver, primeira
 * foto retornada no relacionamento `truck_photos`.
 */
export function sortTruckPhotos(photos: TruckPhoto[]): TruckPhoto[] {
  const withUrl = photos.filter((p) => Boolean(p.url));
  const cover = withUrl.find((p) => p.is_cover);
  return cover ? [cover, ...withUrl.filter((p) => p.id !== cover.id)] : withUrl;
}

/**
 * Regra única de escolha da foto de capa do app.
 *
 * - Nunca usa `fotos[0]` sem ordenação explícita (causa raiz das fotos antigas).
 * - Retorna null quando o caminhão não possui fotos.
 */
export const getTruckCover = (t: { truck_photos?: TruckPhoto[] } | null): string | null =>
  getTruckCoverPhoto(t)?.url ?? null;

export const getTruckCoverPhoto = (t: { truck_photos?: TruckPhoto[] } | null): TruckPhoto | null =>
  sortTruckPhotos(t?.truck_photos ?? [])[0] ?? null;

/**
 * URL de exibição de uma foto com cache-busting seguro.
 *
 * Evita que o navegador exiba uma imagem antiga quando o arquivo no Storage
 * foi atualizado mantendo a mesma URL pública. Não quebra URLs assinadas
 * (com query string existente).
 */
export function truckPhotoSrc(url: string | null | undefined, version?: string | null): string | undefined {
  if (!url) return undefined;
  const v = version ? String(version) : undefined;
  if (!v) return url;
  const SIGNED_PARAMS = ["token", "signature", "expires", "expires_at", "X-Amz-Signature"];
  if (SIGNED_PARAMS.some((p) => new RegExp(`[?&]${p}=`).test(url))) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(v)}`;
}

export function truckPhotoVersion(photo: TruckPhoto | null | undefined, truckUpdatedAt?: string | null) {
  if (!photo) return truckUpdatedAt ?? null;
  return [photo.id, photo.created_at, truckUpdatedAt].filter(Boolean).join(":");
}

/** Lista da garagem — todos os caminhões com foto principal. */
export function useTrucks() {
  const { roles } = useAuth();
  const isExec = isAdmin(roles);
  return useQuery({
    queryKey: ["trucks-mobile", isExec],
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    queryFn: async () => {
      const { data, error } = await (isExec
        ? supabase
            .from("trucks")
            .select("*, truck_photos(id, url, is_cover, position, created_at)")
            .order("created_at", { ascending: false })
        : supabase
            .from("trucks")
            .select(TRUCK_OPERATIONAL_SELECT)
            .order("created_at", { ascending: false }));
      if (error) throw error;
      const trucks = (data ?? []) as TruckWithPhotos[];
      if (import.meta.env.DEV) {
        const TEST_PLATES = ["SVL3G81", "BBY5H79", "AXD0C32", "BBZ1D29", "BCA7A57", "ITS0267"];
        const diagnostic = trucks
          .filter((t) => TEST_PLATES.includes(t.plate ?? ""))
          .map((t) => {
            const cover = sortTruckPhotos(t.truck_photos ?? [])[0] ?? null;
            return {
              id: t.id,
              plate: t.plate,
              status: t.status,
              updated_at: t.updated_at,
              photo_count: t.truck_photos?.length ?? 0,
              cover_id: cover?.id ?? null,
              cover_is_cover: cover?.is_cover ?? null,
              cover_url: cover?.url ? cover.url.substring(0, 80) + "..." : null,
            };
          });
        console.group("%c[DIAG] useTrucks — Supabase raw response", "color: #F4B400; font-weight: bold");
        console.log("Total trucks:", trucks.length);
        console.log("isExec:", isExec);
        console.log("Query key:", ["trucks-mobile", isExec]);
        console.table(diagnostic);
        console.groupEnd();
      }
      return trucks;
    },
  });
}

/**
 * Detalhe de um caminhão.
 *
 * O Executivo recebe a linha completa (inclui valores financeiros) e as
 * despesas do caminhão. Para Financeiro e Secretaria o SELECT operacional
 * exclui as colunas financeiras e as despesas não são consultadas.
 */
export function useTruck(id: string | undefined) {
  const { roles } = useAuth();
  const isExec = isAdmin(roles);
  return useQuery({
    queryKey: ["truck-mobile", id, isExec],
    enabled: !!id,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (isExec
        ? supabase
            .from("trucks")
            .select("*, truck_photos(id, url, is_cover, position, created_at)")
            .eq("id", id!)
            .maybeSingle()
        : supabase
            .from("trucks")
            .select(TRUCK_OPERATIONAL_SELECT)
            .eq("id", id!)
            .maybeSingle());
      if (error) throw error;
      const row = (data ?? null) as TruckDetail | null;
      if (!row) return null;

      if (import.meta.env.DEV) {
        const cover = sortTruckPhotos(row.truck_photos ?? [])[0] ?? null;
        console.group("%c[DIAG] useTruck — detail response", "color: #F4B400; font-weight: bold");
        console.log("id:", row.id, "| plate:", row.plate, "| status:", row.status);
        console.log("truck_photos count:", row.truck_photos?.length ?? 0);
        if (cover) {
          console.log("cover:", { id: cover.id, is_cover: cover.is_cover, url: cover.url?.substring(0, 80) + "..." });
        }
        console.log("raw truck_photos:", JSON.parse(JSON.stringify(row.truck_photos ?? [])));
        console.groupEnd();
      }

      if (isExec) {
        const expensesR = await supabase
          .from("truck_expenses")
          .select("*")
          .eq("truck_id", id!)
          .order("created_at", { ascending: false });
        if (expensesR.error) throw expensesR.error;
        return {
          ...row,
          truck_expenses: (expensesR.data ?? []) as Tables<"truck_expenses">[],
        } as TruckDetail;
      }

      return row;
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

/** Compromissos num intervalo [from, to] — usado pelo calendário mensal. */
export function useAgendaRange(from: string, to: string) {
  return useQuery({
    queryKey: ["agenda-range", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*, related_truck:trucks(id, brand, model, plate)")
        .gte("starts_at", `${from}T00:00:00`)
        .lt("starts_at", `${to}T23:59:59`)
        .order("starts_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as CalendarEventItem[];
    },
  });
}

/** Um único compromisso (para edição). */
export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event-mobile", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*, related_truck:trucks(id, brand, model, plate)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CalendarEventItem | null;
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

/**
 * Dados do dashboard (home) — consulta única e enxuta.
 *
 * Em vez de buscar a garagem inteira com `*` (descrições longas, vendas, etc.)
 * e os 200 serviços completos, busca apenas as colunas que o painel usa, em
 * três requests paralelos. Recarrega em mount/foco/reconexão pelo QueryClient;
 * o Realtime apenas complementa invalidando pelo prefixo `dashboard-mobile`.
 */
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-mobile", spaTodayISO()],
    queryFn: async () => {
      const today = spaTodayISO();
      const [trucksR, servicesR, eventsR] = await Promise.all([
        supabase
          .from("trucks")
          .select(
            "id, brand, model, year, plate, status, status_started_at, status_expected_end, purchase_date, sold_at, warranty_end, created_at, updated_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("services")
          .select(
            "id, title, status, expected_at, completed_at, created_at, truck:trucks(id, brand, model, plate)",
          )
          .in("status", ["em_andamento", "concluido"])
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("calendar_events")
          .select("id, title, starts_at, all_day, created_at, related_truck:trucks(id, brand, model, plate)")
          .gte("starts_at", `${today}T00:00:00`)
          .lt("starts_at", `${today}T23:59:59`)
          .order("starts_at", { ascending: true })
          .limit(50),
      ]);
      if (trucksR.error) throw trucksR.error;
      if (servicesR.error) throw servicesR.error;
      if (eventsR.error) throw eventsR.error;
      const result = {
        trucks: (trucksR.data ?? []) as DashboardTruck[],
        services: (servicesR.data ?? []) as DashboardService[],
        events: (eventsR.data ?? []) as DashboardEvent[],
      };
      if (import.meta.env.DEV) {
        const TEST_PLATES = ["SVL3G81", "BBY5H79", "AXD0C32", "BBZ1D29", "BCA7A57", "ITS0267"];
        const diag = result.trucks
          .filter((t) => TEST_PLATES.includes(t.plate ?? ""))
          .map((t) => ({ plate: t.plate, status: t.status, updated_at: t.updated_at }));
        if (diag.length) {
          console.group("%c[DIAG] useDashboardData — trucks for test plates", "color: #F4B400; font-weight: bold");
          console.table(diag);
          console.groupEnd();
        }
      }
      return result;
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
  const { roles } = useAuth();
  return useQuery({
    queryKey: ["finance-mobile"],
    enabled: isAdmin(roles),
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

/**
 * Caminhões vendidos (garantia 90 dias).
 *
 * `sold_price` (financeiro) é selecionado apenas para o Executivo. Para
 * Financeiro e Secretaria o SELECT usa somente colunas operacionais.
 */
export function useSoldTrucks() {
  const { roles } = useAuth();
  const isExec = isAdmin(roles);
  return useQuery({
    queryKey: ["sold-trucks-mobile", isExec],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (isExec
        ? supabase
            .from("trucks")
            .select(
              "id, brand, model, year, plate, sold_at, warranty_end, sold_customer_id, status, sold_price",
            )
            .eq("status", "vendido")
            .order("sold_at", { ascending: false })
            .limit(200)
        : supabase
            .from("trucks")
            .select("id, brand, model, year, plate, sold_at, warranty_end, sold_customer_id, status")
            .eq("status", "vendido")
            .order("sold_at", { ascending: false })
            .limit(200));
      if (error) throw error;
      const sales = (data ?? []) as SoldTruck[];
      const customers = await supabase
        .from("customers")
        .select("id, name")
        .in("id", sales.map((t) => t.sold_customer_id).filter(Boolean) as string[]);
      const map = new Map((customers.data ?? []).map((c) => [c.id, c.name]));
      return {
        trucks: sales,
        customerName: (id: string | null) => (id ? (map.get(id) ?? "—") : "—"),
      };
    },
  });
}

/**
 * Classifica uma notificação como financeira (deve aparecer apenas no módulo
 * Financeiro, que é exclusivo do Executivo).
 */
export function isFinancialNotification(n: {
  title?: string | null;
  message?: string | null;
  link?: string | null;
}): boolean {
  if (typeof n.link === "string" && n.link.startsWith("/financeiro")) return true;
  const text = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase();
  return (
    /(r\$|us\$|ca\$\.\$)|\b(dinheiro|pagamento|recebimento|vencimento)\b/.test(text) ||
    /(conta a (pagar|receber)|conta em atraso|boleto|parcela|comissão|comissao|saldo bancário|despesa)/.test(
      text,
    )
  );
}

/** Notificações do usuário (filtra avisos financeiros fora do Financeiro). */
export function useNotifications(opts?: { includeFinance?: boolean }) {
  const { data: session } = useAuthSession();
  const includeFinance = opts?.includeFinance ?? false;
  return useQuery({
    queryKey: ["notifications-mobile", includeFinance],
    enabled: !!session?.user,
    queryFn: async () => {
      if (!session?.user) return { items: [], unread: 0 };
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(60);
      const items = (data ?? []).filter((i) => includeFinance || !isFinancialNotification(i));
      return { items, unread: items.filter((i) => !i.read).length };
    },
  });
}

/** Não responde a consultas muito curtas; retorna null quando deve ficar ocioso. */
export async function globalSearch(
  q: string,
): Promise<GlobalSearchResults | null> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return { trucks: [], customers: [], services: [], hasQuery: true };
  const t = `%${term}%`;
  const [trucks, customers, servicesR] = await Promise.all([
    supabase
      .from("trucks")
      .select("id, brand, model, plate, status")
      .or(`brand.ilike.${t},model.ilike.${t},plate.ilike.${t}`)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("customers")
      .select("id, name, phone, email, city, status, created_at")
      .or(`name.ilike.${t},phone.ilike.${t},email.ilike.${t},city.ilike.${t}`)
      .order("name", { ascending: true })
      .limit(15),
    supabase
      .from("services")
      .select("id, title, status, expected_at, truck:trucks(id, brand, model, plate)")
      .or(`title.ilike.${t},description.ilike.${t}`)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);
  if (trucks.error) throw trucks.error;
  if (customers.error) throw customers.error;
  if (servicesR.error) throw servicesR.error;
  return {
    trucks: trucks.data as GlobalSearchTruck[],
    customers: customers.data as CustomerItem[],
    services: servicesR.data as GlobalSearchService[],
    hasQuery: true,
  };
}

/** Busca global com debounce interno (não dispara enquanto não digita). */
export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: ["global-search", q],
    queryFn: () => globalSearch(q),
    enabled: q.trim().length > 0,
  });
}

function useAuthSession() {
  return useQuery({
    queryKey: ["mobile-session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data.session),
  });
}

/**
 * Capital imobilizado (caminhões em estoque com valor investido).
 * Exclusivo do Executivo.
 */
export function useCapitalImobilizado() {
  const { roles } = useAuth();
  const isExec = isAdmin(roles);
  const inStockStatuses = [
    "disponivel",
    "consignado",
    "patio",
    "oficina",
    "pintura",
    "interna",
    "despachante",
    "repasse",
  ];
  return useQuery({
    queryKey: ["capital-imobilizado", isExec],
    enabled: isExec,
    queryFn: async () => {
      const { data, error } = await supabase.from("trucks").select("*");
      if (error) throw error;
      const trucks = ((data ?? []) as Tables<"trucks">[]).filter((t) =>
        inStockStatuses.includes(t.status),
      );
      const total = trucks.reduce(
        (s, t) => s + Number(t.purchase_price ?? 0) + Number(t.expenses_total ?? 0),
        0,
      );
      return { trucks, total, count: trucks.length };
    },
  });
}
