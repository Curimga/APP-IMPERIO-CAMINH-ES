import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Plus, Truck, Heart, LayoutGrid, Rows2 } from "lucide-react";
import { useTrucks, getTruckCoverPhoto, truckPhotoSrc, truckPhotoVersion } from "@/lib/mobile/queries";
import type { TruckWithPhotos } from "@/lib/mobile/queries";
import { MobileCard, SkeletonRows, EmptyState, StatusBadge } from "@/components/mobile/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { STATUS_OPTIONS, STATUS_LABEL } from "@/lib/truck-status";
import { brl, dateBR } from "@/lib/format";
import { mdDaysParked } from "@/lib/mobile/dates";
import { truckTitle } from "@/lib/truck-title";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/mobile/haptic";
import {
  getFavTrucks,
  toggleFavTruck,
  notifyRecents,
} from "@/lib/mobile/recent";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isFinanceExecutive } from "@/lib/mobile/perm";

export const Route = createFileRoute("/_app/garagem")({
  component: Garagem,
});

const FILTER_KEY = "imperio:garagem-filtro";
type Filter = "todos" | string;
type View = "cards" | "list";
const STOCK_FILTER_STATUSES = new Set(["disponivel", "consignado"]);
const SERVICE_FILTER_STATUSES = new Set(["oficina", "pintura", "interna", "despachante", "manutencao"]);

function readSavedFilter(): Filter {
  try {
    return localStorage.getItem(FILTER_KEY) ?? "todos";
  } catch {
    return "todos";
  }
}

function useOpenTruck(truckId: string) {
  const navigate = useNavigate();
  return () => {
    haptic(5);
    navigate({ to: "/garagem/$truckId", params: { truckId } });
  };
}

function onLinkKeyDown(event: KeyboardEvent<HTMLElement>, openTruck: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openTruck();
  }
}

