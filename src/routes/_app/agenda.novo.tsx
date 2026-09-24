import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Trash2 } from "lucide-react";
import { Field, inputClass, btnGold, MobileCard, FormSection } from "@/components/mobile/ui";
import { useTrucks, useEvent } from "@/lib/mobile/queries";
import { createEvent, updateEvent, deleteEvent } from "@/lib/mobile/actions";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
import { truckTitle } from "@/lib/truck-title";
import { spaTodayISO, mdTime, spaToUtcISO, isoToSpaISO } from "@/lib/mobile/dates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";
import { haptic, hapticSuccess, hapticError } from "@/lib/mobile/haptic";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";

export const Route = createFileRoute("/_app/agenda/novo")({
  validateSearch: (s: Record<string, unknown>) => {
    const r: { truck_id?: string; date?: string; edit?: string } = {};
    if (typeof s.truck_id === "string") r.truck_id = s.truck_id;
    if (typeof s.date === "string") r.date = s.date;
    if (typeof s.edit === "string") r.edit = s.edit;
    return r;
  },
  component: NewEvent,
});

/** Forma do search de /agenda/novo (usada por links de outras rotas). */
export interface AgendaNovoSearch {
  truck_id?: string;
  date?: string;
  edit?: string;
}

const TYPES: { v: Enums<"event_type">; label: string }[] = [
  { v: "compromisso", label: "Compromisso" },
  { v: "tarefa", label: "Tarefa" },
  { v: "reuniao", label: "Reunião" },
  { v: "manutencao", label: "Manutenção" },
  { v: "lembrete", label: "Lembrete" },
  { v: "pagamento", label: "Pagamento" },
  { v: "vencimento", label: "Vencimento" },
  { v: "evento", label: "Evento" },
  { v: "outro", label: "Outro" },
];

const RECURRENCE: { v: string; label: string; hint: string }[] = [
  { v: "", label: "Não repetir", hint: "Evento único" },
  { v: "diario", label: "Diária", hint: "Repete todos os dias até 3 meses" },
  { v: "semanal", label: "Semanal", hint: "Mesmo dia da semana até 3 meses" },
  { v: "mensal", label: "Mensal", hint: "Mesmo dia do mês até 3 meses" },
];

const REMINDERS: { v: number; label: string }[] = [
  { v: 0, label: "Sem lembrete" },
  { v: 15, label: "15 min antes" },
  { v: 60, label: "1 hora antes" },
  { v: 1440, label: "1 dia antes" },
  { v: 4320, label: "3 dias antes" },
];

