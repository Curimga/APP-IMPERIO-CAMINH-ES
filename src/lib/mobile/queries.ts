import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchDashboardSnapshot, computeExecutiveKpis } from "@/lib/dashboard-data";
import { spaTodayISO } from "@/lib/mobile/dates";
import { useAuth } from "@/hooks/use-auth";
import {
  canAccessBanking,
  canSeeServices,
  isFinanceExecutive,
  isSecretariaOnly,
} from "@/lib/mobile/perm";
import { parseMoney } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";
import type { TruckCustomerRef, TruckDealRef } from "@/lib/mobile/truck-detail";

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
  | "description"
  | "ai_description"
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
  "id, brand, model, year, plate, color, status, status_started_at, status_expected_end, status_notes, status_supplier_id, supplier, origin, consigned, created_by, created_at, updated_at, purchase_date, sold_at, warranty_end, sold_customer_id, chassis, renavam, mileage, fuel, transmission, description, ai_description, truck_photos(id, url, is_cover, position, created_at)" as const;

export const TRUCK_OPERATIONAL_VIEW_SELECT =
  "id, brand, model, year, plate, color, status, status_started_at, status_expected_end, status_notes, status_supplier_id, supplier, origin, consigned, created_by, created_at, updated_at, purchase_date, sold_at, warranty_end, sold_customer_id, chassis, renavam, mileage, fuel, transmission, description, ai_description, site_description, truck_photos" as const;

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

function calendarEventsSource(roles: Parameters<typeof isSecretariaOnly>[0]) {
  return (isSecretariaOnly(roles) ? "calendar_events_operational" : "calendar_events") as "calendar_events";
}

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
  "id" | "truck_id" | "title" | "status" | "category" | "notes" | "expected_at" | "completed_at" | "created_at"
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

export type GeneralExpenseItem = Pick<
  Tables<"general_expenses">,
  | "id"
  | "description"
  | "category"
  | "amount"
  | "occurred_at"
  | "due_date"
  | "status"
  | "supplier"
  | "payment_method"
  | "notes"
  | "created_at"
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

export type BankTxType = "entrada" | "saida";
export type BankPeriod = "7d" | "30d" | "90d";

export type BankingAccount = Pick<Tables<"bank_accounts">, "id" | "name" | "bank" | "current_balance" | "active"> & {
  period_in: number;
  period_out: number;
  last_movement_at: string | null;
};

export type BankingTransaction = Tables<"bank_transactions"> & {
  bank_accounts: Pick<Tables<"bank_accounts">, "name" | "bank"> | null;
  financial_categories: Pick<Tables<"financial_categories">, "name" | "kind"> | null;
};

export interface BankingFilters {
  period: BankPeriod;
  accountId: string;
  type: "all" | BankTxType;
}

export interface BankMovementInput {
  type: BankTxType;
  bankAccountId: string;
  amount: string;
  occurredAt: string;
  categoryId?: string;
  description?: string;
}

export interface BankTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description?: string;
}

export interface BankBalanceAdjustmentInput {
  bankAccountId: string;
  currentBalance: number;
  targetBalance: string;
  notes: string;
}

export type TruckDetail = Tables<"trucks"> & {
  truck_photos: TruckPhoto[];
  truck_expenses: Tables<"truck_expenses">[];
};

export type TruckServiceDetail = Pick<
  Tables<"services">,
  | "id"
  | "truck_id"
  | "title"
  | "description"
  | "notes"
  | "status"
  | "category"
  | "supplier_id"
  | "attachment_url"
  | "expected_at"
  | "completed_at"
  | "created_at"
  | "created_by"
  | "truck_previous_status"
>;

export type ProfileName = Pick<Tables<"profiles">, "id" | "full_name">;
export type SupplierName = { id: string; name: string };

export interface TruckDetailBundle {
  truck: TruckWithPhotos | null;
  expenses: Tables<"truck_expenses">[];
  generalExpenses: Tables<"general_expenses">[];
  services: TruckServiceDetail[];
  history: Tables<"truck_status_history">[];
  notes: Tables<"truck_notes">[];
  truckDocuments: Tables<"truck_documents">[];
  documents: Tables<"documents">[];
  documentUrls: Map<string, string>;
  deals: TruckDealRef[];
  dealEvents: Tables<"deal_events">[];
  customers: TruckCustomerRef[];
  profiles: Map<string, string>;
  suppliers: Map<string, string>;
  warranty: Tables<"truck_warranties"> | null;
  purchaseInstallments: Tables<"truck_purchase_installments">[];
  payables: Tables<"payables">[];
  receivables: Tables<"receivables">[];
}

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

