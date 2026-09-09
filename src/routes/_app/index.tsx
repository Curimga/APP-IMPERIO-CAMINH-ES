import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Truck,
  CalendarDays,
  Wrench,
  Bell,
  Activity,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { brl, dateBR } from "@/lib/format";
import { mdWeekdayLabel, mdTime, mdDaysParked, mdRelative } from "@/lib/mobile/dates";
import {
  useMobileFinance,
  useTodaysEvents,
  useTrucks,
  useServices,
  useNotifications,
  useCapitalImobilizado,
} from "@/lib/mobile/queries";
import { MoneyStat, MobileCard, SectionTitle, SkeletonRows } from "@/components/mobile/ui";
import { canSeeFinance } from "@/lib/mobile/perm";
import { truckTitle } from "@/lib/truck-title";

export const Route = createFileRoute("/_app/")({
  component: AppHome,
});

function PrivacyToggle({ revealed, onToggle }: { revealed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={revealed ? "Ocultar valores" : "Mostrar valores"}
      className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
    >
      {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function valueOrHidden(revealed: boolean, node: React.ReactNode) {
  return revealed ? node : <span className="tracking-widest">••••••</span>;
}

function AlertsPreview() {
  const { data } = useNotifications();
  const items = data?.items ?? [];
  const soon = items.filter((n) => !n.read && n.priority !== "baixa").slice(0, 3);
  if (soon.length === 0) return null;
  return (
    <MobileCard className="border-warning/30 bg-warning/5 p-3">
      <div className="flex items-center gap-2 text-warning-foreground">
        <Bell className="h-4 w-4" />
        <span className="text-sm font-bold">Alertas dos próximos dias</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {soon.map((n) => (
          <li key={n.id} className="flex items-start gap-2 text-[13px]">
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                n.priority === "critica"
                  ? "bg-destructive"
                  : n.priority === "alta"
                    ? "bg-warning"
                    : "bg-muted-foreground",
              )}
            />
            <span className="line-clamp-2">{n.title}</span>
          </li>
        ))}
      </ul>
    </MobileCard>
  );
}

function TrucksWithReturn() {
  const { data, isLoading } = useTrucks();
  if (isLoading) return <SkeletonRows rows={2} height={56} />;
  const withReturn = (data ?? [])
    .filter((t) => t.status_expected_end && t.status_expected_end?.length >= 8)
    .slice(0, 4);
  if (withReturn.length === 0) return null;
  return (
    <section>
      <SectionTitle>Previsão de retorno</SectionTitle>
      <MobileCard className="divide-y">
        {withReturn.map((t) => (
          <Link
            key={t.id}
            to="/garagem/$truckId"
            params={{ truckId: t.id }}
            className="block active:bg-muted/60"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Clock className="h-4 w-4 text-gold shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {truckTitle(t)} · {t.plate ?? "sem placa"}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {dateBR(t.status_expected_end)}
              </span>
            </div>
          </Link>
        ))}
      </MobileCard>
    </section>
  );
}

function Warranties() {
  const { data, isLoading } = useTrucks();
  if (isLoading) return null;
  const inWarranty = (data ?? [])
    .filter(
      (t) =>
        t.sold_at &&
        t.warranty_end &&
        mdDaysParked(t.warranty_end) >= 0 &&
        mdDaysParked(t.warranty_end) <= 30,
    )
    .slice(0, 4);
  if (inWarranty.length === 0) return null;
  return (
    <section>
      <SectionTitle>Garantias próximas do vencimento</SectionTitle>
      <MobileCard className="divide-y">
        {inWarranty.map((t) => (
          <Link key={t.id} to="/vendidos" className="block active:bg-muted/60">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <ShieldMini />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{truckTitle(t)}</span>
              <span className="shrink-0 text-xs font-semibold text-warning">
                {mdRelative(t.warranty_end)}
              </span>
            </div>
          </Link>
        ))}
      </MobileCard>
    </section>
  );
}

function ShieldMini() {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gold">
      <Truck className="h-4 w-4" />
    </span>
  );
}

