import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock,
  Hammer,
  Truck,
  User,
  Warehouse,
  Wrench,
  PaintRoller,
  Building2,
  BadgeCheck,
  AlarmClock,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  spaTodayISO,
  mdWeekdayLabel,
  mdTime,
  mdRelative,
  mdDaysParked,
  mdDiffDays,
} from "@/lib/mobile/dates";
import {
  useDashboardData,
  type DashboardTruck,
  type DashboardService,
  type DashboardEvent,
} from "@/lib/mobile/queries";
import { MobileCard, SectionTitle, SkeletonRows } from "@/components/mobile/ui";
import { STATUS_LABEL } from "@/lib/truck-status";
import { truckTitle } from "@/lib/truck-title";
import { haptic } from "@/lib/mobile/haptic";

export const Route = createFileRoute("/_app/")({
  component: AppHome,
});

const STATUS_DOT: Record<string, string> = {
  disponivel: "bg-emerald-600",
  reservado: "bg-violet-600",
  negociacao: "bg-amber-500",
  vendido: "bg-sky-600",
  consignado: "bg-cyan-600",
  manutencao: "bg-rose-600",
  patio: "bg-zinc-700",
  oficina: "bg-orange-600",
  despachante: "bg-blue-600",
  pintura: "bg-fuchsia-600",
  interna: "bg-yellow-500",
  repasse: "bg-teal-600",
};

type Tone = "default" | "gold" | "success" | "destructive" | "muted" | "info" | "warning";

const toneDot: Record<Tone, string> = {
  default: "bg-muted-foreground",
  gold: "bg-gold",
  success: "bg-success",
  destructive: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
  warning: "bg-warning",
};

/* ============================================================
   Mesh de indicadores operacionais (cards clicáveis)
   ============================================================ */

function DashCard({
  icon: Icon,
  value,
  label,
  ctx,
  tone = "default",
  to,
  search,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: React.ReactNode;
  label: string;
  ctx?: string;
  tone?: Tone;
  to?: string;
  search?: Record<string, unknown>;
  onClick?: () => void;
}) {
  const inner = (
    <MobileCard className="relative flex min-h-[96px] flex-col gap-1 p-3">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary",
            tone === "gold"
              ? "text-gold-dark"
              : tone === "success"
                ? "text-success"
                : tone === "destructive"
                  ? "text-destructive"
                  : tone === "warning"
                    ? "text-warning"
                    : "text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div
          className={cn(
            "text-[19px] font-bold leading-tight tabular-nums",
            tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "",
          )}
        >
          {value}
        </div>
      </div>
      <div className="truncate text-[12px] font-semibold leading-tight">{label}</div>
      {ctx ? <div className="text-[11px] text-muted-foreground">{ctx}</div> : null}
      <ArrowRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-muted-foreground/60" />
    </MobileCard>
  );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="text-left tap-gold">
        {inner}
      </button>
    );
  if (to)
    return (
      <Link to={to as never} search={search as never} className="block tap-gold">
        {inner}
      </Link>
    );
  return inner;
}

/* ============================================================
   Precisa da sua atenção
   ============================================================ */

interface AttentionItem {
  id: string;
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const inner = (
    <div className="flex items-start gap-2.5 px-3 py-2.5">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneDot[item.tone])} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{item.title}</div>
        {item.subtitle ? (
          <div className="line-clamp-1 text-[12px] text-muted-foreground">{item.subtitle}</div>
        ) : null}
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
    </div>
  );
  if (item.to && item.params)
    return (
      <Link to={item.to as never} params={item.params as never} className="block active:bg-muted/60">
        {inner}
      </Link>
    );
  if (item.to && item.search)
    return (
      <Link to={item.to as never} search={item.search as never} className="block active:bg-muted/60">
        {inner}
      </Link>
    );
  if (item.to)
    return (
      <Link to={item.to as never} className="block active:bg-muted/60">
        {inner}
      </Link>
    );
  return inner;
}

/* ============================================================
   Situação da garagem
   ============================================================ */

function GarageStatusBars({ statusRows }: { statusRows: [string, number][] }) {
  if (statusRows.length === 0) return null;
  const total = statusRows.reduce((s, [, c]) => s + c, 0) || 1;
  return (
    <section>
      <SectionTitle>Situação da garagem</SectionTitle>
      <MobileCard className="space-y-2 p-3">
        {statusRows.map(([s, c]) => {
          const pct = Math.round((c / total) * 100);
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", STATUS_DOT[s])} />
              <span className="w-24 shrink-0 truncate text-[12px] font-medium">
                {STATUS_LABEL[s] ?? s}
              </span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className={cn("h-full rounded", c > 0 ? STATUS_DOT[s] : "")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                {c}
              </span>
            </div>
          );
        })}
      </MobileCard>
    </section>
  );
}

