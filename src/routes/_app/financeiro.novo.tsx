import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard, FormSection, EmptyState } from "@/components/mobile/ui";
import {
  useFinancialCategories,
  useBankAccounts,
  useTrucks,
  useCustomers,
} from "@/lib/mobile/queries";
import { createPayable, createReceivable } from "@/lib/mobile/actions";
import type { PaymentInput } from "@/lib/mobile/payment-rows";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";
import { useAuth } from "@/hooks/use-auth";
import { canEditFinance } from "@/lib/mobile/perm";
import { spaTodayISO } from "@/lib/mobile/dates";
import { parseMoney } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/financeiro/novo")({
  component: NewFinanceEntry,
});

/**
 * Novo lançamento financeiro — criação REAL de `payables`/`receivables` no
 * banco do CRM. Exclusivo do Executivo (guardar o botão, a rota e a mutation;
 * a mutation também confere o cargo no `user_roles`).
 */
function NewFinanceEntry() {
  const nav = useNavigate();
  const { roles } = useAuth();
  const invalidateMobile = useInvalidateMobile();
  const { data: categories } = useFinancialCategories();
  const { data: banks } = useBankAccounts();
  const { data: trucks } = useTrucks();
  const { data: customers } = useCustomers("");

  const [kind, setKind] = useState<"pagar" | "receber">("pagar");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(spaTodayISO());
  const [occurredAt, setOccurredAt] = useState(spaTodayISO());
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<Enums<"payment_method"> | "">("");
  const [installments, setInstallments] = useState(1);
  const [urgent, setUrgent] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEditFinance(roles)) {
    return (
      <EmptyState
        title="Você não possui permissão para esta ação"
        hint="Lançamentos financeiros são restritos ao Executivo."
        actionLabel="Voltar ao Financeiro"
        onAction={() => nav({ to: "/financeiro" })}
      />
    );
  }

  const paymentMethods: Enums<"payment_method">[] = [
    "PIX",
    "BOLETO",
    "TRANSFERENCIA",
    "DINHEIRO",
    "CARTAO",
    "OUTRO",
  ];
  const kindHint = kind === "pagar" ? /saida|pagar|despesa/i : /entrada|receber|receita/i;
  const kindCategories = (categories ?? []).filter((c) => !c.kind || kindHint.test(c.kind));
  const categoryOptions = kindCategories.length > 0 ? kindCategories : (categories ?? []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    const value = parseMoney(amount);
    if (value <= 0) return setError("Informe um valor válido maior que zero.");
    if (!description.trim()) return setError("Informe a descrição do lançamento.");
    if (!dueDate) return setError("Informe o vencimento.");

    const input: PaymentInput = {
      kind,
      description: description.trim(),
      amount: value,
      due_date: dueDate,
      occurred_at: occurredAt || spaTodayISO(),
      category_id: categoryId || null,
      bank_account_id: bankAccountId || null,
      supplier: kind === "pagar" ? supplier.trim() || null : null,
      customer_id: kind === "receber" ? customerId || null : null,
      truck_id: truckId || null,
      payment_method: paymentMethod || null,
      is_urgent: urgent,
      notes: notes.trim() || null,
      installments,
    };

    setSaving(true);
    try {
      if (kind === "pagar") await createPayable(input);
      else await createReceivable(input);
      invalidateMobile(["payables", "receivables", "financial_categories", "bank_accounts"]);
      toast.success(kind === "pagar" ? "Conta a pagar criada" : "Conta a receber criada");
      nav({ to: "/financeiro" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar lançamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/financeiro"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Novo lançamento</h1>
      </div>

      <form id="finance-entry-form" onSubmit={submit} className="space-y-3 pb-28">
        <FormSection title="Tipo">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("pagar")}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold pressable active:scale-95",
                kind === "pagar" ? "border-destructive/60 bg-destructive/10 text-destructive" : "bg-card",
              )}
            >
              <TrendingDown className="h-4 w-4" /> A pagar
            </button>
            <button
              type="button"
              onClick={() => setKind("receber")}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold pressable active:scale-95",
                kind === "receber" ? "border-success/60 bg-success/10 text-success" : "bg-card",
              )}
            >
              <TrendingUp className="h-4 w-4" /> A receber
            </button>
          </div>
        </FormSection>

        <FormSection title="Dados">
          <MobileCard className="space-y-3 p-4">
            <Field label="Descrição *">
              <input
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={kind === "pagar" ? "Ex.: troca de embreagem" : "Ex.: venda do caminhão"}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$) *">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Parcelas" hint="Entre 1 e 24">
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={24}
                  value={installments}
                  onChange={(e) =>
                    setInstallments(Math.min(24, Math.max(1, Math.trunc(Number(e.target.value) || 1))))
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vencimento *">
                <input
                  className={inputClass}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
              <Field label="Competência">
                <input
                  className={inputClass}
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Categoria">
              <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Conta bancária">
              <select className={inputClass} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                <option value="">Sem conta vinculada</option>
                {(banks ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.bank ? ` · ${b.bank}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Forma de pagamento">
              <select
                className={inputClass}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as Enums<"payment_method"> | "")}
              >
                <option value="">Selecionar</option>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </MobileCard>
        </FormSection>

        <FormSection title="Vínculos">
          <MobileCard className="space-y-3 p-4">
            {kind === "pagar" ? (
              <Field label="Fornecedor">
                <input
                  className={inputClass}
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ex.: Borracharia Silva"
                />
              </Field>
            ) : (
              <Field label="Cliente">
                <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Sem cliente vinculado</option>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Caminhão">
              <select className={inputClass} value={truckId} onChange={(e) => setTruckId(e.target.value)}>
                <option value="">Sem caminhão vinculado</option>
                {(trucks ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.brand} {t.model} {t.plate ? `· ${t.plate}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Observações">
              <textarea
                className={cn(inputClass, "h-20 resize-none py-2.5")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <button type="button" onClick={() => setUrgent((v) => !v)} className="flex items-center gap-2 text-sm">
              <span className={cn("flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", urgent ? "bg-destructive" : "bg-muted")}>
                <span className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-transform", urgent && "translate-x-4")} />
              </span>
              <span className="font-medium">Marcar como urgente</span>
            </button>
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
      </form>

      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <Link to="/financeiro" className={btnGhost + " h-12 w-24 shrink-0"}>
            Cancelar
          </Link>
          <button type="submit" form="finance-entry-form" disabled={saving} className={btnGold}>
            {saving ? "Salvando..." : "Criar lançamento"}
          </button>
        </div>
      </div>
    </>
  );
}