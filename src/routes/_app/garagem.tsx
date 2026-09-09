import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { useTrucks, getTruckCover } from "@/lib/mobile/queries";
import type { TruckWithPhotos } from "@/lib/mobile/queries";
import {
  MobileCard,
  SectionTitle,
  SkeletonRows,
  EmptyState,
  inputClass,
  StatusBadge,
} from "@/components/mobile/ui";
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

export const Route = createFileRoute("/_app/garagem")({
  component: Garagem,
});

type Filter = "todos" | string;

function TruckCard({ t }: { t: TruckWithPhotos }) {
  const cover = getTruckCover(t);
  const days = mdDaysParked(t.purchase_date ?? t.created_at);
  return (
    <Link to="/garagem/$truckId" params={{ truckId: t.id }} className="block active:opacity-90">
      <MobileCard className="overflow-hidden p-0">
        <div className="flex gap-3 p-3">
          {cover ? (
            <img
              src={cover}
              alt={truckTitle(t)}
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-xl object-cover bg-muted"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-sidebar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
                sem foto
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-[15px] font-bold leading-tight">{truckTitle(t)}</h3>
              <StatusBadge status={t.status} className="shrink-0" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide text-foreground/80">
                {t.plate ?? "—"}
              </span>
              <span>{t.year ?? ""}</span>
              <span>{t.color ?? ""}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
              <span className="text-muted-foreground">Parado há {days} d</span>
              {t.status_expected_end ? (
                <span className="font-semibold text-gold">
                  Retorno {dateBR(t.status_expected_end)}
                </span>
              ) : null}
              {Number(t.expected_price ?? 0) > 0 ? (
                <span className="font-bold tabular-nums">{brl(t.expected_price)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </MobileCard>
    </Link>
  );
}

function Garagem() {
  const { data, isLoading, isError } = useTrucks();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [openFilter, setOpenFilter] = useState(false);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter !== "todos") list = list.filter((t) => t.status === filter);
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
  }, [data, q, filter]);

  const activeFilters = filter !== "todos" ? 1 : 0;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Garagem</h1>
        <Link
          to="/garagem/novo"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-3 text-sm font-bold text-gold-foreground active:opacity-80"
        >
          <Plus className="h-4 w-4" /> Novo
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar placa, marca, modelo..."
            aria-label="Buscar caminhão"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpenFilter(true)}
          aria-label="Filtrar por status"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeFilters > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

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
                setFilter("todos");
                setOpenFilter(false);
              }}
              className={cn(
                "h-10 rounded-xl border text-sm font-semibold",
                filter === "todos" ? "border-gold bg-gold text-gold-foreground" : "bg-background",
              )}
            >
              Todos
            </button>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => {
                  setFilter(s.v);
                  setOpenFilter(false);
                }}
                className={cn(
                  "h-10 rounded-xl border px-3 text-sm font-semibold",
                  filter === s.v ? "border-gold bg-gold text-gold-foreground" : "bg-background",
                )}
              >
                {STATUS_LABEL[s.v] ?? s.v}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {isLoading ? (
        <SkeletonRows rows={6} height={104} />
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
            setFilter("todos");
          }}
          actionLabel="Limpar filtros"
        />
      ) : (
        <div className="space-y-2">
          <SectionTitle>
            {filtered.length} {filtered.length === 1 ? "caminhão" : "caminhões"}
          </SectionTitle>
          {filtered.map((t) => (
            <TruckCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </>
  );
}