/* ============================================================
   Compromissos de hoje
   ============================================================ */

function AgendaPreview({ events }: { events: DashboardEvent[] }) {
  const agenda = events ?? [];
  return (
    <section>
      <SectionTitle
        right={
          <Link to="/agenda" className="flex items-center text-xs font-semibold text-gold">
            ver agenda <ArrowRight className="ml-0.5 h-3 w-3" />
          </Link>
        }
      >
        Compromissos de hoje
      </SectionTitle>
      {agenda.length === 0 ? (
        <MobileCard className="p-4 text-center text-[13px] text-muted-foreground">
          Nenhum compromisso para hoje.
        </MobileCard>
      ) : (
        <MobileCard className="divide-y">
          {agenda.slice(0, 5).map((e) => (
            <Link key={e.id} to="/agenda" className="block active:bg-muted/60">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <CalendarDays className="h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{e.title}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {e.all_day ? "dia inteiro" : mdTime(e.starts_at)}
                    {e.related_truck ? ` · ${truckTitle(e.related_truck)}` : ""}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {mdRelative(e.starts_at)}
                </span>
              </div>
            </Link>
          ))}
        </MobileCard>
      )}
      <Link
        to="/agenda/novo"
        className="mt-2 flex h-10 items-center justify-center rounded-xl border bg-card text-[13px] font-semibold text-gold active:bg-muted/60"
      >
        Novo compromisso
      </Link>
    </section>
  );
}

/* ============================================================
   Movimentações recentes (100% operacional)
   ============================================================ */

interface Movement {
  id: string;
  label: string;
  kind: string;
  sub?: string;
  date: string;
  to: string;
}

