import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard } from "@/components/mobile/ui";
import { useTrucks } from "@/lib/mobile/queries";
import { createGeneralExpense } from "@/lib/mobile/actions";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { truckTitle } from "@/lib/truck-title";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";

export const Route = createFileRoute("/_app/garagem/$truckId/despesa")({
  component: RegisterExpense,
});

/**
 * Categorias de despesa no padrão do CRM (`app_truck_expense_kind`).
 * O CRM guarda estas mesmas categorias em `general_expenses.category`.
 */
const KINDS: { v: Enums<"app_truck_expense_kind">; label: string }[] = [
  { v: "manutencao", label: "Manutenção" },
  { v: "combustivel", label: "Combustível" },
  { v: "documentacao", label: "Documentação" },
  { v: "transporte", label: "Transporte" },
  { v: "impostos", label: "Impostos" },
  { v: "reforma", label: "Reforma" },
  { v: "pecas_caminhao", label: "Peças" },
  { v: "lavagem", label: "Lavagem" },
  { v: "pneu", label: "Pneu" },
  { v: "colaborador", label: "Colaborador" },
  { v: "caminhao", label: "Caminhão" },
  { v: "outros", label: "Outros" },
];

const STATUS_OPTIONS: { v: string; label: string }[] = [
  { v: "pago", label: "Pago" },
  { v: "pendente", label: "Pendente" },
];

const PAYMENT_METHODS = ["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "OUTRO"] as const;

function RegisterExpense() {
  const nav = useNavigate();
  const { truckId } = useParams({ from: Route.id });
  const { data: trucks } = useTrucks();
  const invalidateMobile = useInvalidateMobile();
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(truckId);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<Enums<"app_truck_expense_kind">>("manutencao");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState<string>("pago");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const truckOptions = useMemo(
    () => (trucks ?? []).sort((a, b) => truckTitle(a).localeCompare(truckTitle(b))),
    [trucks],
  );
  const selected = truckOptions.find((t) => t.id === selectedTruckId);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!selectedTruckId) return setError("Selecione o caminhão.");
    const val = Number(amount.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(val) || val <= 0) {
      setError("Informe um valor válido maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await createGeneralExpense({
        truck_id: selectedTruckId,
        category: kind,
        description: description.trim() || null,
        notes: notes.trim() || null,
        amount: Number(val.toFixed(2)),
        supplier: supplier.trim() || null,
        status: status || null,
        payment_method: paymentMethod || null,
        occurred_at: occurredAt || null,
        due_date: dueDate || null,
      });
      toast.success("Despesa registrada");
      invalidateMobile(["general_expenses", "trucks"]);
      nav({ to: "/garagem/$truckId", params: { truckId: selectedTruckId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao registrar despesa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/garagem"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Registrar despesa</h1>
      </div>

      <form id="expense-form" onSubmit={submit} className="space-y-3 pb-28">
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
          <Field label="Valor (R$) *">
            <input
              className={inputClass}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Tipo *">
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.v}
                  type="button"
                  onClick={() => setKind(k.v)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                    kind === k.v ? "border-gold bg-gold text-gold-foreground" : "bg-background",
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Descrição">
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: troca de pneus"
            />
          </Field>
          <Field label="Fornecedor">
            <input
              className={inputClass}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Ex.: Borracharia Silva"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setStatus(s.v)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold",
                      status === s.v
                        ? s.v === "pago"
                          ? "border-success bg-success text-success-foreground"
                          : "border-gold bg-gold text-gold-foreground"
                        : "bg-background",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Pagamento">
              <select
                className={inputClass}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">Selecionar</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input
                className={inputClass}
                type="date"
                value={occurredAt}
                max={todayISO()}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </Field>
            <Field label="Vencimento">
              <input
                className={inputClass}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Observações">
            <textarea
              className={inputClass + " min-h-20 resize-y py-2"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
      </form>

      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <Link to="/garagem" className={btnGhost + " h-12 w-24 shrink-0"}>
            Cancelar
          </Link>
          <button
            type="submit"
            form="expense-form"
            disabled={saving}
            className={btnGold}
          >
            {saving ? "Salvando..." : "Salvar despesa"}
          </button>
        </div>
      </div>

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
                  setSelectedTruckId(t.id);
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