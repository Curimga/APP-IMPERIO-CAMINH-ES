import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard } from "@/components/mobile/ui";
import { useTrucks } from "@/lib/mobile/queries";
import { createEvent } from "@/lib/mobile/actions";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { truckTitle } from "@/lib/truck-title";
import { spaTodayISO } from "@/lib/mobile/dates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/agenda/novo")({
  validateSearch: (s: Record<string, unknown>) => ({
    truck_id: typeof s.truck_id === "string" ? s.truck_id : undefined,
  }),
  component: NewEvent,
});

const TYPES: { v: Enums<"event_type">; label: string }[] = [
  { v: "compromisso", label: "Compromisso" },
  { v: "tarefa", label: "Tarefa" },
  { v: "reuniao", label: "Reunião" },
  { v: "manutencao", label: "Manutenção" },
  { v: "lembrete", label: "Lembrete" },
  { v: "outro", label: "Outro" },
];

function NewEvent() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const { data: trucks } = useTrucks();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(spaTodayISO());
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState<Enums<"event_type">>("compromisso");
  const [truckId, setTruckId] = useState<string | null>(search?.truck_id ?? null);
  const [amount, setAmount] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const truckOptions = useMemo(
    () => (trucks ?? []).sort((a, b) => truckTitle(a).localeCompare(truckTitle(b))),
    [trucks],
  );
  const selected = truckOptions.find((t) => t.id === truckId);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Informe a descrição do compromisso.");
    setSaving(true);
    try {
      const value = Number(amount.replace(/[^\d.]/g, ""));
      await createEvent({
        title: title.trim(),
        starts_at: `${date}T${time || "09:00"}:00`,
        type,
        related_truck_id: truckId,
        amount: Number.isFinite(value) && value > 0 ? value : null,
      });
      toast.success("Compromisso criado");
      nav({ to: "/agenda" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar compromisso");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/agenda"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Novo compromisso</h1>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <MobileCard className="space-y-3 p-4">
          <Field label="Descrição *">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Reunião com cliente"
            />
          </Field>
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
                className={inputClass}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Tipo">
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                    type === t.v ? "border-gold bg-gold text-gold-foreground" : "bg-background",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
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
          <Field label="Valor (R$)" hint="Opcional — vinculado ao financeiro.">
            <input
              className={inputClass}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </Field>
        </MobileCard>

        {error && (
          <div
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={saving} className={btnGold}>
          {saving ? "Salvando..." : "Salvar compromisso"}
        </button>
        <Link to="/agenda" className={btnGhost + " flex items-center justify-center"}>
          Cancelar
        </Link>
      </form>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetTitle className="px-5 pb-2 pt-4 text-base">Selecionar caminhão</SheetTitle>
          <div className="mt-1 max-h-80 overflow-y-auto px-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-muted/60"
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
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-muted/60"
                onClick={() => {
                  setTruckId(t.id);
                  setPickerOpen(false);
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
