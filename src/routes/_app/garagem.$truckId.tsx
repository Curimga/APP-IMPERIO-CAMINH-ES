import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  ArrowLeft,
  CalendarDays,
  DollarSign,
  FileText,
  Heart,
  ImageIcon,
  Lock,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  sortTruckPhotos,
  truckPhotoSrc,
  truckPhotoVersion,
  useTruckDetail,
} from "@/lib/mobile/queries";
import type { TruckPhoto, TruckWithPhotos } from "@/lib/mobile/queries";
import { MobileCard, SectionTitle, SkeletonRows, StatusBadge, EmptyState } from "@/components/mobile/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { STATUS_OPTIONS, STATUS_LABEL } from "@/lib/truck-status";
import type { TruckStatus } from "@/lib/truck-status";
import { brl, dateBR } from "@/lib/format";
import { mdDaysParked, mdRelative } from "@/lib/mobile/dates";
import { truckTitle } from "@/lib/truck-title";
import { setTruckStatus } from "@/lib/mobile/actions";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { canRegisterExpense } from "@/lib/mobile/perm";
import {
  expenseKindLabel,
  maySeeCpfCnpj,
  maySeeTruckFinance,
  mergeTruckExpenses,
  normalizeTruckIdParam,
  resolveTruckSale,
  truckDocumentsList,
  truckExpenseSummary,
  truckFinanceSnapshot,
  truckIndicator,
} from "@/lib/mobile/truck-detail";
import { toast } from "sonner";
import { haptic } from "@/lib/mobile/haptic";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";
import { isFavTruck, notifyRecents, pushRecentTruck, toggleFavTruck } from "@/lib/mobile/recent";

export const Route = createFileRoute("/_app/garagem/$truckId")({
  component: TruckDetail,
});

type TabKey = "ficha" | "financeiro" | "despesas" | "venda" | "servicos" | "historico" | "documentos";

function DetailRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("max-w-[60%] text-right text-[14px]", strong ? "font-bold" : "font-medium")}>{value}</span>
    </div>
  );
}

function MiniPill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "gold" | "success" | "danger" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold",
        tone === "gold" && "bg-gold/15 text-gold",
        tone === "success" && "bg-success/15 text-success",
        tone === "danger" && "bg-destructive/15 text-destructive",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-3 text-[13px] text-muted-foreground">{text}</p>;
}

function profileName(map: Map<string, string>, id: string | null | undefined) {
  return id ? (map.get(id) ?? "—") : "—";
}

function supplierName(map: Map<string, string>, id: string | null | undefined, fallback?: string | null) {
  return id ? (map.get(id) ?? fallback ?? "—") : fallback ?? "—";
}

function km(value: number | null | undefined) {
  return value != null ? `${Number(value).toLocaleString("pt-BR")} km` : "—";
}