function OperationalHome() {
  const { data: services, isLoading: svLoading } = useServices();
  const { data: trucks, isLoading: tkLoading } = useTrucks();

  const delayed = (services ?? [])
    .filter((s) => s.status === "em_andamento" && s.expected_at && mdDaysParked(s.expected_at) < 0)
    .slice(0, 4);
  const inStock = (trucks ?? []).filter((t) =>
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
  ).length;

  if (svLoading || tkLoading) return <SkeletonRows rows={3} height={56} />;

  return (
    <>
      <section className="grid grid-cols-2 gap-2">
        <MoneyStat label="Caminhões em estoque" value={inStock} accent="gold" />
        <MoneyStat
          label="Serviços em andamento"
          value={(services ?? []).filter((s) => s.status === "em_andamento").length}
        />
      </section>

      {delayed.length > 0 && (
        <section>
          <SectionTitle>
            Serviços atrasados
            <span className="text-destructive">· {delayed.length}</span>
          </SectionTitle>
          <MobileCard className="divide-y">
            {delayed.map((s) => (
              <Link
                key={s.id}
                to="/servicos"
                search={{ truck_id: undefined }}
                className="block active:bg-muted/60"
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <Wrench className="h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.truck?.brand ? truckTitle(s.truck) : "Sem caminhão"}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-destructive">
                    {mdRelative(s.expected_at)}
                  </span>
                </div>
              </Link>
            ))}
          </MobileCard>
        </section>
      )}
    </>
  );
}

function ExecutiveHome() {
  const { data, isLoading } = useMobileFinance();
  const { revealed, toggle } = useReveal();
  const cap = useCapitalImobilizado();

  if (isLoading || !data) return <SkeletonRows rows={4} height={76} />;
  const { kpis, snap } = data;

  const aReceber = (snap.receivables ?? [])
    .filter((r) => r.status === "aberto")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const aPagar = (snap.payables ?? [])
    .filter((p) => p.status === "aberto")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <SectionTitle className="mb-0">Indicadores</SectionTitle>
        <PrivacyToggle revealed={revealed} onToggle={toggle} />
      </div>
      <section className="grid grid-cols-2 gap-2">
        <MoneyStat
          label="Faturamento mensal"
          value={valueOrHidden(revealed, brl(kpis.revMonth))}
          accent="gold"
        />
        <MoneyStat
          label="Lucro líquido"
          value={valueOrHidden(revealed, brl(kpis.netProfit))}
          accent={kpis.netProfit >= 0 ? "success" : "destructive"}
        />
        <MoneyStat label="Caminhões vendidos" value={String(kpis.soldCount)} accent="success" />
        <MoneyStat label="Em estoque" value={String(kpis.stockCount ?? cap.count)} />
        <MoneyStat
          label="Despesas gerais"
          value={valueOrHidden(revealed, brl(kpis.opex + kpis.stockExpenses))}
        />
        <MoneyStat label="Saldo bancário" value={valueOrHidden(revealed, brl(kpis.balance))} />
        <MoneyStat
          label="Capital imobilizado"
          value={valueOrHidden(revealed, brl(cap.total))}
          accent="gold"
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
        />
        <MoneyStat
          label="Resultado projetado"
          value={valueOrHidden(revealed, brl(kpis.profitForecast))}
          accent={kpis.profitForecast >= 0 ? "success" : "destructive"}
        />
      </section>

      {/* Capital imobilizado — cada item abre o caminhão na garagem */}
      {cap.count > 0 && (
        <section>
          <SectionTitle
            right={<span className="text-xs text-muted-foreground">{dateBR(new Date())}</span>}
          >
            Capital imobilizado
          </SectionTitle>
          <MobileCard className="divide-y">
            {cap.trucks.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                to="/garagem/$truckId"
                params={{ truckId: t.id }}
                className="block active:bg-muted/60"
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <Truck className="h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{truckTitle(t)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.plate ?? "sem placa"} · parado há{" "}
                      {mdDaysParked(t.purchase_date ?? t.created_at)} dias
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold tabular-nums">
                      {valueOrHidden(
                        revealed,
                        brl(Number(t.purchase_price ?? 0) + Number(t.expenses_total ?? 0)),
                      )}
                    </div>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </MobileCard>
          {aReceber > 0 || aPagar > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MobileCard className="p-3">
                <div className="text-[11px] uppercase text-muted-foreground">A receber</div>
                <div className="text-[15px] font-bold text-success tabular-nums">
                  {valueOrHidden(revealed, brl(aReceber))}
                </div>
              </MobileCard>
              <MobileCard className="p-3">
                <div className="text-[11px] uppercase text-muted-foreground">A pagar</div>
                <div className="text-[15px] font-bold text-destructive tabular-nums">
                  {valueOrHidden(revealed, brl(aPagar))}
                </div>
              </MobileCard>
            </div>
          ) : null}
        </section>
      )}
    </>
  );
}