function isMissingOperationalView(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /trucks_operational.*(not find|does not exist|schema cache)/i.test(error.message ?? "")
  );
}

function normalizeTruckPhotos(value: unknown): TruckPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (photo): photo is TruckPhoto =>
      typeof photo === "object" &&
      photo !== null &&
      typeof (photo as TruckPhoto).id === "string" &&
      typeof (photo as TruckPhoto).url === "string",
  );
}

function normalizeOperationalTruck(row: Record<string, unknown>): TruckWithPhotos {
  return {
    ...row,
    truck_photos: normalizeTruckPhotos(row.truck_photos),
  } as TruckWithPhotos;
}

async function fetchOperationalTrucks(): Promise<TruckWithPhotos[]> {
  const viewR = await supabase
    .from("trucks_operational")
    .select(TRUCK_OPERATIONAL_VIEW_SELECT)
    .order("created_at", { ascending: false });
  if (!viewR.error) return (viewR.data ?? []).map((row) => normalizeOperationalTruck(row));
  if (!isMissingOperationalView(viewR.error)) throw viewR.error;

  const baseR = await supabase
    .from("trucks")
    .select(TRUCK_OPERATIONAL_SELECT)
    .order("created_at", { ascending: false });
  if (baseR.error) throw baseR.error;
  return (baseR.data ?? []).map((row) => normalizeOperationalTruck(row));
}

async function fetchOperationalTruck(id: string): Promise<TruckWithPhotos | null> {
  const viewR = await supabase
    .from("trucks_operational")
    .select(TRUCK_OPERATIONAL_VIEW_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!viewR.error) return viewR.data ? normalizeOperationalTruck(viewR.data) : null;
  if (!isMissingOperationalView(viewR.error)) throw viewR.error;

  const baseR = await supabase
    .from("trucks")
    .select(TRUCK_OPERATIONAL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (baseR.error) throw baseR.error;
  return baseR.data ? normalizeOperationalTruck(baseR.data) : null;
}

async function fetchDashboardTrucks(): Promise<DashboardTruck[]> {
  const select =
    "id, brand, model, year, plate, status, status_started_at, status_expected_end, purchase_date, sold_at, warranty_end, created_at, updated_at" as const;
  const viewR = await supabase
    .from("trucks_operational")
    .select(select)
    .order("created_at", { ascending: false });
  if (!viewR.error) return (viewR.data ?? []) as DashboardTruck[];
  if (!isMissingOperationalView(viewR.error)) throw viewR.error;

  const baseR = await supabase.from("trucks").select(select).order("created_at", { ascending: false });
  if (baseR.error) throw baseR.error;
  return (baseR.data ?? []) as DashboardTruck[];
}

async function fetchOperationalSoldTrucks(): Promise<SoldTruck[]> {
  const select = "id, brand, model, year, plate, sold_at, warranty_end, sold_customer_id, status" as const;
  const viewR = await supabase
    .from("trucks_operational")
    .select(select)
    .eq("status", "vendido")
    .order("sold_at", { ascending: false })
    .limit(200);
  if (!viewR.error) return (viewR.data ?? []) as SoldTruck[];
  if (!isMissingOperationalView(viewR.error)) throw viewR.error;

  const baseR = await supabase
    .from("trucks")
    .select(select)
    .eq("status", "vendido")
    .order("sold_at", { ascending: false })
    .limit(200);
  if (baseR.error) throw baseR.error;
  return (baseR.data ?? []) as SoldTruck[];
}

async function searchOperationalTrucks(term: string): Promise<GlobalSearchTruck[]> {
  const select = "id, brand, model, plate, status" as const;
  const filter = `brand.ilike.${term},model.ilike.${term},plate.ilike.${term}`;
  const viewR = await supabase
    .from("trucks_operational")
    .select(select)
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(15);
  if (!viewR.error) return (viewR.data ?? []) as GlobalSearchTruck[];
  if (!isMissingOperationalView(viewR.error)) throw viewR.error;

  const baseR = await supabase
    .from("trucks")
    .select(select)
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(15);
  if (baseR.error) throw baseR.error;
  return (baseR.data ?? []) as GlobalSearchTruck[];
}

async function fetchTruckRefs(ids: Array<string | null | undefined>): Promise<Map<string, TruckRef>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (uniqueIds.length === 0) return new Map();

  const viewR = await supabase
    .from("trucks_operational")
    .select("id, brand, model, plate, status")
    .in("id", uniqueIds);
  if (!viewR.error) {
    return new Map((viewR.data ?? []).map((truck) => [truck.id, truck as TruckRef]));
  }
  if (!isMissingOperationalView(viewR.error)) throw viewR.error;

  const baseR = await supabase
    .from("trucks")
    .select("id, brand, model, plate, status")
    .in("id", uniqueIds);
  if (baseR.error) throw baseR.error;
  return new Map((baseR.data ?? []).map((truck) => [truck.id, truck as TruckRef]));
}

