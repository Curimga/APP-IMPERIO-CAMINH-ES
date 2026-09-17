// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory, createRouter, RouterProvider, type AnyRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "@/routeTree.gen";

const AVAILABLE_ID = "11111111-1111-4111-8111-111111111111";
const RESERVED_ID = "22222222-2222-4222-8222-222222222222";
const SOLD_ID = "33333333-3333-4333-8333-333333333333";

const trucks = [
  {
    id: AVAILABLE_ID,
    brand: "Volvo",
    model: "FH 540",
    year: 2024,
    plate: "AAA1A11",
    color: "Branco",
    status: "disponivel",
    status_started_at: null,
    status_expected_end: null,
    status_notes: null,
    status_supplier_id: null,
    supplier: null,
    origin: "compra",
    consigned: false,
    created_by: "user-1",
    created_at: "2026-09-01T10:00:00",
    updated_at: "2026-09-02T10:00:00",
    purchase_date: "2026-09-01",
    sold_at: null,
    warranty_end: null,
    sold_customer_id: null,
    chassis: "CHASSIS1",
    renavam: "RENAVAM1",
    mileage: 1000,
    fuel: "diesel",
    transmission: "manual",
    description: "Descrição do caminhão disponível",
    ai_description: null,
    purchase_price: 100000,
    purchase_payment_method: "pix",
    purchase_installments_count: 1,
    purchase_total_paid: 100000,
    purchase_total_pending: 0,
    expected_price: 150000,
    sold_price: null,
    sale_type: null,
    sale_notes: null,
    expenses_total: 5000,
    truck_photos: [],
  },
  {
    id: RESERVED_ID,
    brand: "Scania",
    model: "R450",
    year: 2023,
    plate: "BBB2B22",
    color: "Azul",
    status: "reservado",
    status_started_at: null,
    status_expected_end: null,
    status_notes: null,
    status_supplier_id: null,
    supplier: null,
    origin: "compra",
    consigned: false,
    created_by: "user-1",
    created_at: "2026-09-01T10:00:00",
    updated_at: "2026-09-02T10:00:00",
    purchase_date: "2026-09-01",
    sold_at: null,
    warranty_end: null,
    sold_customer_id: null,
    chassis: "CHASSIS2",
    renavam: "RENAVAM2",
    mileage: 2000,
    fuel: "diesel",
    transmission: "automatico",
    description: "Descrição reservado",
    ai_description: null,
    purchase_price: 120000,
    purchase_payment_method: "pix",
    purchase_installments_count: 1,
    purchase_total_paid: 120000,
    purchase_total_pending: 0,
    expected_price: 170000,
    sold_price: null,
    sale_type: null,
    sale_notes: null,
    expenses_total: 7000,
    truck_photos: [],
  },
  {
    id: SOLD_ID,
    brand: "Mercedes",
    model: "Actros",
    year: 2022,
    plate: "CCC3C33",
    color: "Prata",
    status: "vendido",
    status_started_at: null,
    status_expected_end: null,
    status_notes: null,
    status_supplier_id: null,
    supplier: null,
    origin: "compra",
    consigned: false,
    created_by: "user-1",
    created_at: "2026-09-01T10:00:00",
    updated_at: "2026-09-02T10:00:00",
    purchase_date: "2026-09-01",
    sold_at: "2026-09-10",
    warranty_end: "2026-12-10",
    sold_customer_id: "customer-1",
    chassis: "CHASSIS3",
    renavam: "RENAVAM3",
    mileage: 3000,
    fuel: "diesel",
    transmission: "automatico",
    description: "Descrição vendido",
    ai_description: null,
    purchase_price: 130000,
    purchase_payment_method: "pix",
    purchase_installments_count: 1,
    purchase_total_paid: 130000,
    purchase_total_pending: 0,
    expected_price: 190000,
    sold_price: 200000,
    sale_type: "pix",
    sale_notes: "Venda confirmada",
    expenses_total: 10000,
    truck_photos: [],
  },
];