function StatusSheet({ open, onOpenChange, truck }: { open: boolean; onOpenChange: (v: boolean) => void; truck: TruckWithPhotos }) {
  const [saving, setSaving] = useState(false);
  const invalidateMobile = useInvalidateMobile();
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
                  invalidateMobile(["trucks"]);
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
  const [open, setOpen] = useState(false);
  const ordered = sortTruckPhotos(photos);
  if (!ordered.length) {
    return (
      <MobileCard className="flex aspect-[4/3] items-center justify-center p-0 text-muted-foreground">
        <div className="text-center text-sm">
          <ImageIcon className="mx-auto mb-2 h-8 w-8" />
          Sem fotos cadastradas
        </div>
      </MobileCard>
    );
  }
  const current = ordered[idx] ?? ordered[0];
  const version = truck.updated_at ?? truck.created_at;
  return (
    <>
      <MobileCard className="overflow-hidden p-0">
        <button type="button" className="block w-full" onClick={() => setOpen(true)}>
          <img
            key={`${truck.id}-${current.id}`}
            src={truckPhotoSrc(current.url, truckPhotoVersion(current, version))}
            alt={truckTitle(truck)}
            className="aspect-[4/3] w-full bg-muted object-cover"
          />
        </button>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">Toque para ampliar</span>
          <span className="text-xs font-semibold tabular-nums">{idx + 1}/{ordered.length}</span>
        </div>
        {ordered.length > 1 ? (
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-3">
            {ordered.map((p, i) => (
              <button
                key={`${truck.id}-${p.id}`}
                type="button"
                aria-label={`Foto ${i + 1}`}
                onClick={() => setIdx(i)}
                className={cn("shrink-0 overflow-hidden rounded-lg border-2", i === idx ? "border-gold" : "border-transparent")}
              >
                <img src={truckPhotoSrc(p.url, truckPhotoVersion(p, version))} alt="" className="h-14 w-14 object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
      </MobileCard>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-dvh rounded-none bg-black p-0 text-white sm:max-w-none">
          <SheetHeader className="sr-only">
            <SheetTitle>Fotos do caminhão</SheetTitle>
            <SheetDescription>Visualizador em tela cheia</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col justify-center gap-4 px-2 py-10">
            <img src={truckPhotoSrc(current.url, truckPhotoVersion(current, version))} alt={truckTitle(truck)} className="max-h-[78dvh] w-full object-contain" />
            <div className="flex items-center justify-center gap-3 text-sm font-semibold">
              <button type="button" className="rounded-full bg-white/15 px-4 py-2" onClick={() => setIdx((idx - 1 + ordered.length) % ordered.length)}>
                Anterior
              </button>
              <span className="tabular-nums">{idx + 1}/{ordered.length}</span>
              <button type="button" className="rounded-full bg-white/15 px-4 py-2" onClick={() => setIdx((idx + 1) % ordered.length)}>
                Próxima
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TruckDetail() {
  const { truckId: rawTruckId } = Route.useParams();
  const truckId = normalizeTruckIdParam(rawTruckId);
  const nav = useNavigate();
  const { roles } = useAuth();
  const isExec = maySeeTruckFinance(roles);
  const canSeeDocNumber = maySeeCpfCnpj(roles);
  const { data, isLoading, isError } = useTruckDetail(truckId ?? undefined);
  const [statusOpen, setStatusOpen] = useState(false);
  const [fav, setFav] = useState(false);
  const [tab, setTab] = useState<TabKey>("ficha");

  const truck = data?.truck ?? null;
  const tabs = useMemo(
    () => [
      { key: "ficha" as const, label: "Ficha" },
      ...(isExec ? [{ key: "financeiro" as const, label: "Financeiro" }, { key: "despesas" as const, label: "Despesas" }] : []),
      { key: "venda" as const, label: "Venda" },
      { key: "servicos" as const, label: "Serviços" },
      { key: "historico" as const, label: "Histórico" },
      { key: "documentos" as const, label: "Docs" },
    ],
    [isExec],
  );

  useEffect(() => {
    if (!tabs.some((t) => t.key === tab)) setTab("ficha");
  }, [tab, tabs]);

  useEffect(() => {
    if (!truck) return;
    pushRecentTruck({ id: truck.id, label: truckTitle(truck), plate: truck.plate });
    setFav(isFavTruck(truck.id));
  }, [truck]);

  if (!truckId) {
    return <EmptyState title="Caminhão inválido" hint="A ficha precisa ser aberta pelo ID real do caminhão." onAction={() => nav({ to: "/garagem" })} actionLabel="Voltar" />;
  }
  if (isLoading) return <SkeletonRows rows={5} height={88} />;
  if (isError) return <EmptyState title="Erro ao carregar caminhão" hint="Verifique sua conexão e tente novamente." onAction={() => nav({ to: "/garagem" })} actionLabel="Voltar à garagem" />;
  if (!truck || !data) return <EmptyState title="Caminhão não encontrado" hint="Este ID não retornou nenhum veículo." onAction={() => nav({ to: "/garagem" })} actionLabel="Voltar à garagem" />;

  const indicator = truckIndicator(truck.status);
  const days = mdDaysParked(truck.purchase_date ?? truck.created_at);
  const finance = truckFinanceSnapshot(truck);
  const expenseLines = mergeTruckExpenses(data.expenses, data.generalExpenses);
  const expenseSummary = truckExpenseSummary(expenseLines);
  const sale = resolveTruckSale({ truckId: truck.id, truck, deals: data.deals, customers: data.customers });
  const docs = truckDocumentsList({ truckDocuments: data.truckDocuments, documents: data.documents });
  const warranty = data.warranty;

  return (
    <>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Voltar" onClick={() => (history.length > 1 ? history.back() : nav({ to: "/garagem" }))} className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold leading-tight">{truckTitle(truck)}</h1>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span>{truck.plate ?? "sem placa"}</span>
            {indicator ? <MiniPill tone={indicator === "Vendido" ? "success" : indicator === "Reservado" ? "gold" : "muted"}>{indicator}</MiniPill> : null}
          </div>
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

      <PhotoGallery photos={truck.truck_photos ?? []} truck={truck} />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("shrink-0 rounded-full border px-3 py-2 text-xs font-bold", tab === t.key ? "border-gold bg-gold text-gold-foreground" : "bg-card text-muted-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ficha" ? (
        <>
          <MobileCard className="p-3">
            <div className="flex items-center justify-between">
              <SectionTitle className="mb-1">Status e estoque</SectionTitle>
              <button type="button" onClick={() => setStatusOpen(true)} className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-gold-foreground active:opacity-80">
                Alterar
              </button>
            </div>
            <div className="divide-y divide-border/60">
              <DetailRow label="Situação" value={STATUS_LABEL[truck.status] ?? truck.status} strong />
              <DetailRow label="Desde" value={dateBR(truck.status_started_at)} />
              <DetailRow label="Previsão de retorno" value={truck.status_expected_end ? `${dateBR(truck.status_expected_end)} · ${mdRelative(truck.status_expected_end)}` : "—"} />
              <DetailRow label="Tempo em estoque" value={`${days} dias`} />
              <DetailRow label="Fornecedor/status" value={supplierName(data.suppliers, truck.status_supplier_id, truck.supplier)} />
            </div>
            {truck.status_notes ? <p className="mt-2 rounded-xl bg-muted p-3 text-[13px] text-muted-foreground">{truck.status_notes}</p> : null}
          </MobileCard>

          <MobileCard className="p-3">
            <SectionTitle className="mb-1">Dados do veículo</SectionTitle>
            <div className="divide-y divide-border/60">
              <DetailRow label="Marca" value={truck.brand} />
              <DetailRow label="Modelo" value={truck.model} />
              <DetailRow label="Ano" value={truck.year ?? "—"} />
              <DetailRow label="Cor" value={truck.color ?? "—"} />
              <DetailRow label="Placa" value={truck.plate ?? "—"} />
              <DetailRow label="Chassi" value={truck.chassis ?? "—"} />
              <DetailRow label="Renavam" value={truck.renavam ?? "—"} />
              <DetailRow label="Quilometragem" value={km(truck.mileage)} />
              <DetailRow label="Combustível" value={truck.fuel ?? "—"} />
              <DetailRow label="Transmissão" value={truck.transmission ?? "—"} />
              <DetailRow label="Origem" value={truck.origin ?? "—"} />
              <DetailRow label="Consignado" value={truck.consigned ? "Sim" : "Não"} />
              <DetailRow label="Entrada" value={dateBR(truck.purchase_date ?? truck.created_at)} />
              <DetailRow label="Responsável" value={profileName(data.profiles, truck.created_by)} />
            </div>
          </MobileCard>

          {(truck.description || truck.ai_description) ? (
            <MobileCard className="p-3">
              <SectionTitle className="mb-1">Características e observações</SectionTitle>
              {truck.description ? <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">{truck.description}</p> : null}
              {truck.ai_description ? <p className="mt-3 whitespace-pre-line rounded-xl bg-muted p-3 text-[13px] leading-relaxed text-muted-foreground">{truck.ai_description}</p> : null}
            </MobileCard>
          ) : null}
        </>
      ) : null}

      {tab === "financeiro" ? (
        isExec ? (
          <>
            <MobileCard className="p-3">
              <SectionTitle className="mb-1">Resumo financeiro</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Compra</div><div className="font-bold">{brl(finance.purchasePrice)}</div></div>
                <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Despesas</div><div className="font-bold">{brl(finance.expensesTotal)}</div></div>
                <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Investido</div><div className="font-bold">{brl(finance.investedCost)}</div></div>
                <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">{finance.sold ? "Venda" : "Estimativa"}</div><div className="font-bold">{brl(finance.sold ? finance.soldPrice : finance.expectedPrice)}</div></div>
              </div>
              {finance.sold ? (
                <div className="mt-3 divide-y divide-border/60">
                  <DetailRow label="Lucro / prejuízo" value={brl(finance.profit)} strong />
                  <DetailRow label="Margem" value={finance.marginPct == null ? "—" : `${finance.marginPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} />
                  <DetailRow label="Forma de venda" value={finance.saleType ?? "—"} />
                </div>
              ) : null}
            </MobileCard>

            <MobileCard className="p-3">
              <SectionTitle className="mb-1">Compra</SectionTitle>
              <div className="divide-y divide-border/60">
                <DetailRow label="Data da compra" value={dateBR(truck.purchase_date)} />
                <DetailRow label="Valor de compra" value={brl(finance.purchasePrice)} strong />
                <DetailRow label="Forma de pagamento" value={truck.purchase_payment_method ?? "—"} />
                <DetailRow label="Parcelas" value={(truck.purchase_installments_count ?? data.purchaseInstallments.length) || "—"} />
                <DetailRow label="Total pago" value={brl(truck.purchase_total_paid)} />
                <DetailRow label="Total pendente" value={brl(truck.purchase_total_pending)} />
              </div>
            </MobileCard>

            <MobileCard className="p-3">
              <SectionTitle className="mb-1">Parcelas e contas</SectionTitle>
              {data.purchaseInstallments.length === 0 && data.payables.length === 0 && data.receivables.length === 0 ? <EmptyLine text="Nenhuma parcela ou conta vinculada." /> : null}
              <div className="divide-y divide-border/60">
                {data.purchaseInstallments.map((p) => <DetailRow key={p.id} label={`Compra ${p.installment_number}/${p.total_installments}`} value={`${brl(p.amount)} · ${p.status} · ${dateBR(p.due_date)}`} />)}
                {data.payables.map((p) => <DetailRow key={p.id} label="Conta a pagar" value={`${p.description} · ${brl(p.amount)} · ${p.status}`} />)}
                {data.receivables.map((r) => <DetailRow key={r.id} label="Conta a receber" value={`${r.description} · ${brl(r.amount)} · ${r.status}`} />)}
              </div>
            </MobileCard>
          </>
        ) : (
          <MobileCard className="p-4 text-center text-sm text-muted-foreground"><Lock className="mx-auto mb-2 h-5 w-5" />Financeiro exclusivo do Executivo.</MobileCard>
        )
      ) : null}

      {tab === "despesas" ? (
        isExec ? (
          <MobileCard className="p-3">
            <div className="flex items-center justify-between">
              <SectionTitle className="mb-1">Despesas</SectionTitle>
              {canRegisterExpense(roles) ? <Link to="/garagem/$truckId/despesa" params={{ truckId: truck.id }} className="text-xs font-bold text-gold">registrar</Link> : null}
            </div>
            <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-xl bg-muted p-2"><div className="font-bold">{expenseSummary.count}</div><div className="text-muted-foreground">itens</div></div>
              <div className="rounded-xl bg-muted p-2"><div className="font-bold">{brl(expenseSummary.total)}</div><div className="text-muted-foreground">total</div></div>
              <div className="rounded-xl bg-muted p-2"><div className="font-bold">{expenseSummary.paid}</div><div className="text-muted-foreground">pagas</div></div>
              <div className="rounded-xl bg-muted p-2"><div className="font-bold">{expenseSummary.pending}</div><div className="text-muted-foreground">pend.</div></div>
            </div>
            {expenseLines.length === 0 ? <EmptyLine text="Nenhuma despesa registrada." /> : (
              <div className="divide-y divide-border/60">
                {expenseLines.map((e) => (
                  <div key={e.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="font-semibold">{e.description || expenseKindLabel(e.kind)}</div><div className="text-xs text-muted-foreground">{expenseKindLabel(e.kind)} · {e.supplier ?? "sem fornecedor"}{e.source === "geral" ? " · geral" : ""}</div></div>
                      <div className="text-right"><div className="font-bold">{brl(e.amount)}</div><MiniPill tone={e.status === "pago" ? "success" : "gold"}>{e.status ?? "pendente"}</MiniPill></div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Data: {dateBR(e.occurred_at)}</span><span>Venc.: {dateBR(e.due_date)}</span>
                    </div>
                    {e.notes ? <p className="mt-2 text-xs text-muted-foreground">{e.notes}</p> : null}
                    {e.attachment_url ? <a className="mt-2 inline-flex text-xs font-bold text-gold" href={e.attachment_url} target="_blank" rel="noreferrer">Abrir comprovante</a> : null}
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        ) : null
      ) : null}

      {tab === "venda" ? (
        <MobileCard className="p-3">
          <SectionTitle className="mb-1">Venda e comprador</SectionTitle>
          {sale.sold ? (
            <div className="divide-y divide-border/60">
              <DetailRow label="Situação" value="Vendido" strong />
              <DetailRow label="Data da venda" value={dateBR(sale.soldAt)} />
              {isExec ? <DetailRow label="Valor da venda" value={brl(sale.soldPrice)} strong /> : null}
              {isExec ? <DetailRow label="Forma de pagamento" value={sale.saleType ?? "—"} /> : null}
              <DetailRow label="Comprador" value={sale.customer?.name ?? "—"} />
              <DetailRow label="Telefone" value={sale.customer?.phone ?? "—"} />
              {canSeeDocNumber ? <DetailRow label="CPF/CNPJ" value={sale.customer?.document ?? "—"} /> : null}
              <DetailRow label="Garantia" value={warranty ? `${dateBR(warranty.start_date)} a ${dateBR(warranty.end_date)} · ${warranty.status}` : dateBR(truck.warranty_end)} />
            </div>
          ) : sale.activeDeal ? (
            <div className="divide-y divide-border/60">
              <DetailRow label="Negociação" value={sale.activeDeal.title} strong />
              <DetailRow label="Etapa" value={sale.activeDeal.stage ?? "—"} />
              <DetailRow label="Cliente" value={sale.customer?.name ?? "—"} />
              <DetailRow label="Telefone" value={sale.customer?.phone ?? "—"} />
              {isExec ? <DetailRow label="Valor da proposta" value={brl(sale.activeDeal.value)} /> : null}
              <DetailRow label="Responsável" value={profileName(data.profiles, sale.activeDeal.owner_id)} />
            </div>
          ) : <EmptyLine text="Nenhuma venda ou reserva vinculada a este caminhão." />}
          {sale.saleNotes ? <p className="mt-3 rounded-xl bg-muted p-3 text-[13px] text-muted-foreground">{sale.saleNotes}</p> : null}
          {sale.customer ? <Link to="/clientes" className="mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><UserRound className="h-4 w-4" />Abrir clientes</Link> : null}
        </MobileCard>
      ) : null}

      {tab === "servicos" ? (
        <MobileCard className="p-3">
          <SectionTitle className="mb-1">Serviços</SectionTitle>
          {data.services.length === 0 ? <EmptyLine text="Nenhum serviço registrado para este caminhão." /> : (
            <div className="divide-y divide-border/60">
              {data.services.map((s) => (
                <div key={s.id} className="py-3">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-semibold">{s.title}</div><div className="text-xs text-muted-foreground">{s.category ?? "serviço"} · {supplierName(data.suppliers, s.supplier_id)}</div></div><MiniPill tone={s.status === "concluido" ? "success" : "gold"}>{s.status}</MiniPill></div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>Criado: {dateBR(s.created_at)}</span><span>Previsão: {dateBR(s.expected_at)}</span><span>Conclusão: {dateBR(s.completed_at)}</span><span>Resp.: {profileName(data.profiles, s.created_by)}</span></div>
                  {s.description || s.notes ? <p className="mt-2 text-xs text-muted-foreground">{s.description || s.notes}</p> : null}
                  {s.attachment_url ? <a href={s.attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-gold">Abrir anexo</a> : null}
                </div>
              ))}
            </div>
          )}
        </MobileCard>
      ) : null}

      {tab === "historico" ? (
        <MobileCard className="p-3">
          <SectionTitle className="mb-1">Histórico</SectionTitle>
          {data.history.length === 0 && data.notes.length === 0 && data.dealEvents.length === 0 ? <EmptyLine text="Nenhum histórico registrado." /> : null}
          <div className="divide-y divide-border/60">
            {data.history.map((h) => <div key={h.id} className="py-3"><div className="font-semibold">{h.from_status ? `${STATUS_LABEL[h.from_status as TruckStatus] ?? h.from_status} → ` : ""}{STATUS_LABEL[h.to_status as TruckStatus] ?? h.to_status}</div><div className="text-xs text-muted-foreground">{dateBR(h.created_at)} · {profileName(data.profiles, h.changed_by)}</div>{h.reason ? <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p> : null}</div>)}
            {data.notes.map((n) => <div key={n.id} className="py-3"><div className="font-semibold">Nota</div><div className="text-xs text-muted-foreground">{dateBR(n.created_at)} · {profileName(data.profiles, n.created_by)}</div><p className="mt-1 text-xs text-muted-foreground">{n.content}</p></div>)}
            {data.dealEvents.map((e) => <div key={e.id} className="py-3"><div className="font-semibold">Venda: {e.kind}</div><div className="text-xs text-muted-foreground">{dateBR(e.created_at)} · {profileName(data.profiles, e.user_id)}</div>{e.message ? <p className="mt-1 text-xs text-muted-foreground">{e.message}</p> : null}</div>)}
          </div>
        </MobileCard>
      ) : null}

      {tab === "documentos" ? (
        <MobileCard className="p-3">
          <SectionTitle className="mb-1">Documentos</SectionTitle>
          {docs.length === 0 && !data.services.some((s) => s.attachment_url) && !(isExec && expenseLines.some((e) => e.attachment_url)) ? <EmptyLine text="Nenhum documento anexado." /> : null}
          <div className="divide-y divide-border/60">
            {docs.map((d) => {
              const href = d.url ?? (d.path ? data.documentUrls.get(d.path) : undefined);
              return <div key={d.id} className="flex items-center gap-3 py-3"><FileText className="h-4 w-4 shrink-0 text-gold" /><div className="min-w-0 flex-1"><div className="truncate font-semibold">{d.name}</div><div className="text-xs text-muted-foreground">{d.type ?? "documento"} · {dateBR(d.date)}</div></div>{href ? <a href={href} target="_blank" rel="noreferrer" className="text-xs font-bold text-gold">Abrir</a> : <span className="text-xs text-muted-foreground">sem arquivo</span>}</div>;
            })}
            {data.services.filter((s) => s.attachment_url).map((s) => <div key={`svc-${s.id}`} className="flex items-center gap-3 py-3"><Wrench className="h-4 w-4 shrink-0 text-gold" /><div className="min-w-0 flex-1"><div className="truncate font-semibold">Anexo de serviço</div><div className="text-xs text-muted-foreground">{s.title}</div></div><a href={s.attachment_url!} target="_blank" rel="noreferrer" className="text-xs font-bold text-gold">Abrir</a></div>)}
            {isExec ? expenseLines.filter((e) => e.attachment_url).map((e) => <div key={`exp-${e.id}`} className="flex items-center gap-3 py-3"><DollarSign className="h-4 w-4 shrink-0 text-gold" /><div className="min-w-0 flex-1"><div className="truncate font-semibold">Comprovante de despesa</div><div className="text-xs text-muted-foreground">{e.description || expenseKindLabel(e.kind)}</div></div><a href={e.attachment_url!} target="_blank" rel="noreferrer" className="text-xs font-bold text-gold">Abrir</a></div>) : null}
          </div>
        </MobileCard>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/servicos" search={{ truck_id: truck.id }} className="flex h-12 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-bold active:bg-muted/60"><Wrench className="h-4 w-4" />Criar serviço</Link>
        <Link to="/agenda/novo" search={{ truck_id: truck.id, date: undefined, edit: undefined }} className="flex h-12 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-bold active:bg-muted/60"><CalendarDays className="h-4 w-4" />Compromisso</Link>
      </div>

      <StatusSheet open={statusOpen} onOpenChange={setStatusOpen} truck={truck} />
    </>
  );
}
