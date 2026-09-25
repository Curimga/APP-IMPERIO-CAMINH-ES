import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard, EmptyState } from "@/components/mobile/ui";
import { useTrucks, useCustomers } from "@/lib/mobile/queries";
import { createPayment } from "@/lib/mobile/actions";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { truckTitle } from "@/lib/truck-title";
import { todayISO, parseMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { isFinanceExecutive } from "@/lib/mobile/perm";
import type { Enums } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/pagamentos/novo")({
  component: NewPayment,
});

const KIND_OPTIONS: { v: "pagar" | "receber"; label: string }[] = [
  { v: "pagar", label: "Pagar" },
  { v: "receber", label: "Receber" },
];

const PAYMENT_METHODS = ["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "OUTRO"] as const;

function NewPayment() {
  const { roles, user } = useAuth();
  const nav = useNavigate();
  const invalidateMobile = useInvalidateMobile();
  const { data: trucks } = useTrucks();
  const [kind, setKind] = useState<"pagar" | "receber">("pagar");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [supplier, setSupplier] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [truckId, setTruckId] = useState<string | null>(null);
  const [installmentNumber, setInstallmentNumber] = useState("");
  const [installmentTotal, setInstallmentTotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [truckPickerOpen, setTruckPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: customers } = useCustomers(customerQuery);
  const truckOptions = useMemo(
    () => (trucks ?? []).sort((a, b) => truckTitle(a).localeCompare(truckTitle(b))),
    [trucks],
  );
  const selectedTruck = truckOptions.find((t) => t.id === truckId);
  const selectedCustomer = (customers ?? []).find((c) => c.id === customerId);

  if (!isFinanceExecutive(roles, user?.email)) {
    return (
      <EmptyState
        title="Você não possui permissão para esta ação"
        hint="Criar lançamentos financeiros é exclusivo do Executivo."
        actionLabel="Voltar para o início"
        onAction={() => nav({ to: "/" })}
      />
    );
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!description.trim()) return setError("Informe a descrição do lançamento.");
    const val = parseMoney(amount);
    if (val <= 0) return setError("Informe um valor válido maior que zero.");
    if (!dueDate) return setError("Informe o vencimento.");
    const installmentN = installmentNumber ? Number(installmentNumber.replace(/\D/g, "")) : null;
    const installmentT = installmentTotal ? Number(installmentTotal.replace(/\D/g, "")) : null;
    setSaving(true);
    try {
      await createPayment({
        kind,
        description: description.trim(),
        amount: val,
        due_date: dueDate,
        supplier: kind === "pagar" ? supplier.trim() || null : null,
        customer_id: kind === "receber" ? customerId : null,
        truck_id: truckId,
        installment_number: kind === "receber" ? installmentN : null,
        installment_total: kind === "receber" ? installmentT : null,
        payment_method: paymentMethod ? (paymentMethod as Enums<"payment_method">) : null,
        notes: notes.trim() || null,
      });
      invalidateMobile(["payables", "receivables"]);
      nav({ to: "/agenda", search: { view: "pagamentos" } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar pagamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/agenda"
          search={{ view: "pagamentos" }}
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Novo pagamento</h1>
      </div>

      <form id="payment-form" onSubmit={submit} className="space-y-3 pb-28">
        <MobileCard className="space-y-3 p-4">
          <Field label="Tipo *">
            <div className="grid grid-cols-2 gap-1.5">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k.v}
                  type="button"
                  onClick={() => setKind(k.v)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-[13px] font-bold",
                    kind === k.v
                      ? k.v === "pagar"
                        ? "border-gold bg-gold text-gold-foreground"
                        : "border-success bg-success text-success-foreground"
                      : "bg-background text-muted-foreground",
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Descrição *">
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={kind === "pagar" ? "Ex.: boleto do despachante" : "Ex.: venda à vista"}
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
            <Field label="Vencimento *">
              <input
                className={inputClass}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>
        </MobileCard>

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
              <button
                type="button"
                onClick={() => setCustomerPickerOpen(true)}
                className={cn(inputClass, "flex items-center justify-between text-left")}
              >
                <span className={selectedCustomer ? "" : "text-muted-foreground"}>
                  {selectedCustomer?.name ?? "Selecionar cliente"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </Field>
          )}
          <Field label="Caminhão relacionado">
            <button
              type="button"
              onClick={() => setTruckPickerOpen(true)}
              className={cn(inputClass, "flex items-center justify-between text-left")}
            >
              <span className={selectedTruck ? "" : "text-muted-foreground"}>
                {selectedTruck ? `${truckTitle(selectedTruck)} · ${selectedTruck.plate ?? ""}` : "Nenhum"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </Field>
          <Field label="Forma de pagamento">
            <select
              className={inputClass}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="">Não informado</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          {kind === "receber" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Parcela nº">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={installmentNumber}
                  onChange={(e) => setInstallmentNumber(e.target.value)}
                  placeholder="Ex.: 1"
                />
              </Field>
              <Field label="Total de parcelas">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={installmentTotal}
                  onChange={(e) => setInstallmentTotal(e.target.value)}
                  placeholder="Ex.: 12"
                />
              </Field>
            </div>
          ) : null}
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
          <Link
            to="/agenda"
            search={{ view: "pagamentos" }}
            className={btnGhost + " h-12 w-24 shrink-0"}
          >
            Cancelar
          </Link>
          <button type="submit" form="payment-form" disabled={saving} className={btnGold}>
            {saving ? "Salvando..." : "Salvar pagamento"}
          </button>
        </div>
      </div>

      <Sheet open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetTitle className="px-5 pb-2 pt-4 text-base">Selecionar cliente</SheetTitle>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={cn(inputClass, "pl-9")}
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Buscar cliente..."
              />
            </div>
          </div>
          <div className="mt-1 max-h-80 overflow-y-auto px-2">
            {(customers ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-muted/60"
                onClick={() => {
                  setCustomerId(c.id);
                  setCustomerPickerOpen(false);
                }}
              >
                <span className="text-[15px] font-medium">{c.name}</span>
                {c.phone || c.city ? (
                  <span className="text-xs text-muted-foreground">
                    {[c.phone, c.city].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </button>
            ))}
            {(customers ?? []).length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                Nenhum cliente encontrado.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={truckPickerOpen} onOpenChange={setTruckPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetTitle className="px-5 pb-2 pt-4 text-base">Selecionar caminhão</SheetTitle>
          <div className="mt-1 max-h-80 overflow-y-auto px-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-muted/60"
              onClick={() => {
                setTruckId(null);
                setTruckPickerOpen(false);
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
    </>
  );
}