function detailBundle(id: string) {
  const truck = trucks.find((t) => t.id === id) ?? null;
  return {
    truck,
    expenses: [],
    services: [],
    history: [],
    notes: [],
    truckDocuments: [],
    documents: [],
    documentUrls: new Map(),
    deals: truck?.status === "reservado" ? [{ id: "deal-1", truck_id: id, customer_id: "customer-1", stage: "negociacao", title: "Reserva", notes: null, value: 170000, priority: "media", owner_id: "user-1", occurred_at: null, created_at: "2026-09-01", updated_at: "2026-09-02" }] : [],
    dealEvents: [],
    customers: [{ id: "customer-1", name: "Cliente Teste", phone: "11999999999", email: null, city: "SP", document: "00000000000" }],
    profiles: new Map([["user-1", "Executivo Teste"]]),
    suppliers: new Map(),
    warranty: null,
    purchaseInstallments: [],
    payables: [],
    receivables: [],
  };
}

vi.mock("@/hooks/use-auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    loading: false,
    session: { user: { id: "user-1" } },
    user: { id: "user-1" },
    profile: { id: "user-1", full_name: "Executivo Teste", phone: null, avatar_url: null, status: "active" },
    roles: ["admin"],
    hasRole: () => true,
    refresh: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    from: vi.fn(),
    getChannels: vi.fn(() => []),
    removeChannel: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  },
}));

vi.mock("@/components/dashboard/use-realtime-sync", () => ({ useRealtimeSync: vi.fn() }));
vi.mock("@/components/notifications-bell", () => ({ NotificationsBell: () => null }));
vi.mock("@/lib/mobile/haptic", () => ({ haptic: vi.fn() }));
vi.mock("@/lib/mobile/recent", () => ({
  getFavTrucks: vi.fn(() => []),
  toggleFavTruck: vi.fn(() => false),
  notifyRecents: vi.fn(),
  pushRecentTruck: vi.fn(),
  isFavTruck: vi.fn(() => false),
}));

vi.mock("@/lib/mobile/queries", () => ({
  useTrucks: () => ({ data: trucks, isLoading: false, isError: false }),
  useSoldTrucks: () => ({
    data: { trucks: trucks.filter((t) => t.status === "vendido"), customerName: () => "Cliente Teste" },
    isLoading: false,
    isError: false,
  }),
  useTruckDetail: (id?: string) => ({ data: detailBundle(id ?? ""), isLoading: false, isError: false }),
  useNotifications: () => ({ data: { unread: 0, items: [] } }),
  useServices: () => ({ data: [] }),
  getTruckCoverPhoto: () => null,
  sortTruckPhotos: (photos: unknown[]) => photos,
  truckPhotoSrc: (url: string) => url,
  truckPhotoVersion: () => "v-test",
}));

function renderApp(initialPath = "/garagem") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [initialPath] }), context: { queryClient } });
  render(<RouterProvider router={router} />);
  return router;
}

async function expectTruckDetail(router: AnyRouter, pathname: string, plate: string) {
  await waitFor(() => expect(router.state.location.pathname).toBe(pathname));
  expect((await screen.findAllByText(plate)).length).toBeGreaterThan(0);
  expect(screen.getByText("Dados do veículo")).toBeInTheDocument();
  expect(screen.getByText("Sem fotos cadastradas")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ficha" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Financeiro" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Despesas" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Venda" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Serviços" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Histórico" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Docs" })).toBeInTheDocument();
}

describe("navegação real dos cards de caminhão", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("abre a ficha ao clicar no card da Garagem e mantém favorito sem navegar", async () => {
    const router = renderApp("/garagem");
    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: "Garagem" })).toBeInTheDocument();
    const volvoCard = screen.getByRole("link", { name: /abrir ficha de volvo fh 540 aaa1a11/i });
    await user.click(within(volvoCard).getByRole("button", { name: /adicionar aos favoritos/i }));
    expect(router.state.location.pathname).toBe("/garagem");

    await user.click(volvoCard);
    await expectTruckDetail(router, `/garagem/${AVAILABLE_ID}`, "AAA1A11");
  });

  it("abre a ficha ao clicar em uma linha do modo lista", async () => {
    const router = renderApp("/garagem");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Visualização em lista" }));
    await user.click(screen.getByRole("link", { name: /abrir ficha de scania r450 bbb2b22/i }));
    await expectTruckDetail(router, `/garagem/${RESERVED_ID}`, "BBB2B22");
  });

  it("abre a ficha ao clicar em Vendidos", async () => {
    const router = renderApp("/vendidos");
    const user = userEvent.setup();

    expect(await screen.findByText("Vendidos")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /abrir ficha de mercedes actros ccc3c33/i }));
    await expectTruckDetail(router, `/garagem/${SOLD_ID}`, "CCC3C33");
  });
});