async function attachRelatedTrucks<T extends { related_truck_id: string | null }>(rows: T[]) {
  const refs = await fetchTruckRefs(rows.map((row) => row.related_truck_id));
  return rows.map((row) => ({
    ...row,
    related_truck: row.related_truck_id ? (refs.get(row.related_truck_id) ?? null) : null,
  }));
}

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
  const { roles, user } = useAuth();
  const isExec = isFinanceExecutive(roles, user?.email);
  return useQuery({
    queryKey: ["trucks-mobile", isExec],
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    queryFn: async () => {
      let trucks: TruckWithPhotos[];
      if (isExec) {
        const { data, error } = await supabase
          .from("trucks")
          .select("*, truck_photos(id, url, is_cover, position, created_at)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        trucks = (data ?? []).map((row) => normalizeOperationalTruck(row));
      } else {
        trucks = await fetchOperationalTrucks();
      }
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
  const { roles, user } = useAuth();
  const isExec = isFinanceExecutive(roles, user?.email);
  return useQuery({
    queryKey: ["truck-mobile", id, isExec],
    enabled: !!id,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let row: TruckWithPhotos | null;
      if (isExec) {
        const { data, error } = await supabase
          .from("trucks")
          .select("*, truck_photos(id, url, is_cover, position, created_at)")
          .eq("id", id!)
          .maybeSingle();
        if (error) throw error;
        row = data ? normalizeOperationalTruck(data) : null;
      } else {
        row = await fetchOperationalTruck(id!);
      }
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

/**
 * Ficha completa do caminhão aberta por `trucks.id` real.
 *
 * Valores financeiros (compra, venda, despesas, parcelas, contas) só são
 * consultados quando o usuário é Executivo. Para demais perfis essas requests
 * nem são enviadas ao Supabase.
 */
export function useTruckDetail(id: string | undefined) {
  const { roles, user } = useAuth();
  const isExec = isFinanceExecutive(roles, user?.email);
  return useQuery({
    queryKey: ["truck-detail", id, isExec],
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    queryFn: async (): Promise<TruckDetailBundle> => {
      let truck: TruckWithPhotos | null;
      if (isExec) {
        const truckR = await supabase
          .from("trucks")
          .select("*, truck_photos(id, url, is_cover, position, created_at)")
          .eq("id", id!)
          .maybeSingle();
        if (truckR.error) throw truckR.error;
        truck = truckR.data ? normalizeOperationalTruck(truckR.data) : null;
      } else {
        truck = await fetchOperationalTruck(id!);
      }
      const empty: TruckDetailBundle = {
        truck: null,
        expenses: [],
        generalExpenses: [],
        services: [],
        history: [],
        notes: [],
        truckDocuments: [],
        documents: [],
        documentUrls: new Map(),
        deals: [],
        dealEvents: [],
        customers: [],
        profiles: new Map(),
        suppliers: new Map(),
        warranty: null,
        purchaseInstallments: [],
        payables: [],
        receivables: [],
      };
      if (!truck) return empty;

      // `deals.value` é financeiro: sai do banco apenas para o Executivo.
      const dealSelect = isExec
        ? "id, truck_id, customer_id, stage, title, notes, value, priority, owner_id, occurred_at, created_at, updated_at"
        : "id, truck_id, customer_id, stage, title, notes, priority, owner_id, occurred_at, created_at, updated_at";
      const restrictedSecretary = isSecretariaOnly(roles);
      const serviceSelect =
        "id, truck_id, title, description, notes, status, category, supplier_id, attachment_url, expected_at, completed_at, created_at, created_by, truck_previous_status" as const;
      const [servicesR, historyR, notesR, truckDocsR, dealsR, warrantyR] = await Promise.all([
        restrictedSecretary
          ? supabase
              .from("services_operational")
              .select(serviceSelect)
              .eq("truck_id", id!)
              .order("created_at", { ascending: false })
          : supabase
              .from("services")
              .select(serviceSelect)
              .eq("truck_id", id!)
              .order("created_at", { ascending: false }),
        supabase
          .from("truck_status_history")
          .select("*")
          .eq("truck_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("truck_notes")
          .select("*")
          .eq("truck_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("truck_documents")
          .select("*")
          .eq("truck_id", id!)
          .order("created_at", { ascending: false }),
        restrictedSecretary
          ? Promise.resolve({ data: [] as TruckDealRef[], error: null })
          : supabase
              .from("deals")
              .select(dealSelect)
              .eq("truck_id", id!)
              .order("updated_at", { ascending: false })
              .limit(30),
        supabase
          .from("truck_warranties")
          .select("*")
          .eq("truck_id", id!)
          .maybeSingle(),
      ]);
      if (servicesR.error) throw servicesR.error;
      if (historyR.error) throw historyR.error;
      if (notesR.error) throw notesR.error;
      if (truckDocsR.error) throw truckDocsR.error;
      if (dealsR.error) throw dealsR.error;
      if (warrantyR.error) throw warrantyR.error;

      const services = (servicesR.data ?? []) as TruckServiceDetail[];
      const history = (historyR.data ?? []) as Tables<"truck_status_history">[];
      const notes = (notesR.data ?? []) as Tables<"truck_notes">[];
      const truckDocuments = (truckDocsR.data ?? []) as Tables<"truck_documents">[];
      const deals = ((dealsR.data ?? []) as unknown as TruckDealRef[]).map(
        (d) => (isExec ? d : d ? { ...d, value: null } : d),
      );
      const warranty = (warrantyR.data ?? null) as Tables<"truck_warranties"> | null;
      const dealIds = deals.map((d) => d.id);

      const docsQuery = supabase.from("documents").select("*");
      const docsR = dealIds.length
        ? await docsQuery.or(`truck_id.eq.${id!},deal_id.in.(${dealIds.join(",")})`).order("created_at", { ascending: false })
        : await docsQuery.eq("truck_id", id!).order("created_at", { ascending: false });
      if (docsR.error) throw docsR.error;
      const documents = (docsR.data ?? []) as Tables<"documents">[];

      const customerIds = Array.from(
        new Set(
          [truck.sold_customer_id, warranty?.customer_id, ...deals.map((d) => d.customer_id)].filter(
            Boolean,
          ) as string[],
        ),
      );
      const customersR = customerIds.length
        ? isExec
          ? await supabase
              .from("customers")
              .select("id, name, phone, email, city, document")
              .in("id", customerIds)
          : await supabase
              .from("customers")
              .select("id, name, phone, email, city")
              .in("id", customerIds)
        : null;
      if (customersR?.error) throw customersR.error;
      const customers = (customersR?.data ?? []) as unknown as TruckCustomerRef[];

      const dealEventsR = dealIds.length
        ? await supabase
            .from("deal_events")
            .select("*")
            .in("deal_id", dealIds)
            .order("created_at", { ascending: false })
        : null;
      if (dealEventsR?.error) throw dealEventsR.error;

      const profileIds = Array.from(
        new Set(
          [
            truck.created_by,
            ...services.map((s) => s.created_by),
            ...history.map((h) => h.changed_by),
            ...notes.map((n) => n.created_by),
            ...deals.map((d) => d.owner_id),
            ...(dealEventsR?.data ?? []).map((e) => e.user_id),
          ].filter(Boolean) as string[],
        ),
      );
      const profilesR = profileIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
        : null;
      if (profilesR?.error) throw profilesR.error;

      const supplierIds = Array.from(
        new Set([truck.status_supplier_id, ...services.map((s) => s.supplier_id)].filter(Boolean) as string[]),
      );
      const suppliersR = supplierIds.length
        ? await supabase.from("suppliers").select("id, name").in("id", supplierIds)
        : null;
      if (suppliersR?.error) throw suppliersR.error;

      const documentUrls = new Map<string, string>();
      const paths = Array.from(
        new Set([
          ...truckDocuments.map((d) => d.file_path).filter(Boolean),
          ...documents.map((d) => d.storage_path).filter(Boolean),
        ] as string[]),
      );
      await Promise.all(
        paths.map(async (path) => {
          const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
          if (data?.signedUrl) documentUrls.set(path, data.signedUrl);
        }),
      );

      let expenses: Tables<"truck_expenses">[] = [];
      let generalExpenses: Tables<"general_expenses">[] = [];
      let purchaseInstallments: Tables<"truck_purchase_installments">[] = [];
      let payables: Tables<"payables">[] = [];
      let receivables: Tables<"receivables">[] = [];
      if (isExec) {
        const [expensesR, generalR, installmentsR, payablesR, receivablesR] = await Promise.all([
          supabase
            .from("truck_expenses")
            .select("*")
            .eq("truck_id", id!)
            .order("created_at", { ascending: false }),
          supabase
            .from("general_expenses")
            .select("*")
            .eq("truck_id", id!)
            .order("occurred_at", { ascending: false }),
          supabase
            .from("truck_purchase_installments")
            .select("*")
            .eq("truck_id", id!)
            .order("installment_number", { ascending: true }),
          supabase
            .from("payables")
            .select("*")
            .eq("truck_id", id!)
            .order("due_date", { ascending: true }),
          supabase
            .from("receivables")
            .select("*")
            .eq("truck_id", id!)
            .order("due_date", { ascending: true }),
        ]);
        if (expensesR.error) throw expensesR.error;
        if (generalR.error) throw generalR.error;
        if (installmentsR.error) throw installmentsR.error;
        if (payablesR.error) throw payablesR.error;
        if (receivablesR.error) throw receivablesR.error;
        expenses = (expensesR.data ?? []) as Tables<"truck_expenses">[];
        generalExpenses = (generalR.data ?? []) as Tables<"general_expenses">[];
        purchaseInstallments = (installmentsR.data ?? []) as Tables<"truck_purchase_installments">[];
        payables = (payablesR.data ?? []) as Tables<"payables">[];
        receivables = (receivablesR.data ?? []) as Tables<"receivables">[];
      }

      return {
        truck,
        expenses,
        generalExpenses,
        services,
        history,
        notes,
        truckDocuments,
        documents,
        documentUrls,
        deals,
        dealEvents: (dealEventsR?.data ?? []) as Tables<"deal_events">[],
        customers,
        profiles: new Map(((profilesR?.data ?? []) as ProfileName[]).map((p) => [p.id, p.full_name ?? "—"])),
        suppliers: new Map(((suppliersR?.data ?? []) as SupplierName[]).map((s) => [s.id, s.name])),
        warranty,
        purchaseInstallments,
        payables,
        receivables,
      };
    },
  });
}

/** Compromissos: hoje e próximos 30 dias. */
export function useAgenda(days = 30) {
  const { roles } = useAuth();
  const today = spaTodayISO();
  return useQuery({
    queryKey: ["agenda-mobile", today, isSecretariaOnly(roles)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(calendarEventsSource(roles))
        .select("*")
        .gte("starts_at", `${today}T00:00:00`)
        .order("starts_at", { ascending: true })
        .limit(Math.min(days, 500));
      if (error) throw error;
      return (await attachRelatedTrucks(data ?? [])) as CalendarEventItem[];
    },
  });
}

/** Compromissos num intervalo [from, to] — usado pelo calendário mensal. */
export function useAgendaRange(from: string, to: string) {
  const { roles } = useAuth();
  return useQuery({
    queryKey: ["agenda-range", from, to, isSecretariaOnly(roles)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(calendarEventsSource(roles))
        .select("*")
        .gte("starts_at", `${from}T00:00:00`)
        .lt("starts_at", `${to}T23:59:59`)
        .order("starts_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (await attachRelatedTrucks(data ?? [])) as CalendarEventItem[];
    },
  });
}

/** Um único compromisso (para edição). */
export function useEvent(id: string | undefined) {
  const { roles } = useAuth();
  return useQuery({
    queryKey: ["event-mobile", id, isSecretariaOnly(roles)],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(calendarEventsSource(roles))
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return (await attachRelatedTrucks([data]))[0] as CalendarEventItem;
    },
  });
}

/** Compromissos de hoje apenas. */
export function useTodaysEvents() {
  const { roles } = useAuth();
  const today = spaTodayISO();
  return useQuery({
    queryKey: ["agenda-mobile-today", today, isSecretariaOnly(roles)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(calendarEventsSource(roles))
        .select("*")
        .gte("starts_at", `${today}T00:00:00`)
        .lt("starts_at", `${today}T23:59:59`)
        .order("starts_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (await attachRelatedTrucks(data ?? [])) as CalendarEventItem[];
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
  const { roles } = useAuth();
  const showServices = canSeeServices(roles);
  return useQuery({
    queryKey: ["dashboard-mobile", spaTodayISO(), showServices],
    queryFn: async () => {
      const today = spaTodayISO();
      const [trucks, servicesR, eventsR] = await Promise.all([
        fetchDashboardTrucks(),
        showServices
          ? supabase
              .from("services_operational")
              .select(
                "id, truck_id, title, status, category, notes, expected_at, completed_at, created_at",
              )
              .in("status", ["em_andamento", "concluido"])
              .order("created_at", { ascending: false })
              .limit(200)
          : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
        supabase
          .from(calendarEventsSource(roles))
          .select("id, title, starts_at, all_day, created_at, related_truck_id")
          .gte("starts_at", `${today}T00:00:00`)
          .lt("starts_at", `${today}T23:59:59`)
          .order("starts_at", { ascending: true })
          .limit(50),
      ]);
      if (servicesR.error) throw servicesR.error;
      if (eventsR.error) throw eventsR.error;
      const events = await attachRelatedTrucks(eventsR.data ?? []);
      const serviceRows = servicesR.data ?? [];
      const serviceTrucks = await fetchTruckRefs(
        serviceRows.map((service) => (service as { truck_id: string | null }).truck_id),
      );
      const services = serviceRows.map((service) => {
        const row = service as { truck_id: string | null };
        return {
          ...service,
          truck: row.truck_id ? (serviceTrucks.get(row.truck_id) ?? null) : null,
        } as DashboardService;
      });
      const result = {
        trucks,
        services,
        events: events as DashboardEvent[],
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
  const { roles } = useAuth();
  const enabled = canSeeServices(roles);
  return useQuery({
    queryKey: ["services-mobile", enabled],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services_operational")
        .select(
          "id, truck_id, supplier_id, title, description, sent_at, expected_at, completed_at, status, attachment_url, notes, created_by, created_at, updated_at, truck_previous_status, category",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as Array<Record<string, unknown> & { truck_id: string | null }>;
      const trucks = await fetchTruckRefs(rows.map((row) => row.truck_id));
      return rows.map((row) => ({
        ...row,
        truck: row.truck_id ? (trucks.get(row.truck_id) ?? null) : null,
      })) as unknown as ServiceItem[];
    },
  });
}

/** Fornecedores — seleção em formulários (id + nome). */
export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers-options"],
    queryFn: async (): Promise<SupplierName[]> => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as SupplierName[];
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

/** Despesas gerais sem qualquer vínculo financeiro com caminhão ou compra. */
export function useGeneralExpenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["general-expenses", "mobile-operational", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("general_expenses")
        .select(
          "id, description, category, amount, occurred_at, due_date, status, supplier, payment_method, notes, created_at",
        )
        .is("truck_id", null)
        .is("purchase_installment_id", null)
        .order("occurred_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as GeneralExpenseItem[];
    },
  });
}

/** Financas: snapshot do dashboard + itens financeiros essenciais. */
export function useMobileFinance() {
  const { roles, user } = useAuth();
  const canAccessFinance = isFinanceExecutive(roles, user?.email);
  return useQuery({
    queryKey: ["finance-mobile", "crm-parity-v2", canAccessFinance],
    enabled: canAccessFinance,
    queryFn: async () => {
      const snap = await fetchDashboardSnapshot();
      const kpis = computeExecutiveKpis(snap);
      return { snap, kpis };
    },
    staleTime: 30_000,
  });
}

function bankingRange(period: BankPeriod) {
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useBankingAccess() {
  const { roles, user } = useAuth();
  return canAccessBanking(roles, user?.email, user?.id);
}

export function useBankingData(filters: BankingFilters) {
  const canAccess = useBankingAccess();
  return useQuery({
    queryKey: ["banking-mobile", filters],
    enabled: canAccess,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const range = bankingRange(filters.period);
      const accountsQuery = supabase
        .from("bank_accounts")
        .select("id,name,bank,current_balance,active")
        .eq("active", true)
        .order("name", { ascending: true });

      let txQuery = supabase
        .from("bank_transactions")
        .select("*, bank_accounts!bank_transactions_bank_account_id_fkey(name, bank), financial_categories(name, kind)")
        .gte("occurred_at", range.from)
        .lte("occurred_at", range.to)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.accountId !== "all") txQuery = txQuery.eq("bank_account_id", filters.accountId);
      if (filters.type !== "all") txQuery = txQuery.eq("type", filters.type);

      const [accountsResult, txResult, categoriesResult] = await Promise.all([
        accountsQuery,
        txQuery,
        supabase.from("financial_categories").select("id,name,kind").order("name", { ascending: true }),
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (txResult.error) throw txResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      const transactions = (txResult.data ?? []) as unknown as BankingTransaction[];
      const accountTotals = new Map<string, { period_in: number; period_out: number; last_movement_at: string | null }>();
      for (const tx of transactions) {
        const current = accountTotals.get(tx.bank_account_id) ?? {
          period_in: 0,
          period_out: 0,
          last_movement_at: null,
        };
        if (tx.type === "entrada") current.period_in += Number(tx.amount ?? 0);
        if (tx.type === "saida") current.period_out += Number(tx.amount ?? 0);
        if (!current.last_movement_at || tx.occurred_at > current.last_movement_at) {
          current.last_movement_at = tx.occurred_at;
        }
        accountTotals.set(tx.bank_account_id, current);
      }

      const accounts = ((accountsResult.data ?? []) as Pick<Tables<"bank_accounts">, "id" | "name" | "bank" | "current_balance" | "active">[]).map(
        (account) => ({
          ...account,
          ...(accountTotals.get(account.id) ?? { period_in: 0, period_out: 0, last_movement_at: null }),
        }),
      );

      return {
        accounts,
        transactions,
        categories: categoriesResult.data ?? [],
        totals: transactions.reduce(
          (acc, tx) => {
            if (tx.type === "entrada") acc.in += Number(tx.amount ?? 0);
            if (tx.type === "saida") acc.out += Number(tx.amount ?? 0);
            return acc;
          },
          { in: 0, out: 0 },
        ),
      };
    },
  });
}

export function useCreateBankMovement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: BankMovementInput) => {
      const amount = parseMoney(input.amount);
      if (!input.bankAccountId) throw new Error("Escolha a conta bancária.");
      if (amount <= 0) throw new Error("Informe um valor maior que zero.");
      if (!input.occurredAt || Number.isNaN(new Date(input.occurredAt).getTime())) throw new Error("Informe uma data válida.");

      const { error } = await supabase.from("bank_transactions").insert({
        type: input.type,
        amount,
        bank_account_id: input.bankAccountId,
        category_id: input.categoryId || null,
        description: input.description?.trim() || null,
        source: input.type === "entrada" ? "entrada_manual" : "saida_manual",
        occurred_at: new Date(input.occurredAt).toISOString(),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      ["banking-mobile", "finance-mobile", "bank_transactions", "bank_accounts", "dashboard-snapshot"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      );
    },
  });
}

export function useCreateBankTransfer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: BankTransferInput) => {
      const amount = parseMoney(input.amount);
      if (!input.fromAccountId || !input.toAccountId) throw new Error("Escolha as duas contas.");
      if (input.fromAccountId === input.toAccountId) throw new Error("Escolha contas diferentes.");
      if (amount <= 0) throw new Error("Informe um valor maior que zero.");
      const occurredAt = new Date().toISOString();
      const description = input.description?.trim() || "Transferência entre contas";

      const { error: outError } = await supabase.from("bank_transactions").insert({
        type: "saida",
        amount,
        bank_account_id: input.fromAccountId,
        transfer_account_id: input.toAccountId,
        source: "transferencia",
        description: `Transferência - saída - ${description}`,
        occurred_at: occurredAt,
        created_by: user?.id ?? null,
      });
      if (outError) throw outError;

      const { error: inError } = await supabase.from("bank_transactions").insert({
        type: "entrada",
        amount,
        bank_account_id: input.toAccountId,
        transfer_account_id: input.fromAccountId,
        source: "transferencia",
        description: `Transferência - entrada - ${description}`,
        occurred_at: occurredAt,
        created_by: user?.id ?? null,
      });
      if (inError) throw inError;
    },
    onSuccess: () => {
      ["banking-mobile", "finance-mobile", "bank_transactions", "bank_accounts", "dashboard-snapshot"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      );
    },
  });
}

export function useAdjustBankBalance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: BankBalanceAdjustmentInput) => {
      const target = parseMoney(input.targetBalance);
      const current = Number(input.currentBalance ?? 0);
      const diff = target - current;
      if (!input.bankAccountId) throw new Error("Escolha a conta bancária.");
      if (!Number.isFinite(target)) throw new Error("Informe um saldo válido.");
      if (diff === 0) throw new Error("O saldo informado é igual ao saldo atual.");
      if (!input.notes.trim()) throw new Error("Informe o motivo do ajuste.");

      const { error } = await supabase.from("bank_transactions").insert({
        type: diff >= 0 ? "entrada" : "saida",
        amount: Math.abs(diff),
        bank_account_id: input.bankAccountId,
        source: "ajuste_manual",
        notes: input.notes.trim(),
        description: `Ajuste manual de saldo (de ${current.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para ${target.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      ["banking-mobile", "finance-mobile", "bank_transactions", "bank_accounts", "dashboard-snapshot"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      );
    },
  });
}

/** Itens de estoque de materiais (preço unitário apenas para o Executivo). */
export function useInventory() {
  const { roles, user } = useAuth();
  const isExec = isFinanceExecutive(roles, user?.email);
  return useQuery({
    queryKey: ["inventory-mobile", isExec],
    queryFn: async () => {
      if (isExec) {
        const { data, error } = await supabase
          .from("inventory_items")
          .select(
            "id, name, category, quantity, min_quantity, unit_price, unit, storage_location, supplier_name",
          )
          .order("name", { ascending: true })
          .limit(300);
        if (error) throw error;
        return (data ?? []) as InventoryItem[];
      }

      const { data, error } = await supabase
        .from("inventory_items_operational")
        .select(
          "id, name, category, quantity, min_quantity, unit, storage_location, supplier_name",
        )
        .order("name", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as InventoryItem[];
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
  const { roles, user } = useAuth();
  const isExec = isFinanceExecutive(roles, user?.email);
  return useQuery({
    queryKey: ["sold-trucks-mobile", isExec],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let sales: SoldTruck[];
      if (isExec) {
        const { data, error } = await supabase
          .from("trucks")
          .select(
            "id, brand, model, year, plate, sold_at, warranty_end, sold_customer_id, status, sold_price",
          )
          .eq("status", "vendido")
          .order("sold_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        sales = (data ?? []) as SoldTruck[];
      } else {
        sales = await fetchOperationalSoldTrucks();
      }
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
 * Tipos de notificação que NUNCA são financeiros, mesmo que o título/mensagem
 * citem termos como "pagamento". Mantém paridade com a Edge Function push-send.
 */
const EXPLICIT_NON_FINANCE_TYPES = new Set([
  "agenda",
  "manutencao",
  "vendas",
  "estoque",
  "clientes",
  "sistema",
]);

/**
 * Classifica uma notificação como financeira (deve aparecer apenas no módulo
 * Financeiro, que é exclusivo do Executivo).
 *
 * Mesma precedência usada pela Edge Function push-send (logic.ts):
 *   1. link do módulo financeiro -> financeira;
 *   2. type `financeiro`        -> financeira;
 *   3. type explícito não-financeiro (agenda/serviços/etc.) -> NÃO financeira,
 *      mesmo que o texto cite "pagamento";
 *   4. type/link desconhecidos  -> fallback conservador pelo texto.
 */
export function isFinancialNotification(n: {
  title?: string | null;
  message?: string | null;
  link?: string | null;
  type?: string | null;
}): boolean {
  if (typeof n.link === "string" && n.link.startsWith("/financeiro")) return true;
  const type = typeof n.type === "string" ? n.type.trim().toLowerCase() : "";
  if (type === "financeiro") return true;
  if (EXPLICIT_NON_FINANCE_TYPES.has(type)) return false;
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
  includeServices = true,
): Promise<GlobalSearchResults | null> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return { trucks: [], customers: [], services: [], hasQuery: true };
  const t = `%${term}%`;
  const [trucks, customers, servicesR] = await Promise.all([
    searchOperationalTrucks(t),
    supabase
      .from("customers")
      .select("id, name, phone, email, city, status, created_at")
      .or(`name.ilike.${t},phone.ilike.${t},email.ilike.${t},city.ilike.${t}`)
      .order("name", { ascending: true })
      .limit(15),
    includeServices
      ? supabase
          .from("services_operational")
          .select("id, truck_id, title, status, expected_at")
          .or(`title.ilike.${t},description.ilike.${t}`)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);
  if (customers.error) throw customers.error;
  if (servicesR.error) throw servicesR.error;
  const serviceRows = (servicesR.data ?? []) as Array<
    { id: string; title: string; status: string; expected_at: string | null; truck_id: string | null }
  >;
  const serviceTrucks = await fetchTruckRefs(serviceRows.map((row) => row.truck_id));
  return {
    trucks,
    customers: customers.data as CustomerItem[],
    services: serviceRows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      expected_at: row.expected_at,
      truck: row.truck_id ? (serviceTrucks.get(row.truck_id) ?? null) : null,
    })),
    hasQuery: true,
  };
}

/** Busca global com debounce interno (não dispara enquanto não digita). */
export function useGlobalSearch(q: string) {
  const { roles } = useAuth();
  const includeServices = canSeeServices(roles);
  return useQuery({
    queryKey: ["global-search", q, includeServices],
    queryFn: () => globalSearch(q, includeServices),
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
 *
 * Mesma definição do CRM desktop (Home exec / Relatórios → Estoque e
 * Compras, `truck-status.ts`): conta os 8 status em estoque, custo =
 * `purchase_price` + `expenses_total`.
 */
export function useCapitalImobilizado() {
  const { roles, user } = useAuth();
  const isExec = isFinanceExecutive(roles, user?.email);
  const inStockStatuses = [
    "disponivel",
    "consignado",
    "patio",
    "oficina",
    "pintura",
    "despachante",
    "reservado",
    "negociacao",
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