function useReveal() {
  const [revealed, setRevealed] = useState(true);
  return { revealed, toggle: () => setRevealed((r) => !r) };
}

function TodaysCommitments() {
  const { data, isLoading } = useTodaysEvents();
  if (isLoading) return <SkeletonRows rows={2} height={56} />;
  if (!data || data.length === 0) return null;
  return (
    <section>
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
          Compromissos de hoje
        </h2>
        <Link to="/agenda" className="flex items-center text-xs font-semibold text-gold">
          ver agenda <ArrowRight className="ml-0.5 h-3 w-3" />
        </Link>
      </div>
      <MobileCard className="divide-y">
        {data.slice(0, 5).map((e) => (
          <Link key={e.id} to="/agenda" className="block active:bg-muted/60">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <CalendarDays className="h-4 w-4 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">
                  {e.all_day ? "dia inteiro" : mdTime(e.starts_at)}
                  {e.related_truck ? ` · ${truckTitle(e.related_truck)}` : ""}
                </div>
              </div>
              {e.amount != null && e.amount > 0 ? (
                <span className="shrink-0 text-xs font-semibold tabular-nums">{brl(e.amount)}</span>
              ) : null}
            </div>
          </Link>
        ))}
      </MobileCard>
    </section>
  );
}

function QuickActions() {
  const { roles } = useAuth();
  const items = [
    { label: "Garagem", to: "/garagem", icon: Truck },
    { label: "Agenda", to: "/agenda", icon: CalendarDays },
    { label: "Serviços", to: "/servicos", icon: Wrench },
    { label: "Notificações", to: "/notificacoes", icon: Bell },
  ];
  if (canSeeFinance(roles))
    items.push({ label: "Financeiro", to: "/financeiro", icon: Activity });
  return (
    <section>
      <SectionTitle>Ações rápidas</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to as never}
            className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card px-2 py-3 active:bg-muted/60 min-h-16"
          >
            <it.icon className="h-5 w-5 text-gold" />
            <span className="text-center text-[11px] font-semibold leading-tight">{it.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AppHome() {
  const { profile, roles } = useAuth();
  const today = new Date();

  return (
    <>
      <MobileCard className="gradient-dark p-4 text-sidebar-foreground border-0">
        <div className="text-sm text-sidebar-foreground/70">{mdWeekdayLabel(today)}</div>
        <div className="mt-1 text-lg font-bold leading-tight">
          Bem-vindo, {profile?.full_name?.split(" ")[0] ?? "usuário"}
        </div>
        <div className="mt-0.5 text-[13px] capitalize text-sidebar-foreground/60">
          Acompanhe sua operação em tempo real.
        </div>
      </MobileCard>

      <AlertsPreview />

      {canSeeFinance(roles) ? <ExecutiveHome /> : <OperationalHome />}

      <TodaysCommitments />
      <TrucksWithReturn />
      <Warranties />
      <QuickActions />
    </>
  );
}
