import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Wallet,
  Coins,
  Wrench,
  Phone,
  Users,
  ClipboardList,
  DoorOpen,
  Sparkles,
  Briefcase,
  Bell,
  Pencil,
  Trash2,
  Repeat,
} from "lucide-react";
import { useAgendaRange } from "@/lib/mobile/queries";
import { PagamentosTab } from "@/components/mobile/pagamentos-tab";
import type { CalendarEventItem } from "@/lib/mobile/queries";
import { MobileCard, SkeletonRows, EmptyState, PageHeader } from "@/components/mobile/ui";
import { mdBR, mdTime, mdRelative, spaTodayISO, spaDate } from "@/lib/mobile/dates";
import { brl } from "@/lib/format";
import { truckTitle } from "@/lib/truck-title";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteEvent } from "@/lib/mobile/actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { haptic } from "@/lib/mobile/haptic";
import { useAuth } from "@/hooks/use-auth";
import { isFinanceExecutive } from "@/lib/mobile/perm";

export const Route = createFileRoute("/_app/agenda")({
  component: Agenda,
});

/* ============================================================
   Auxiliares de exibição
   ============================================================ */

const TYPE_META: Record<string, { icon: typeof CalendarDays; chip: string }> = {
  compromisso: { icon: CalendarDays, chip: "bg-gold/15 text-gold-dark border-gold/40" },
  tarefa: { icon: ClipboardList, chip: "bg-sky-600/15 text-sky-700 border-sky-300" },
  reuniao: { icon: Users, chip: "bg-violet-600/15 text-violet-700 border-violet-300" },
  manutencao: { icon: Wrench, chip: "bg-warning/15 text-warning-foreground border-warning/40" },
  lembrete: { icon: Bell, chip: "bg-muted text-muted-foreground border-border" },
  pagamento: { icon: Wallet, chip: "bg-success/15 text-success border-success/40" },
  vencimento: { icon: Coins, chip: "bg-destructive/15 text-destructive border-destructive/40" },
  entrega: { icon: DoorOpen, chip: "bg-teal-600/15 text-teal-700 border-teal-300" },
  visita: { icon: Sparkles, chip: "bg-fuchsia-600/15 text-fuchsia-700 border-fuchsia-300" },
  ligacao: { icon: Phone, chip: "bg-emerald-600/15 text-emerald-700 border-emerald-300" },
  outro: { icon: Briefcase, chip: "bg-muted text-muted-foreground border-border" },
};
const EVENT_LABEL: Record<string, string> = {
  compromisso: "Compromisso",
  tarefa: "Tarefa",
  reuniao: "Reunião",
  manutencao: "Manutenção",
  lembrete: "Lembrete",
  pagamento: "Pagamento",
  vencimento: "Vencimento",
  entrega: "Entrega",
  visita: "Visita",
  ligacao: "Ligação",
  outro: "Outro",
};
const RECURRENCE_LABEL: Record<string, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