function NewEvent() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const editing = search.edit;
  const invalidateMobile = useInvalidateMobile();

  const { data: trucks } = useTrucks();
  const { data: existing, isLoading: loadingEvent } = useEvent(editing);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(search?.date ?? spaTodayISO());
  const [time, setTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  const [type, setType] = useState<Enums<"event_type">>("compromisso");
  const [recurrence, setRecurrence] = useState<string>("");
  const [reminder, setReminder] = useState(0);
  const [truckId, setTruckId] = useState<string | null>(search?.truck_id ?? null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    const local = isoToSpaISO(existing.starts_at) || `${existing.starts_at?.slice(0, 10) ?? ""}T09:00:00`;
    setTitle(existing.title ?? "");
    setDate(local.slice(0, 10));
    setTime(mdTime(local) === "—" ? "09:00" : mdTime(local));
    setAllDay(Boolean(existing.all_day));
    setType(existing.type ?? "compromisso");
    setRecurrence(existing.recurrence ?? "");
    setReminder(existing.reminder_minutes ?? 0);
    setTruckId(existing.related_truck_id ?? null);
    setAmount(existing.amount != null && existing.amount > 0 ? String(existing.amount) : "");
    setDescription(existing.description ?? "");
  }, [existing]);

  const truckOptions = useMemo(
    () => (trucks ?? []).sort((a, b) => truckTitle(a).localeCompare(truckTitle(b))),
    [trucks],
  );
  const selected = truckOptions.find((t) => t.id === truckId);
  const recur = RECURRENCE.find((r) => r.v === recurrence);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    haptic(8);
    setError(null);
    if (!title.trim()) {
      setError("Informe a descrição do compromisso.");
      hapticError();
      return;
    }
    const value = Number(String(amount).replace(/\s/g, "").replace(".", "").replace(",", "."));
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      starts_at: spaToUtcISO(allDay ? `${date}T09:00:00` : `${date}T${time || "09:00"}:00`),
      type,
      related_truck_id: truckId,
      amount: Number.isFinite(value) && value > 0 ? value : null,
      recurrence: recurrence || null,
      reminder_minutes: reminder > 0 ? reminder : null,
      all_day: allDay,
    };
    setSaving(true);
    try {
      if (editing) await updateEvent(editing, payload);
      else await createEvent(payload);
      invalidateMobile(["calendar_events"]);
      hapticSuccess();
      toast.success(editing ? "Compromisso atualizado" : "Compromisso criado");
      nav({ to: "/agenda" });
    } catch (e) {
      hapticError();
      setError(e instanceof Error ? e.message : "Falha ao salvar compromisso");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!editing) return;
    try {
      await deleteEvent(editing);
      invalidateMobile(["calendar_events"]);
      hapticSuccess();
      nav({ to: "/agenda" });
    } catch (e) {
      hapticError();
      setError(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  if (editing && loadingEvent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/agenda" aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Carregando…</h1>
        </div>
        <div className="h-64 animate-pulse rounded-2xl border bg-card" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/agenda"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card pressable active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{editing ? "Editar compromisso" : "Novo compromisso"}</h1>
      </div>

      <form onSubmit={submit} className="space-y-3 pb-28">
        <FormSection title="Informações">
          <MobileCard className="space-y-3 p-4">
            <Field label="Descrição *">
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Reunião com cliente"
              />
            </Field>
            <Field label="Observações">
              <textarea
                className={cn(inputClass, "h-20 resize-none py-2.5")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes do compromisso (opcional)"
              />
            </Field>
          </MobileCard>
        </FormSection>

        <FormSection title="Data e horário">
          <MobileCard className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data *">
                <input
                  className={inputClass}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="Horário *">
                <input
                  className={cn(inputClass, allDay && "opacity-50")}
                  type="time"
                  value={time}
                  disabled={allDay}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setAllDay((v) => !v)}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className={cn(
                  "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                  allDay ? "bg-gold" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                    allDay && "translate-x-4",
                  )}
                />
              </span>
              <span className="font-medium">Dia inteiro</span>
            </button>
            <Field label="Repetição" hint={recur?.hint}>
              <div className="grid grid-cols-2 gap-1.5">
                {RECURRENCE.map((r) => (
                  <button
                    key={r.v || "none"}
                    type="button"
                    onClick={() => setRecurrence(r.v)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-[13px] font-semibold tap-gold",
                      recurrence === r.v
                        ? "border-gold bg-gold text-gold-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </Field>
          </MobileCard>
        </FormSection>

        <FormSection title="Classificação">
          <MobileCard className="space-y-3 p-4">
            <Field label="Tipo">
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setType(t.v)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[13px] font-semibold tap-gold pressable",
                      type === t.v ? "border-gold bg-gold text-gold-foreground" : "bg-card",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Lembrete">
              <div className="h-row -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
                {REMINDERS.map((r) => (
                  <button
                    key={r.v}
                    type="button"
                    onClick={() => setReminder(r.v)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold tap-gold pressable",
                      reminder === r.v ? "border-gold bg-gold text-gold-foreground" : "bg-card",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </Field>
          </MobileCard>
        </FormSection>

        <FormSection title="Vínculos e valor">
          <MobileCard className="space-y-3 p-4">
            <Field label="Caminhão relacionado">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className={cn(inputClass, "flex items-center justify-between text-left")}
              >
                <span className={selected ? "" : "text-muted-foreground"}>
                  {selected ? `${truckTitle(selected)} · ${selected.plate ?? ""}` : "Nenhum"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </Field>
            <Field label="Valor (R$)" hint="Opcional — aparece na agenda como compromisso monetário.">
              <input
                className={inputClass}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </Field>
          </MobileCard>
        </FormSection>

        {error && (
          <div
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        {editing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 text-sm font-bold text-destructive pressable active:scale-95"
              >
                <Trash2 className="h-4 w-4" /> Excluir compromisso
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
                <AlertDialogDescription>
                  A recorrência desta série não é excluída em conjunto — apenas este registro será
                  removido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-2">
                <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={del}
                  className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <div
          className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur"
        >
          <div className="mx-auto max-w-md">
            <button type="submit" disabled={saving} className={btnGold}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Salvar compromisso"}
            </button>
          </div>
        </div>
      </form>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetTitle className="px-5 pb-2 pt-4 text-base">Selecionar caminhão</SheetTitle>
          <div className="mt-1 max-h-80 overflow-y-auto px-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left tap-gold active:bg-muted/60"
              onClick={() => {
                setTruckId(null);
                setPickerOpen(false);
              }}
            >
              <span className="text-[15px] font-medium">Nenhum</span>
            </button>
            {truckOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left tap-gold active:bg-muted/60"
                onClick={() => {
                  setTruckId(t.id);
                  setPickerOpen(false);
                  haptic(6);
                }}
              >
                <span className="text-[15px] font-medium">{truckTitle(t)}</span>
                <span className="text-xs text-muted-foreground">{t.plate ?? ""}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}