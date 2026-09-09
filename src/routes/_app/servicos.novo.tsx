import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard } from "@/components/mobile/ui";
import { useTrucks } from "@/lib/mobile/queries";
import { createService } from "@/lib/mobile/actions";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { truckTitle } from "@/lib/truck-title";
import { spaTodayISO } from "@/lib/mobile/dates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/servicos/novo")({
  validateSearch: (s: Record<string, unknown>) => ({
    truck_id: typeof s.truck_id === "string" ? s.truck_id : undefined,
  }),
  component: NewService,
});

function NewService() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const { data: trucks } = useTrucks();
  const [truckId, setTruckId] = useState<string | null>(search.truck_id ?? null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [value, setValue] = useState("");
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
    if (!truckId) return setError("Selecione o caminhão.");
    if (!title.trim()) return setError("Informe a descrição do serviço.");
    setSaving(true);
    try {
      const val = Number(value.replace(/[^\d.]/g, ""));
      await createService({
        truck_id: truckId,
        title: title.trim(),
        notes: notes.trim() || null,
        expected_at: expectedAt ? `${expectedAt}T12:00:00` : null,
        value: Number.isFinite(val) && val > 0 ? val : null,
        status: "em_andamento",
      });
      toast.success("Serviço criado");
      nav({ to: "/servicos", search: { truck_id: undefined } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar serviço");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/servicos"
          search={{ truck_id: undefined }}
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Novo serviço</h1>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <MobileCard className="space-y-3 p-4">
          <Field label="Caminhão *">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={cn(inputClass, "flex items-center justify-between text-left")}
            >
              <span className={selected ? "" : "text-muted-foreground"}>
                {selected
                  ? `${truckTitle(selected)} · ${selected.plate ?? ""}`
                  : "Selecionar caminhão"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </Field>
          <Field label="Descrição *">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: troca de embreagem"
            />
          </Field>
          <Field label="Observações">
            <textarea
              className={inputClass + " min-h-20 resize-y py-2"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Previsão de conclusão">
              <input
                className={inputClass}
                type="date"
                value={expectedAt}
                min={spaTodayISO()}
                onChange={(e) => setExpectedAt(e.target.value)}
              />
            </Field>
            <Field label="Valor (R$)">
              <input
                className={inputClass}
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
              />
            </Field>
          </div>
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
          {saving ? "Salvando..." : "Salvar serviço"}
        </button>
        <Link
          to="/servicos"
          search={{ truck_id: undefined }}
          className={btnGhost + " flex items-center justify-center"}
        >
          Cancelar
        </Link>
      </form>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetTitle className="px-5 pb-2 pt-4 text-base">Selecionar caminhão</SheetTitle>
          <div className="mt-1 max-h-80 overflow-y-auto px-2">
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
