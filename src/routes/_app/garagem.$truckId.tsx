import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, CalendarDays, DollarSign, Wrench, Heart } from "lucide-react";
import { useTruck, sortTruckPhotos, truckPhotoSrc } from "@/lib/mobile/queries";
import type { TruckDetail, TruckPhoto, TruckWithPhotos } from "@/lib/mobile/queries";
import {
  MobileCard,
  SectionTitle,
  SkeletonRows,
  StatusBadge,
  EmptyState,
} from "@/components/mobile/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { STATUS_OPTIONS, STATUS_LABEL } from "@/lib/truck-status";
import type { TruckStatus } from "@/lib/truck-status";
import { brl, dateBR } from "@/lib/format";
import { mdDaysParked, mdRelative } from "@/lib/mobile/dates";
import { truckTitle } from "@/lib/truck-title";
import { setTruckStatus } from "@/lib/mobile/actions";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { canRegisterExpense, isFinanceExecutive } from "@/lib/mobile/perm";
import { toast } from "sonner";
import { pushRecentTruck, toggleFavTruck, isFavTruck, notifyRecents } from "@/lib/mobile/recent";
import { haptic } from "@/lib/mobile/haptic";

export const Route = createFileRoute("/_app/garagem/$truckId")({
  component: TruckDetail,
});

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right text-[14px]",
          strong ? "font-bold" : "font-medium",
          typeof value === "string" || typeof value === "number" ? "" : "",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatusSheet({
  open,
  onOpenChange,
  truck,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  truck: TruckDetail;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="px-5 pb-2 pt-4 text-left">
          <SheetTitle className="text-base">Alterar status</SheetTitle>
          <SheetDescription>Novo status operacional do caminhão.</SheetDescription>
        </SheetHeader>
        <div className="mt-2 grid grid-cols-2 gap-2 px-5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.v}
              type="button"
              disabled={saving}
              onClick={async () => {
                if (s.v === truck.status) {
                  onOpenChange(false);
                  return;
                }
                setSaving(true);
                try {
                  await setTruckStatus(truck.id, s.v as TruckStatus);
                  onOpenChange(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Falha ao atualizar status");
                } finally {
                  setSaving(false);
                }
              }}
              className={cn(
                "h-10 rounded-xl border px-3 text-sm font-semibold active:opacity-80",
                truck.status === s.v ? "border-gold bg-gold text-gold-foreground" : "bg-background",
              )}
            >
              {STATUS_LABEL[s.v] ?? s.v}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PhotoGallery({ photos, truck }: { photos: TruckPhoto[]; truck: TruckWithPhotos }) {
  const [idx, setIdx] = useState(0);
  // Ordenação determinística: a capa é sempre a primeira posição da galeria.
  const ordered = sortTruckPhotos(photos);
  if (!ordered.length) return null;
  const current = ordered[idx]?.url ?? ordered[0]?.url;
  return (
    <MobileCard className="overflow-hidden p-0">
      <img
        src={truckPhotoSrc(current, ordered[idx]?.created_at)}
        alt={truckTitle(truck)}
        className="aspect-[4/3] w-full bg-muted object-cover"
      />
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-muted-foreground">{truckTitle(truck)}</span>
        <span className="text-xs font-semibold tabular-nums">
          {idx + 1}/{ordered.length}
        </span>
      </div>
      {ordered.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-3">
          {ordered.map((p, i) => (
            <button
              key={`${truck.id}-${p.id}`}
              type="button"
              aria-label={`Foto ${i + 1}`}
              onClick={() => setIdx(i)}
              className={cn(
                "shrink-0 overflow-hidden rounded-lg border-2",
                i === idx ? "border-gold" : "border-transparent",
              )}
            >
              <img src={truckPhotoSrc(p.url, p.created_at)} alt="" className="h-14 w-14 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </MobileCard>
  );
}

function TruckDetail() {
  const { truckId } = Route.useParams();
  const nav = useNavigate();
  const { roles } = useAuth();
  const isExec = isFinanceExecutive(roles);
  const { data: truck, isLoading, isError } = useTruck(truckId);
  const [statusOpen, setStatusOpen] = useState(false);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!truck) return;
    pushRecentTruck({ id: truck.id, label: truckTitle(truck), plate: truck.plate });
    setFav(isFavTruck(truck.id));
  }, [truck]);

  if (isLoading || !truck) return <SkeletonRows rows={4} height={88} />;
  if (isError)
    return (
      <EmptyState
        title="Erro ao carregar caminhão"
        hint="Verifique sua conexão e tente novamente."
        onAction={() => nav({ to: "/garagem" })}
        actionLabel="Voltar à garagem"
      />
    );

  const photos = truck.truck_photos ?? [];
  const expenses = truck.truck_expenses ?? [];
  const expensesTotal = Number(truck.expenses_total ?? 0);
  const invested = Number(truck.purchase_price ?? 0) + expensesTotal;
  const days = mdDaysParked(truck.purchase_date ?? truck.created_at);

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => (history.length > 1 ? history.back() : nav({ to: "/garagem" }))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold leading-tight">{truckTitle(truck)}</h1>
          <div className="text-[13px] text-muted-foreground">{truck.plate ?? "sem placa"}</div>
        </div>
        <button
          type="button"
          aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={() => {
            haptic(8);
            setFav(toggleFavTruck({ id: truck.id, label: truckTitle(truck), plate: truck.plate }));
            notifyRecents();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card pressable active:scale-95"
        >
          <Heart className={cn("h-5 w-5", fav ? "fill-destructive text-destructive" : "text-muted-foreground")} />
        </button>
        <StatusBadge status={truck.status} />
      </div>

      <PhotoGallery photos={photos} truck={truck} />

      {/* Status e localização */}
      <MobileCard className="p-3">
        <SectionTitle className="mb-1">Status e localização</SectionTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px]">
            <MapPin className="h-4 w-4 text-gold" />
            <span className="font-semibold">{STATUS_LABEL[truck.status] ?? truck.status}</span>
            {truck.status_started_at ? (
              <span className="text-xs text-muted-foreground">
                desde {dateBR(truck.status_started_at)}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setStatusOpen(true)}
            className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-gold-foreground active:opacity-80"
          >
            Alterar
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span>Parado há {days} dias</span>
          {truck.status_expected_end ? (
            <span className="font-semibold text-gold">
              Retorno {dateBR(truck.status_expected_end)} · {mdRelative(truck.status_expected_end)}
            </span>
          ) : null}
        </div>
      </MobileCard>

      {/* Informações gerais */}
      <MobileCard className="p-3">
        <SectionTitle className="mb-1">Informações gerais</SectionTitle>
        <div className="divide-y divide-border/60">
          <DetailRow label="Ano" value={truck.year ?? "—"} />
          <DetailRow label="Cor" value={truck.color ?? "—"} />
          <DetailRow label="Chassi" value={truck.chassis ?? "—"} />
          <DetailRow label="Renavam" value={truck.renavam ?? "—"} />
          <DetailRow
            label="Quilometragem"
            value={
              truck.mileage != null ? `${Number(truck.mileage).toLocaleString("pt-BR")} km` : "—"
            }
          />
          <DetailRow label="Combustível" value={truck.fuel ?? "—"} />
          <DetailRow label="Transmissão" value={truck.transmission ?? "—"} />
          <DetailRow label="Fornecedor" value={truck.supplier ?? "—"} />
        </div>
      </MobileCard>

      {/* Aquisição — Executivo */}
      {isExec && (truck.purchase_price != null || truck.purchase_date) && (
        <MobileCard className="p-3">
          <SectionTitle className="mb-1">Aquisição</SectionTitle>
          <div className="divide-y divide-border/60">
            <DetailRow label="Data" value={dateBR(truck.purchase_date)} />
            <DetailRow label="Preço de compra" value={brl(truck.purchase_price)} strong />
            <DetailRow label="Forma de pagamento" value={truck.purchase_payment_method ?? "—"} />
          </div>
        </MobileCard>
      )}

      {/* Estimativa de venda — Executivo */}
      {isExec && (truck.expected_price != null || truck.sold_price != null) && (
        <MobileCard className="p-3">
          <SectionTitle className="mb-1">Venda</SectionTitle>
          <div className="divide-y divide-border/60">
            {truck.status === "vendido" ? (
              <DetailRow label="Preço de venda" value={brl(truck.sold_price)} strong />
            ) : (
              <DetailRow label="Estimativa" value={brl(truck.expected_price)} strong />
            )}
            <DetailRow label="Investido (compra + despesas)" value={brl(invested)} />
            {Number(truck.expected_price ?? 0) > 0 ? (
              <DetailRow
                label="Margem esperada"
                value={brl(Number(truck.expected_price ?? 0) - invested)}
                strong
              />
            ) : null}
          </div>
        </MobileCard>
      )}

      {/* Despesas — Executivo */}
      {isExec && (
        <MobileCard className="p-3">
          <div className="flex items-center justify-between">
            <SectionTitle className="mb-1">Despesas</SectionTitle>
            {canRegisterExpense(roles) ? (
              <Link
                to="/garagem/$truckId/despesa"
                params={{ truckId: truck.id }}
                className="text-xs font-bold text-gold"
              >
                registrar
              </Link>
            ) : null}
          </div>
          {expenses.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Nenhuma despesa registrada.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {expenses.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center gap-2 py-2">
                  <DollarSign className="h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{e.description || e.kind}</div>
                    <div className="text-xs text-muted-foreground">{dateBR(e.occurred_at)}</div>
                  </div>
                  <span className="shrink-0 text-[14px] font-bold tabular-nums">{brl(e.amount)}</span>
                </div>
              ))}
              {expenses.length > 6 ? (
                <div className="pt-1 text-center text-xs text-muted-foreground">
                  + {expenses.length - 6} despesas
                </div>
              ) : null}
            </div>
          )}
        </MobileCard>
      )}

      {/* Descrição do site */}
      {truck.description ? (
        <MobileCard className="p-3">
          <SectionTitle className="mb-1">Descrição Site Império</SectionTitle>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">
            {truck.description}
          </p>
        </MobileCard>
      ) : null}

      {/* Ações */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/servicos"
          search={{ truck_id: truck.id }}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-bold active:bg-muted/60"
        >
          <Wrench className="h-4 w-4" /> Criar serviço
        </Link>
        <Link
          to="/agenda/novo"
          search={{ truck_id: truck.id, date: undefined, edit: undefined }}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-bold active:bg-muted/60"
        >
          <CalendarDays className="h-4 w-4" /> Compromisso
        </Link>
      </div>

      <StatusSheet open={statusOpen} onOpenChange={setStatusOpen} truck={truck} />
    </>
  );
}