function stopCardNavigation(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function TruckCard({ t, favIds, isExec }: { t: TruckWithPhotos; favIds: Set<string>; isExec: boolean }) {
  const qc = useQueryClient();
  const openTruck = useOpenTruck(t.id);
  const cover = getTruckCoverPhoto(t);
  const days = mdDaysParked(t.purchase_date ?? t.created_at);
  const fav = favIds.has(t.id);
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openTruck}
      onKeyDown={(event) => onLinkKeyDown(event, openTruck)}
      className="block cursor-pointer active:opacity-95"
      aria-label={`Abrir ficha de ${truckTitle(t)} ${t.plate ?? ""}`.trim()}
    >
      <MobileCard className="overflow-hidden p-0">
        <div className="relative h-40 bg-muted">
          {cover ? (
            <img
              key={`${t.id}-${cover.id}`}
              src={truckPhotoSrc(cover.url, truckPhotoVersion(cover, t.updated_at ?? t.created_at))}
              alt={truckTitle(t)}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="gradient-dark absolute inset-0 flex items-center justify-center">
              <Truck className="h-10 w-10 text-sidebar-foreground/30" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute left-3 top-3">
            <StatusBadge status={t.status} />
          </div>
          <button
            type="button"
            onClick={(e) => {
              stopCardNavigation(e);
              haptic(8);
              toggleFavTruck({ id: t.id, label: truckTitle(t), plate: t.plate });
              qc.setQueryData(["garagem-favs"], getFavTrucks());
              notifyRecents();
            }}
            aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur pressable active:scale-95"
          >
            <Heart
              className={cn("h-4 w-4", fav ? "fill-destructive text-destructive" : "text-white")}
            />
          </button>
          <div className="absolute inset-x-3 bottom-2 flex items-end justify-between gap-2">
            <span className="truncate text-sm font-bold uppercase tracking-wide text-white">
              {t.plate ?? "sem placa"}
            </span>
            {isExec && Number(t.expected_price ?? 0) > 0 ? (
              <span className="shrink-0 rounded-md bg-black/55 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-gold">
                {brl(t.expected_price)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-bold leading-tight">{truckTitle(t)}</h3>
            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
              parado há {days} d
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
            <span>{t.year ?? ""}</span>
            {t.color ? <span>· {t.color}</span> : null}
            {t.status_expected_end ? (
              <span className="font-semibold text-gold-dark">retorno {dateBR(t.status_expected_end)}</span>
            ) : null}
          </div>
        </div>
      </MobileCard>
    </div>
  );
}

function TruckRow({ t, favIds, isExec }: { t: TruckWithPhotos; favIds: Set<string>; isExec: boolean }) {
  const qc = useQueryClient();
  const openTruck = useOpenTruck(t.id);
  const cover = getTruckCoverPhoto(t);
  const fav = favIds.has(t.id);
  const days = mdDaysParked(t.purchase_date ?? t.created_at);
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openTruck}
      onKeyDown={(event) => onLinkKeyDown(event, openTruck)}
      className="block cursor-pointer active:opacity-95"
      aria-label={`Abrir ficha de ${truckTitle(t)} ${t.plate ?? ""}`.trim()}
    >
      <MobileCard className="p-2">
        <div className="flex items-center gap-3">
          {cover ? (
            <img
              key={`${t.id}-${cover.id}`}
              src={truckPhotoSrc(cover.url, truckPhotoVersion(cover, t.updated_at ?? t.created_at))}
              alt={truckTitle(t)}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-xl object-cover bg-muted"
            />
          ) : (
            <div className="gradient-dark flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
              <Truck className="h-5 w-5 text-sidebar-foreground/40" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold leading-tight">{truckTitle(t)}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase">{t.plate ?? "—"}</span>
              <span>parado há {days} d</span>
              {isExec && Number(t.expected_price ?? 0) > 0 ? (
                <span className="font-bold tabular-nums text-gold-dark">{brl(t.expected_price)}</span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge status={t.status} />
            <button
            type="button"
            onClick={(e) => {
                stopCardNavigation(e);
                haptic(8);
                toggleFavTruck({ id: t.id, label: truckTitle(t), plate: t.plate });
                qc.setQueryData(["garagem-favs"], getFavTrucks());
                notifyRecents();
              }}
              aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              className="pressable"
            >
              <Heart className={cn("h-4 w-4", fav ? "fill-destructive text-destructive" : "text-muted-foreground")} />
            </button>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}

function FavoriteTruckCard({ t }: { t: TruckWithPhotos }) {
  const openTruck = useOpenTruck(t.id);
  const cover = getTruckCoverPhoto(t);
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openTruck}
      onKeyDown={(event) => onLinkKeyDown(event, openTruck)}
      className="w-32 shrink-0 cursor-pointer"
      aria-label={`Abrir ficha de ${truckTitle(t)} ${t.plate ?? ""}`.trim()}
    >
      <MobileCard className="overflow-hidden p-0 active:opacity-95">
        {cover ? (
          <img
            key={`${t.id}-${cover.id}`}
            src={truckPhotoSrc(cover.url, truckPhotoVersion(cover, t.updated_at ?? t.created_at))}
            alt={truckTitle(t)}
            loading="lazy"
            className="h-20 w-full object-cover"
          />
        ) : (
          <div className="gradient-dark flex h-20 w-full items-center justify-center">
            <Truck className="h-6 w-6 text-sidebar-foreground/30" />
          </div>
        )}
        <div className="truncate px-2 py-1.5 text-[11px] font-bold">{truckTitle(t)}</div>
      </MobileCard>
    </div>
  );
}

function Garagem() {
  const location = useLocation();
  const { roles, user } = useAuth();
  const isExec = isFinanceExecutive(roles, user?.email);
  const { data, isLoading, isError } = useTrucks();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(readSavedFilter);
  const [view, setView] = useState<View>("cards");
  const [openFilter, setOpenFilter] = useState(false);
  const [favIds, setFavIds] = useState<Set<string>>(() => new Set(getFavTrucks().map((f) => f.id)));

  const trucks = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const t of trucks) c.set(t.status, (c.get(t.status) ?? 0) + 1);
    return c;
  }, [trucks]);

  useEffect(() => {
    const onRec = () => setFavIds(new Set(getFavTrucks().map((f) => f.id)));
    window.addEventListener("imperio:recents-changed", onRec);
    return () => window.removeEventListener("imperio:recents-changed", onRec);
  }, []);

  const setAndSave = (f: Filter) => {
    setFilter(f);
    try {
      localStorage.setItem(FILTER_KEY, f);
    } catch {
      /* ignora */
    }
  };

  const filtered = useMemo(() => {
    let list = trucks;
    if (filter === "estoque") list = list.filter((t) => STOCK_FILTER_STATUSES.has(t.status));
    else if (filter === "servico") list = list.filter((t) => SERVICE_FILTER_STATUSES.has(t.status));
    else if (filter !== "todos") list = list.filter((t) => t.status === filter);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((x) =>
        [x.brand, x.model, x.year, x.plate, x.color]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(t),
      );
    }
    return list;
  }, [trucks, q, filter]);

  const QuickChips = () => {
    return (
      <div className="h-row -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1" data-no-pull>
        {([["todos", "Todos"], ["disponivel", "Disponíveis"], ["reservado", "Reservados"], ["vendido", "Vendidos"], ["manutencao", "Manutenção"], ["oficina", "Oficina"]] as const).map(
          ([v, label]) => {
            const n = v === "todos" ? trucks.length : counts.get(v) ?? 0;
            return (
              <button
                key={v}
                type="button"
                onClick={() => {
                  haptic(6);
                  setAndSave(v);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold tap-gold pressable",
                  filter === v
                    ? "border-gold bg-gold text-gold-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {label}
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                    filter === v ? "bg-black/15 text-current" : "bg-muted text-muted-foreground",
                  )}
                >
                  {n}
                </span>
              </button>
            );
          },
        )}
      </div>
    );
  };

  const favorites = getFavTrucks();
  const favTrucks = trucks.filter((t) => favorites.some((f) => f.id === t.id));

  if (location.pathname !== "/garagem") {
    return <Outlet />;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Garagem</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-surface-secondary p-0.5">
            <button
              type="button"
              onClick={() => setView("cards")}
              aria-label="Visualização em cartões"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md",
                view === "cards" ? "bg-card shadow-sm text-gold-dark" : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="Visualização em lista"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md",
                view === "list" ? "bg-card shadow-sm text-gold-dark" : "text-muted-foreground",
              )}
            >
              <Rows2 className="h-4 w-4" />
            </button>
          </div>
          <Link
            to="/garagem/novo"
            aria-label="Cadastrar caminhão"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-3 text-sm font-bold text-gold-foreground pressable active:scale-95"
          >
            <Plus className="h-4 w-4" /> Novo
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar placa, marca, modelo..."
            aria-label="Buscar caminhão"
            className="h-11 w-full rounded-xl border bg-card pl-9 pr-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-gold/70 placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpenFilter(true)}
          aria-label="Filtrar por status"
          className="flex h-11 w-11 items-center justify-center rounded-xl border bg-card pressable active:scale-95"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      <QuickChips />

      {favTrucks.length > 0 && (
        <section>
          <h2 className="px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">
            Favoritos
          </h2>
          <div className="h-row -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {favTrucks.map((t) => <FavoriteTruckCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

      <Sheet open={openFilter} onOpenChange={setOpenFilter}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetHeader className="px-5 pb-2 pt-4 text-left">
            <SheetTitle className="text-base">Filtrar por status</SheetTitle>
            <SheetDescription>Status operacional dos caminhões.</SheetDescription>
          </SheetHeader>
          <div className="mt-2 grid grid-cols-2 gap-2 px-5">
            <button
              type="button"
              onClick={() => {
                setAndSave("todos");
                setOpenFilter(false);
              }}
              className={cn(
                "h-10 rounded-xl border text-sm font-semibold",
                filter === "todos" ? "border-gold bg-gold text-gold-foreground" : "bg-card",
              )}
            >
              Todos
            </button>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => {
                  setAndSave(s.v);
                  setOpenFilter(false);
                }}
                className={cn(
                  "h-10 rounded-xl border px-3 text-sm font-semibold",
                  filter === s.v ? "border-gold bg-gold text-gold-foreground" : "bg-card",
                )}
              >
                {STATUS_LABEL[s.v] ?? s.v}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {isLoading ? (
        <SkeletonRows rows={6} height={view === "cards" ? 240 : 72} />
      ) : isError ? (
        <EmptyState
          title="Erro ao carregar a garagem"
          hint="Verifique sua conexão e tente novamente."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum caminhão encontrado"
          hint="Ajuste a busca ou o filtro."
          onAction={() => {
            setQ("");
            setAndSave("todos");
          }}
          actionLabel="Limpar filtros"
        />
      ) : (
        <div className={cn("space-y-2", view === "cards" && "space-y-3")}>
          <p className="px-1 text-[12px] font-medium text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "caminhão" : "caminhões"}
          </p>
          {view === "cards" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((t) => (
                <TruckCard key={t.id} t={t} favIds={favIds} isExec={isExec} />
              ))}
            </div>
          ) : (
            filtered.map((t) => <TruckRow key={t.id} t={t} favIds={favIds} isExec={isExec} />)
          )}
        </div>
      )}
    </>
  );
}