function Movements({
  trucks,
  services,
  events,
}: {
  trucks: DashboardTruck[];
  services: DashboardService[];
  events: DashboardEvent[];
}) {
  const cutoff = Date.now() - 7 * 86400000;

  const recentTrucks: Movement[] = (trucks ?? [])
    .filter((t) => new Date(t.updated_at ?? t.created_at).getTime() >= cutoff)
    .map((t) => ({
      id: `mk-${t.id}`,
      label: truckTitle(t),
      kind: (t.created_at ?? "") === (t.updated_at ?? "") ? "Adicionado à garagem" : "Atualizado",
      sub: t.plate ?? STATUS_LABEL[t.status] ?? undefined,
      date: t.updated_at ?? t.created_at,
      to: `/garagem/${t.id}`,
    }));

  const recentServices: Movement[] = (services ?? [])
    .filter((s) => new Date(s.completed_at ?? s.created_at).getTime() >= cutoff)
    .map((s) => ({
      id: `sv-${s.id}`,
      label: s.title || "Serviço",
      kind: s.completed_at ? "Serviço concluído" : "Serviço iniciado",
      sub: s.truck ? truckTitle(s.truck) : undefined,
      date: s.completed_at ?? s.created_at,
      to: "/servicos",
    }));

  const recentEvents: Movement[] = (events ?? [])
    .filter((e) => new Date(e.created_at ?? "").getTime() >= cutoff)
    .map((e) => ({
      id: `ev-${e.id}`,
      label: e.title || "Compromisso",
      kind: "Compromisso criado",
      sub: e.related_truck ? truckTitle(e.related_truck) : undefined,
      date: e.created_at ?? "",
      to: "/agenda",
    }));

  const movements = [...recentTrucks, ...recentServices, ...recentEvents]
    .filter((m) => m.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  if (movements.length === 0) return null;

  const IconFor = (to: string) => {
    if (to.startsWith("/garagem")) return Truck;
    if (to.startsWith("/servicos")) return Wrench;
    return CalendarDays;
  };

  return (
    <section>
      <SectionTitle>Movimentações recentes</SectionTitle>
      <MobileCard className="divide-y">
        {movements.map((m) => {
          const Icon = IconFor(m.to);
          return (
            <Link key={m.id} to={m.to as never} className="block active:bg-muted/60">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Icon className="h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{m.label}</div>
                  <div className="line-clamp-1 text-[12px] text-muted-foreground">
                    {m.kind}
                    {m.sub ? ` · ${m.sub}` : ""}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {mdRelative(m.date)}
                </span>
              </div>
            </Link>
          );
        })}
      </MobileCard>
    </section>
  );
}

/* ============================================================
   Ações rápidas (sem Financeiro)
   ============================================================ */

function QuickActions() {
  const items = [
    { label: "Caminhão", icon: Truck, to: "/garagem/novo" },
    { label: "Compromisso", icon: CalendarDays, to: "/agenda/novo" },
    { label: "Serviço", icon: Wrench, to: "/servicos/novo" },
    { label: "Cliente", icon: User, to: "/clientes/novo" },
  ];
  return (
    <section>
      <SectionTitle>Ações rápidas</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              to={it.to as never}
              className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-card px-1 py-3 text-center active:bg-muted/60"
            >
              <Icon className="h-5 w-5 text-gold" />
              <span className="text-[11px] font-semibold leading-tight">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   Estatística do hero
   ============================================================ */

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-2 py-2 text-center ring-1 ring-white/10">
      <div className="text-[17px] font-extrabold leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] font-medium leading-tight text-sidebar-foreground/60">
        {label}
      </div>
    </div>
  );
}

/* ============================================================
   Agenda do dia — versão compacta
   ============================================================ */

function AgendaTodayRow({ count }: { count: number }) {
  return (
    <section>
      <SectionTitle
        right={
          <Link to="/agenda" className="flex items-center text-xs font-semibold text-gold">
            ver agenda <ArrowRight className="ml-0.5 h-3 w-3" />
          </Link>
        }
      >
        Agenda de hoje
      </SectionTitle>
      <Link to="/agenda" className="block tap-gold">
        <MobileCard className="flex items-center gap-3 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold leading-tight tabular-nums">{count}</div>
            <div className="truncate text-[12px] text-muted-foreground">
              {count === 0 ? "nenhum compromisso hoje" : count === 1 ? "compromisso hoje" : "compromissos hoje"}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        </MobileCard>
      </Link>
      <Link
        to="/agenda/novo"
        className="mt-2 flex h-10 items-center justify-center rounded-xl border bg-card text-[13px] font-semibold text-gold active:bg-muted/60"
      >
        Novo compromisso
      </Link>
    </section>
  );
}

/* ============================================================
   Página inicial — central operacional (sem dados financeiros)
   ============================================================ */

function AppHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const [view, setView] = useState<"resumo" | "tudo">(
    () => (localStorage.getItem("imperio:dashboard-view") === "tudo" ? "tudo" : "resumo"),
  );
  const toggleView = () => {
    haptic(10);
    setView((v) => {
      const next = v === "resumo" ? "tudo" : "resumo";
      localStorage.setItem("imperio:dashboard-view", next);
      return next;
    });
  };

  const { data: dash, isPending, isError, refetch } = useDashboardData();

  if (isPending) return <SkeletonRows rows={6} height={56} />;

  if (isError || !dash) {
    return (
      <MobileCard className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="text-sm font-bold">Não foi possível carregar o painel</div>
        <div className="text-[12px] text-muted-foreground">
          Verifique sua conexão com a internet e tente novamente.
        </div>
        <button
          type="button"
          onClick={() => {
            haptic(10);
            refetch();
          }}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gold px-5 text-[13px] font-bold text-gold-foreground active:opacity-80"
        >
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </MobileCard>
    );
  }

  const all = dash.trucks;
  const services = dash.services;
  const events = dash.events;
  const fleet = all.length;
  const statusCount = (s: string) => all.filter((t) => t.status === s).length;
  const emEstoque = statusCount("disponivel") + statusCount("consignado");
  const reservados = statusCount("reservado");
  const emServico =
    statusCount("oficina") +
    statusCount("pintura") +
    statusCount("interna") +
    statusCount("despachante") +
    statusCount("manutencao");
  const operating = fleet - statusCount("vendido");
  const svcRunning = (services ?? []).filter((s) => s.status === "em_andamento").length;
  const delayedServices = (services ?? []).filter(
    (s) => s.status === "em_andamento" && s.expected_at && mdRelative(s.expected_at).startsWith("atrasado"),
  );
  const eventsCount = events?.length ?? 0;
  const todayStr = spaTodayISO();

  const pct = (n: number) => (fleet ? Math.round((n / fleet) * 100) : 0);

  const openFilter = (status: string) => {
    haptic(10);
    localStorage.setItem("imperio:garagem-filtro", status);
    navigate({ to: "/garagem" });
  };
  const openAllGarage = () => {
    haptic(10);
    localStorage.setItem("imperio:garagem-filtro", "todos");
    navigate({ to: "/garagem" });
  };

  return (
    <>
      {/* Hero premium com botão "olho" */}
      <MobileCard className="gradient-dark relative overflow-hidden border-0 p-4 text-sidebar-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-gold/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sidebar-foreground/10 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/55">
              Painel de hoje
            </span>
            <button
              type="button"
              onClick={toggleView}
              aria-label={view === "resumo" ? "Ver dashboard completo" : "Ver apenas o resumo"}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-sidebar-foreground ring-1 ring-white/15 pressable active:scale-95"
            >
              {view === "resumo" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {view === "resumo" ? "Ver tudo" : "Resumo"}
            </button>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-[13px] text-sidebar-foreground/70">
                {greeting}, {profile?.full_name?.split(" ")[0] ?? "usuário"} · {mdWeekdayLabel(today)}
              </div>
              <div className="mt-1 text-[30px] font-extrabold leading-none tabular-nums">{fleet}</div>
              <div className="mt-1 text-[11px] text-sidebar-foreground/60">caminhões na frota</div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {operating} em operação
              </div>
              <div className="mt-2 text-[22px] font-extrabold leading-none tabular-nums text-gold">
                {emEstoque}
              </div>
              <div className="text-[11px] text-sidebar-foreground/60">prontos p/ venda</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <HeroStat value={reservados} label="Reservados" />
            <HeroStat value={emServico} label="Em serviço" />
            <HeroStat value={svcRunning} label="Serviços ativos" />
          </div>
        </div>
      </MobileCard>

      {delayedServices.length > 0 && (
        <Link
          to="/servicos"
          search={{ tab: "atrasados" }}
          className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] font-semibold text-destructive active:bg-destructive/20"
        >
          <AlarmClock className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {delayedServices.length}{" "}
            {delayedServices.length === 1 ? "serviço atrasado" : "serviços atrasados"}
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
      )}

      {view === "resumo" ? (
        <>
          <section>
            <SectionTitle>Operação em foco</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              <DashCard
                icon={Truck}
                value={emEstoque}
                label="Em estoque"
                ctx={`${pct(emEstoque)}%`}
                tone="gold"
                onClick={openAllGarage}
              />
              <DashCard
                icon={BadgeCheck}
                value={reservados}
                label="Reservados"
                ctx={`${pct(reservados)}%`}
                tone="info"
                onClick={() => openFilter("reservado")}
              />
              <DashCard
                icon={Wrench}
                value={emServico}
                label="Em serviço"
                ctx={`${pct(emServico)}%`}
                tone="warning"
                onClick={() => openFilter("oficina")}
              />
              <DashCard
                icon={AlarmClock}
                value={delayedServices.length}
                label="Atrasados"
                ctx={delayedServices.length > 0 ? "atualize prazos" : "tudo em dia"}
                tone="destructive"
                to="/servicos"
                search={{ tab: "atrasados" }}
              />
            </div>
          </section>

          <AgendaTodayRow count={eventsCount} />

          <QuickActions />
        </>
      ) : (
        <>
          <section>
            <SectionTitle>Visão geral</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              <DashCard
                icon={Truck}
                value={emEstoque}
                label="Em estoque"
                ctx={`${pct(emEstoque)}% da frota`}
                tone="gold"
                onClick={openAllGarage}
              />
              <DashCard
                icon={BadgeCheck}
                value={reservados}
                label="Reservados"
                ctx={`${pct(reservados)}% da frota`}
                tone="info"
                onClick={() => openFilter("reservado")}
              />
              <DashCard
                icon={Warehouse}
                value={statusCount("patio")}
                label="No pátio"
                ctx={`${pct(statusCount("patio"))}% da frota`}
                onClick={() => openFilter("patio")}
              />
              <DashCard
                icon={Wrench}
                value={statusCount("oficina")}
                label="Na oficina"
                ctx={`${pct(statusCount("oficina"))}% da frota`}
                onClick={() => openFilter("oficina")}
              />
              <DashCard
                icon={PaintRoller}
                value={statusCount("pintura")}
                label="Na pintura"
                ctx={`${pct(statusCount("pintura"))}% da frota`}
                onClick={() => openFilter("pintura")}
              />
              <DashCard
                icon={Building2}
                value={statusCount("interna")}
                label="Na interna"
                ctx={`${pct(statusCount("interna"))}% da frota`}
                onClick={() => openFilter("interna")}
              />
              <DashCard
                icon={ClipboardList}
                value={statusCount("despachante")}
                label="Despachante"
                ctx={`${pct(statusCount("despachante"))}% da frota`}
                onClick={() => openFilter("despachante")}
              />
              <DashCard
                icon={Hammer}
                value={svcRunning}
                label="Serviços ativos"
                ctx="ver serviços"
                tone="gold"
                to="/servicos"
              />
              <DashCard
                icon={AlarmClock}
                value={delayedServices.length}
                label="Serviços atrasados"
                ctx={delayedServices.length > 0 ? "atualize prazos" : "tudo em dia"}
                tone="destructive"
                to="/servicos"
                search={{ tab: "atrasados" }}
              />
              <DashCard
                icon={CalendarDays}
                value={eventsCount}
                label="Compromissos hoje"
                ctx="ver agenda"
                to="/agenda"
              />
            </div>
          </section>

          <Attention trucks={all} services={services} events={events} todayStr={todayStr} />

          <GarageStatusBars
            statusRows={[...all.reduce<Map<string, number>>((m, t) => {
              m.set(t.status, (m.get(t.status) ?? 0) + 1);
              return m;
            }, new Map()).entries()]
              .filter(([s, c]) => c > 0 && s !== "vendido")
              .sort((a, b) => b[1] - a[1])}
          />

          <AgendaPreview events={events} />
          <Movements trucks={all} services={services} events={events} />
          <QuickActions />
        </>
      )}
    </>
  );
}

