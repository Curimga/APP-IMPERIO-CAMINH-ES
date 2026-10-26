import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ReceiptText, X } from "lucide-react";
import { createGeneralExpense } from "@/lib/mobile/actions";
import { useGeneralExpenses } from "@/lib/mobile/queries";
import {
  EmptyState,
  Field,
  MobileCard,
  PageHeader,
  SectionTitle,
  SkeletonRows,
  btnGold,
  inputClass,
} from "@/components/mobile/ui";
import { brl, dateBR, parseMoney, todayISO } from "@/lib/format";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/despesas")({
  component: GeneralExpensesPage,
});

const CATEGORIES = [
  ["administrativo", "Administrativo"],
  ["aluguel", "Aluguel"],
  ["energia", "Energia"],
  ["agua", "Água"],
  ["internet", "Internet"],
  ["marketing", "Marketing"],
  ["material_escritorio", "Material de escritório"],
  ["impostos", "Impostos"],
  ["outros", "Outros"],
] as const;

function GeneralExpensesPage() {
  const { data, isLoading, isError } = useGeneralExpenses();
  const invalidateMobile = useInvalidateMobile();
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("administrativo");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("pago");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory("administrativo");
    setSupplier("");
    setStatus("pago");
    setPaymentMethod("");
    setOccurredAt(todayISO());
    setDueDate("");
    setNotes("");
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const value = parseMoney(amount, 0);
    if (!description.trim()) return setError("Informe a descrição da despesa.");
    if (!Number.isFinite(value) || value <= 0) return setError("Informe um valor válido maior que zero.");

    setSaving(true);
    try {
      await createGeneralExpense({
        truck_id: null,
        amount: value,
        description: description.trim(),
        category,
        supplier: supplier.trim() || null,
        status,
        payment_method: paymentMethod || null,
        occurred_at: `${occurredAt}T12:00:00`,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      });
      invalidateMobile(["general_expenses"]);
      resetForm();
      setFormOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registrar despesa.");
    } finally {
      setSaving(false);
    }
  };

  const expenses = data ?? [];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Despesas gerais"
        subtitle="Despesas administrativas sem vínculo com caminhões"
        right={
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-3 text-sm font-bold text-gold-foreground"
          >
            {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {formOpen ? "Fechar" : "Nova"}
          </button>
        }
      />

      {formOpen && (
        <form onSubmit={submit} className="space-y-3">
          <MobileCard className="space-y-3 p-4">
            <Field label="Descrição *">
              <input
                className={inputClass}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex.: conta de energia"
              />
            </Field>
            <Field label="Valor (R$) *">
              <input
                className={inputClass}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
              />
            </Field>
            <Field label="Categoria">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                      category === value ? "border-gold bg-gold text-gold-foreground" : "bg-background",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data *">
                <input
                  className={inputClass}
                  type="date"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                />
              </Field>
              <Field label="Vencimento">
                <input
                  className={inputClass}
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </Field>
              <Field label="Pagamento">
                <select
                  className={inputClass}
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="">Não informado</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO">Cartão</option>
                </select>
              </Field>
            </div>
            <Field label="Fornecedor">
              <input
                className={inputClass}
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                placeholder="Opcional"
              />
            </Field>
            <Field label="Observações">
              <textarea
                className={cn(inputClass, "min-h-20 resize-y py-2")}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <button type="submit" disabled={saving} className={btnGold}>
              {saving ? "Salvando..." : "Registrar despesa"}
            </button>
          </MobileCard>
        </form>
      )}

      <section>
        <SectionTitle>Últimos lançamentos</SectionTitle>
        {isLoading ? (
          <SkeletonRows rows={5} height={64} />
        ) : isError ? (
          <EmptyState title="Não foi possível carregar" hint="Tente novamente em alguns instantes." />
        ) : expenses.length === 0 ? (
          <EmptyState title="Nenhuma despesa geral" hint="Os lançamentos sem caminhão aparecerão aqui." />
        ) : (
          <MobileCard className="divide-y divide-border/60">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-start gap-3 px-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                  <ReceiptText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{expense.description}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {dateBR(expense.occurred_at)} · {expense.category.replaceAll("_", " ")}
                  </div>
                  {expense.supplier && <div className="truncate text-[11px] text-muted-foreground">{expense.supplier}</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[14px] font-bold tabular-nums">{brl(expense.amount)}</div>
                  <div className={cn("text-[10px] font-bold uppercase", expense.status === "pago" ? "text-success" : "text-warning")}>
                    {expense.status ?? "pendente"}
                  </div>
                </div>
              </div>
            ))}
          </MobileCard>
        )}
      </section>
    </div>
  );
}
