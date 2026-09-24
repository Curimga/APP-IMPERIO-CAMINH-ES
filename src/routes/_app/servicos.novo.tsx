import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard } from "@/components/mobile/ui";
import { useTrucks, useSuppliers } from "@/lib/mobile/queries";
import { createService } from "@/lib/mobile/actions";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { truckTitle } from "@/lib/truck-title";
import { spaTodayISO } from "@/lib/mobile/dates";
import { parseMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/servicos/novo")({
  validateSearch: (s: Record<string, unknown>) => {
    const r: { truck_id?: string } = {};
    if (typeof s.truck_id === "string") r.truck_id = s.truck_id;
    return r;
  },
  component: NewService,
});

const CATEGORIES = ["mecanica", "funilaria", "pintura", "eletrica", "despachante", "pneus"] as const;

const STATUS_OPTIONS: { v: Enums<"service_status">; label: string }[] = [
  { v: "pendente", label: "Pendente" },
  { v: "em_andamento", label: "Em andamento" },
  { v: "concluido", label: "Concluído" },
];

function NewService() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const invalidateMobile = useInvalidateMobile();
  const { data: trucks } = useTrucks();
  const { data: suppliers } = useSuppliers();
  const [truckId, setTruckId] = useState<string | null>(search.truck_id ?? null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [status, setStatus] = useState<Enums<"service_status">>("em_andamento");
  const [value, setValue] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [truckPickerOpen, setTruckPickerOpen] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const truckOptions = useMemo(
    () => (trucks ?? []).sort((a, b) => truckTitle(a).localeCompare(truckTitle(b))),
    [trucks],
  );
  const supplierOptions = useMemo(
    () => (suppliers ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers],
  );
  const selected = truckOptions.find((t) => t.id === truckId);
  const selectedSupplier = supplierOptions.find((s) => s.id === supplierId);
  const categoryLabel = (v: string) => {
    const labels: Record<string, string> = {
      mecanica: "Mecânica",
      funilaria: "Funilaria",
      pintura: "Pintura",
      eletrica: "Elétrica",
      despachante: "Despachante",
      pneus: "Pneus",
    };
    return labels[v] ?? v;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!truckId) return setError("Selecione o caminhão.");
    if (!title.trim()) return setError("Informe o título do serviço.");
    const valueNum = value ? parseMoney(value) : null;
    const totalValueNum = totalValue ? parseMoney(totalValue) : null;
    const downPaymentNum = downPayment ? parseMoney(downPayment) : null;
    setSaving(true);
    try {
      await createService({
        truck_id: truckId,
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        supplier_id: supplierId || null,
        notes: notes.trim() || null,
        expected_at: expectedAt ? `${expectedAt}T12:00:00` : null,
        value: valueNum,
        total_value: totalValueNum,
        down_payment: downPaymentNum,
        status,
      });
      invalidateMobile(["services", "trucks"]);
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
              onClick={() => setTruckPickerOpen(true)}
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
          <Field label="Título *">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: troca de embreagem"
            />
          </Field>
          <Field label="Categoria">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? "" : c)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                    category === c ? "border-gold bg-gold text-gold-foreground" : "bg-background",
                  )}
                >
                  {categoryLabel(c)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Situação">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => setStatus(s.v)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                    status === s.v ? "border-gold bg-gold text-gold-foreground" : "bg-background",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Fornecedor">
            <button
              type="button"
              onClick={() => setSupplierPickerOpen(true)}
              className={cn(inputClass, "flex items-center justify-between text-left")}
            >
              <span className={selectedSupplier ? "" : "text-muted-foreground"}>
                {selectedSupplier?.name ?? "Selecionar fornecedor"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </Field>
          <Field label="Descrição">
            <textarea
              className={inputClass + " min-h-20 resize-y py-2"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Observações">
            <textarea
              className={inputClass + " min-h-20 resize-y py-2"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </MobileCard>

        <MobileCard className="space-y-3 p-4">
          <Field label="Previsão de conclusão">
            <input
              className={inputClass}
              type="date"
              value={expectedAt}
              min={spaTodayISO()}
              onChange={(e) => setExpectedAt(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input
                className={inputClass}
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
              />
            </Field>
            <Field label="Valor total (R$)">
              <input
                className={inputClass}
                inputMode="decimal"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="0,00"
              />
            </Field>
          </div>
          <Field label="Entrada / Adiantamento (R$)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
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

      <Sheet open={truckPickerOpen} onOpenChange={setTruckPickerOpen}>
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
                  setTruckPickerOpen(false);
                }}
              >
                <span className="text-[15px] font-medium">{truckTitle(t)}</span>
                <span className="text-xs text-muted-foreground">{t.plate ?? ""}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={supplierPickerOpen} onOpenChange={setSupplierPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetTitle className="px-5 pb-2 pt-4 text-base">Selecionar fornecedor</SheetTitle>
          <div className="mt-1 max-h-80 overflow-y-auto px-2">
            {supplierOptions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-muted/60"
                onClick={() => {
                  setSupplierId(s.id);
                  setSupplierPickerOpen(false);
                }}
              >
                <span className="text-[15px] font-medium">{s.name}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}