function Attention({
  trucks,
  services,
  events,
  todayStr,
}: {
  trucks: DashboardTruck[];
  services: DashboardService[];
  events: DashboardEvent[];
  todayStr: string;
}) {
  const items: AttentionItem[] = [];

  (services ?? [])
    .filter((s) => s.status === "em_andamento" && s.expected_at && mdDaysParked(s.expected_at) > 0)
    .slice(0, 3)
    .forEach((s) =>
      items.push({
        id: `svc-${s.id}`,
        tone: "destructive",
        icon: <Wrench className="h-4 w-4" />,
        title: s.title || "Serviço",
        subtitle: s.truck ? truckTitle(s.truck) : "Sem caminhão",
        to: "/servicos",
        search: { truck_id: undefined, tab: "atrasados" },
      }),
    );

  (trucks ?? [])
    .filter(
      (t) =>
        t.status_expected_end &&
        mdDiffDays(todayStr, t.status_expected_end) >= 0 &&
        mdDiffDays(todayStr, t.status_expected_end) <= 7,
    )
    .slice(0, 2)
    .forEach((t) =>
      items.push({
        id: `ret-${t.id}`,
        tone: "warning",
        icon: <Clock className="h-4 w-4" />,
        title: `Retorno previsto · ${truckTitle(t)}`,
        subtitle: `${t.plate ?? "sem placa"} · ${mdRelative(t.status_expected_end)}`,
        to: "/garagem/$truckId",
        params: { truckId: t.id },
      }),
    );

  (events ?? []).slice(0, 3).forEach((e) =>
    items.push({
      id: `evt-${e.id}`,
      tone: "default",
      icon: <CalendarDays className="h-4 w-4" />,
      title: e.title || "Compromisso",
      subtitle: `${mdTime(e.starts_at)}${e.related_truck ? ` · ${truckTitle(e.related_truck)}` : ""}`,
      to: "/agenda",
    }),
  );

  (trucks ?? [])
    .filter(
      (t) =>
        t.sold_at && t.warranty_end && mdDaysParked(t.warranty_end) >= 0 && mdDaysParked(t.warranty_end) <= 30,
    )
    .slice(0, 2)
    .forEach((t) =>
      items.push({
        id: `war-${t.id}`,
        tone: "success",
        icon: <Shield className="h-4 w-4" />,
        title: `Garantia · ${truckTitle(t)}`,
        subtitle: mdRelative(t.warranty_end),
        to: "/vendidos",
      }),
    );

  items.push(
    ...(trucks ?? [])
      .filter((t) =>
        ["disponivel", "consignado", "patio", "oficina", "pintura", "interna", "despachante", "repasse"].includes(
          t.status,
        ),
      )
      .map((t) => ({ truck: t, days: mdDaysParked(t.purchase_date ?? t.created_at) }))
      .filter(({ days }) => days > 90)
      .sort((a, b) => b.days - a.days)
      .slice(0, 3)
      .map(
        ({ truck: t, days }): AttentionItem => ({
          id: `aged-${t.id}`,
          tone: "warning",
          icon: <Truck className="h-4 w-4" />,
          title: `${truckTitle(t)} parado há ${days} dias`,
          subtitle: t.plate ?? "sem placa",
          to: "/garagem/$truckId",
          params: { truckId: t.id },
        }),
      ),
  );

  const list = items.slice(0, 6);
  if (list.length === 0) return null;
  return (
    <section>
      <SectionTitle>Precisa da sua atenção</SectionTitle>
      <MobileCard className="divide-y">
        {list.map((item) => (
          <AttentionRow key={item.id} item={item} />
        ))}
      </MobileCard>
    </section>
  );
}