function EventRow({
  e,
  today,
  onTap,
  showAmount,
}: {
  e: CalendarEventItem;
  today: string;
  onTap: () => void;
  showAmount: boolean;
}) {
  const meta = TYPE_META[e.type] ?? TYPE_META.outro;
  const Icon = meta.icon;
  const day = (e.starts_at ?? "").slice(0, 10);
  const isToday = day === today;
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 px-3 py-3 text-left tap-gold active:bg-muted/50"
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", meta.chip)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold leading-tight">{e.title}</span>
          {e.recurrence ? <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
          <span className="font-semibold tabular-nums">
            {e.all_day ? "dia inteiro" : isToday ? mdTime(e.starts_at) : mdBR(day)}
          </span>
          {e.related_truck ? <span>· {truckTitle(e.related_truck)}</span> : null}
          {showAmount && e.amount != null && e.amount > 0 ? (
            <span className="font-bold tabular-nums">· {brl(e.amount)}</span>
          ) : null}
        </div>
      </div>
      {!isToday ? (
        <span
          className={cn(
            "shrink-0 text-[11px] font-bold",
            mdRelative(day).startsWith("atrasado") ? "text-destructive" : "text-gold-dark",
          )}
        >
          {mdRelative(day)}
        </span>
      ) : (
        <span className="shrink-0 text-[11px] font-bold text-success">hoje</span>
      )}
    </button>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ============================================================
   Agenda
   ============================================================ */

function Agenda() {
  const { roles } = useAuth();
  const showAmount = isFinanceExecutive(roles);
  const today = spaTodayISO();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [view, setView] = useState<"calendario" | "lista" | "pagamentos">("calendario");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEventItem | null>(null);

  const month = cursor.getMonth();
  const year = cursor.getFullYear();

  const rangeFrom = toISO(new Date(Math.min(cursor.getTime(), new Date().getTime())));
  const rangeTo = useMemo(() => {
    const d = new Date(year, month + 1, 0);
    const last = toISO(d);
    const plus90 = toISO(new Date(Date.now() + 90 * 86400000));
    return last > plus90 ? last : plus90;
  }, [year, month]);

  const { data, isLoading, isError } = useAgendaRange(rangeFrom, rangeTo);
  const events = useMemo(() => data ?? [], [data]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const e of events) {
      const d = (e.starts_at ?? "").slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return map;
  }, [events]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const days: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(year, month, i + 1))),
  ];
  while (days.length % 7 !== 0) days.push(null);

  const monthEvents = byDay.get(selectedDay ?? "") ?? [];
  const listUpcoming = events
    .filter((e) => (e.starts_at ?? "").slice(0, 10) >= today)
    .slice(0, 120);

  const del = useMutation({
    mutationFn: () => deleteEvent(activeEvent!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
      qc.invalidateQueries({ queryKey: ["agenda-range"] });
    },
    onSettled: () => setActiveEvent(null),
  });

  if (isLoading) return <SkeletonRows rows={6} height={64} />;
  if (isError)
    return (
      <EmptyState title="Não foi possível carregar a agenda" hint="Verifique sua conexão." />
    );

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <PageHeader title="Agenda" subtitle="Seus compromissos em tempo real" />
        <Link
          to="/agenda/novo"
          search={{ truck_id: undefined, date: selectedDay ?? undefined, edit: undefined }}
          className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-gold px-3 text-sm font-bold text-gold-foreground pressable active:scale-95"
        >
          <Plus className="h-4 w-4" /> Novo
        </Link>
      </div>

      <div className="grid grid-cols-2 rounded-xl bg-surface-secondary p-1">
        {(
          [
            "calendario",
            "lista",
            ...(showAmount ? (["pagamentos"] as const) : ([] as const)),
          ] as const
        ).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              haptic(5);
              setView(v);
            }}
            className={cn(
              "h-9 rounded-lg text-sm font-semibold transition-colors",
              view === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground",
            )}
          >
            {v === "calendario" ? "Calendário" : "Lista de compromissos"}
          </button>
        ))}
      </div>

      {view === "calendario" ? (
        <MobileCard className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border pressable active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-bold uppercase tracking-wide">
              {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </div>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border pressable active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((iso, i) => {
              if (!iso)
                return <div key={`e${i}`} className="aspect-square" aria-hidden />;
              const d = spaDate(iso);
              const isToday = iso === today;
              const sel = iso === selectedDay;
              const dayEvents = byDay.get(iso) ?? [];
              const hasPayments = dayEvents.some(
                (e) => e.type === "pagamento" || e.type === "vencimento",
              );
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    haptic(5);
                    setSelectedDay(sel ? null : iso);
                  }}
                  aria-label={`${mdBR(iso)}${dayEvents.length ? `, ${dayEvents.length} compromissos` : ""}`}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] tabular-nums tap-gold pressable",
                    sel
                      ? "bg-gold text-gold-foreground font-bold"
                      : isToday
                        ? "bg-gold/15 text-gold-dark font-bold ring-1 ring-gold/50"
                        : "text-foreground",
                  )}
                >
                  <span>{d.getDate()}</span>
                  <span className="pointer-events-none absolute bottom-1 flex items-center gap-0.5">
                    {hasPayments && (
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          sel ? "bg-gold-foreground/70" : "bg-destructive",
                        )}
                      />
                    )}
                    {dayEvents.length > 0 && (
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          sel ? "bg-gold-foreground/70" : "bg-gold",
                        )}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> compromissos
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> pagamento/vencimento
            </span>
          </div>
        </MobileCard>
      ) : view === "pagamentos" ? (
          <PagamentosTab />
      ) : (
          <MobileCard className="divide-y">
          {listUpcoming.length === 0 ? (
            <EmptyState title="Nada nos próximos 30 dias" hint="Aproveite para agendar!" />
          ) : (
            listUpcoming.map((e) => (
              <EventRow
                key={e.id}
                e={e}
                today={today}
                onTap={() => setActiveEvent(e)}
                showAmount={showAmount}
              />
            ))
          )}
        </MobileCard>
      )}

      {/* Folha do dia selecionado */}
      <Sheet open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetHeader className="px-5 pb-2 pt-4 text-left">
            <SheetTitle className="text-base">{mdBR(selectedDay)}</SheetTitle>
            <p className="text-[12px] text-muted-foreground">
              {monthEvents.length
                ? `${monthEvents.length} ${monthEvents.length === 1 ? "compromisso" : "compromissos"}`
                : "Nenhum compromisso neste dia"}
            </p>
          </SheetHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            {monthEvents.length > 0 && (
              <div className="divide-y divide-border">
                {monthEvents.map((e) => (
                  <EventRow
                    key={e.id}
                    e={e}
                    today={today}
                    onTap={() => {
                      setSelectedDay(null);
                      setActiveEvent(e);
                    }}
                    showAmount={showAmount}
                  />
                ))}
              </div>
            )}
            <div className="p-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(null);
                  nav({ to: "/agenda/novo", search: { truck_id: undefined, date: selectedDay ?? undefined, edit: undefined } });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-gold-foreground pressable active:scale-95"
              >
                <Plus className="h-4 w-4" /> Adicionar neste dia
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detalhe do compromisso */}
      <Sheet open={!!activeEvent} onOpenChange={(o) => !o && setActiveEvent(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          {activeEvent && (
            <>
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
              <div className="px-5 pb-4 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold leading-tight">{activeEvent.title}</h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {EVENT_LABEL[activeEvent.type] ?? "Compromisso"}
                      {activeEvent.recurrence
                        ? ` · repete ${RECURRENCE_LABEL[activeEvent.recurrence] ?? activeEvent.recurrence}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEvent(null);
                      nav({
                        to: "/agenda/novo",
                        search: { edit: activeEvent.id, truck_id: undefined, date: undefined },
                      });
                    }}
                    aria-label="Editar"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border pressable active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Data</dt>
                    <dd className="font-semibold">{mdBR(activeEvent.starts_at)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Horário</dt>
                    <dd className="font-semibold">
                      {activeEvent.all_day ? "Dia inteiro" : mdTime(activeEvent.starts_at)}
                    </dd>
                  </div>
                  {activeEvent.related_truck ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Caminhão</dt>
                      <dd className="font-semibold">{truckTitle(activeEvent.related_truck)}</dd>
                    </div>
                  ) : null}
                  {showAmount && activeEvent.amount != null && activeEvent.amount > 0 ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Valor</dt>
                      <dd className="font-bold tabular-nums">{brl(activeEvent.amount)}</dd>
                    </div>
                  ) : null}
                  {activeEvent.description ? (
                    <div>
                      <dt className="text-muted-foreground">Descrição</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-[15px]">{activeEvent.description}</dd>
                    </div>
                  ) : null}
                </dl>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      disabled={del.isPending}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 py-3 text-sm font-bold text-destructive pressable active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                      {del.isPending ? "Excluindo..." : "Excluir compromisso"}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação remove o compromisso “{activeEvent.title}” da agenda. Esta série de
                        recorrência não é excluída em conjunto — apenas este registro.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2">
                      <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => del.mutate()}
                        className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}