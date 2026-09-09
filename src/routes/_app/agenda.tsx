import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, CalendarDays } from "lucide-react";
import { useAgenda } from "@/lib/mobile/queries";
import type { CalendarEventItem } from "@/lib/mobile/queries";
import { MobileCard, SkeletonRows, EmptyState } from "@/components/mobile/ui";
import { mdBR, mdTime, mdRelative, spaTodayISO } from "@/lib/mobile/dates";
import { brl } from "@/lib/format";
import { truckTitle } from "@/lib/truck-title";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/agenda")({
  component: Agenda,
});

type Tab = "hoje" | "proximos";

const TYPE_BADGE: Record<string, string> = {
  compromisso: "bg-gold/15 text-gold border-gold/30",
  pagamento: "bg-success/15 text-success border-success/30",
  vencimento: "bg-destructive/15 text-destructive border-destructive/30",
  manutencao: "bg-warning/15 text-warning-foreground border-warning/30",
  lembrete: "bg-muted text-foreground border-border",
  reuniao: "bg-violet-600/15 text-violet-700 border-violet-300",
  tarefa: "bg-sky-600/15 text-sky-700 border-sky-300",
  evento: "bg-fuchsia-600/15 text-fuchsia-700 border-fuchsia-300",
  outro: "bg-muted text-foreground border-border",
};

function EventItem({ e, today }: { e: CalendarEventItem; today: string }) {
  const isToday = (e.starts_at ?? "").slice(0, 10) === today;
  const badge = TYPE_BADGE[e.type] ?? TYPE_BADGE.outro;
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          badge,
        )}
      >
        <CalendarDays className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{e.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
          <span className="font-semibold">
            {isToday ? mdTime(e.starts_at) : mdBR((e.starts_at ?? "").slice(0, 10))}
          </span>
          {e.related_truck ? <span>· {truckTitle(e.related_truck)}</span> : null}
          {e.recurrence ? <span className="font-semibold">· {e.recurrence}</span> : null}
          {e.amount != null && e.amount > 0 ? (
            <span className="font-bold tabular-nums">· {brl(e.amount)}</span>
          ) : null}
        </div>
      </div>
      {!isToday ? (
        <span
          className={cn(
            "shrink-0 text-[11px] font-bold",
            mdRelative((e.starts_at ?? "").slice(0, 10)).startsWith("atrasado")
              ? "text-destructive"
              : "text-gold",
          )}
        >
          {mdRelative((e.starts_at ?? "").slice(0, 10))}
        </span>
      ) : (
        <span className="shrink-0 text-[11px] font-bold text-success">hoje</span>
      )}
    </div>
  );
}

function Agenda() {
  const [tab, setTab] = useState<Tab>("hoje");
  const today = spaTodayISO();
  const { data, isLoading, isError } = useAgenda(30);

  const todayEvents = (data ?? []).filter((e) => (e.starts_at ?? "").slice(0, 10) === today);
  const upcoming = (data ?? []).filter((e) => (e.starts_at ?? "").slice(0, 10) > today);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Agenda</h1>
        <Link
          to="/agenda/novo"
          search={{ truck_id: undefined }}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-3 text-sm font-bold text-gold-foreground active:opacity-80"
        >
          <Plus className="h-4 w-4" /> Compromisso
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["hoje", "proximos"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "h-10 rounded-xl border text-sm font-bold",
              tab === t ? "border-gold bg-gold text-gold-foreground" : "bg-background",
            )}
          >
            {t === "hoje" ? `Hoje (${todayEvents.length})` : `Próximos (${upcoming.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonRows rows={5} height={64} />
      ) : isError ? (
        <EmptyState title="Erro ao carregar a agenda" hint="Verifique sua conexão." />
      ) : tab === "hoje" && todayEvents.length === 0 ? (
        <EmptyState
          title="Nenhum compromisso hoje"
          hint="Toque em 'Compromisso' para agendar."
          onAction={() => setTab("proximos")}
          actionLabel="Ver próximos"
        />
      ) : tab === "proximos" && upcoming.length === 0 ? (
        <EmptyState title="Nada nos próximos 30 dias" hint="Aproveite para agendar!" />
      ) : (
        <MobileCard className="divide-y">
          {(tab === "hoje" ? todayEvents : upcoming).map((e) => (
            <EventItem key={e.id} e={e} today={today} />
          ))}
        </MobileCard>
      )}
    </>
  );
}
