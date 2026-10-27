import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, ReceiptText, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { submitDailyExpense, type ExpenseApprovalRequest } from "@/lib/mobile/expense-approval";
import { brl, dateBR, parseMoney, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState, Field, MobileCard, PageHeader, SkeletonRows, btnGold, btnGhost, inputClass } from "@/components/mobile/ui";

export const Route = createFileRoute("/_app/secretaria/lancamento-do-dia")({ component: DailyExpensePage });

const PAYMENT_METHODS = ["PIX", "Dinheiro", "Cartão", "Transferência", "Boleto", "Cheque"];

function DailyExpensePage() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier: "", amount: "", paymentMethod: "", description: "", urgent: false, bank: "", occurredAt: todayISO(), notes: "" });
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["daily-expenses"],
    enabled: roles.includes("secretaria"),
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_approval_requests").select("*").eq("origin", "daily").order("occurred_at", { ascending: false }).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as ExpenseApprovalRequest[];
    },
  });
  const create = useMutation({
    mutationFn: () => {
      const amount = parseMoney(form.amount, 0);
      if (!form.supplier.trim()) throw new Error("Informe o fornecedor.");
      if (amount <= 0) throw new Error("Informe um valor válido.");
      if (!form.paymentMethod) throw new Error("Informe a forma de pagamento.");
      if (!form.description.trim()) throw new Error("Informe a que se refere o lançamento.");
      return submitDailyExpense({
        supplier: form.supplier.trim(),
        amount,
        payment_method: form.paymentMethod,
        description: form.description.trim(),
        urgent: form.urgent,
        bank: form.bank.trim() || null,
        occurred_at: form.occurredAt,
        notes: form.notes.trim() || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["daily-expenses"] });
      setForm({ supplier: "", amount: "", paymentMethod: "", description: "", urgent: false, bank: "", occurredAt: todayISO(), notes: "" });
      setOpen(false);
      toast.success("Lançamento enviado para aprovação do executivo.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Falha ao salvar lançamento."),
  });
  const grouped = useMemo(() => rows.reduce((map, row) => {
    const key = row.occurred_at?.slice(0, 10) ?? "sem-data";
    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
    return map;
  }, new Map<string, ExpenseApprovalRequest[]>()), [rows]);

  return (
    <div className="space-y-4">
      <PageHeader title="Lançamento do dia" subtitle="Registre as despesas da operação para confirmação do Executivo." backTo="/menu" right={<button type="button" className={btnGold} onClick={() => setOpen((value) => !value)}>{open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {open ? "Fechar" : "Novo lançamento"}</button>} />
      {open && <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <MobileCard className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Fornecedor *"><input className={inputClass} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} placeholder="Nome do fornecedor" /></Field>
          <Field label="Valor *"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" /></Field>
          <Field label="Forma de pagamento *"><select className={inputClass} value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="">Selecione</option>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></Field>
          <Field label="Referente a *"><input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descrição do lançamento" /></Field>
          <Field label="Banco"><input className={inputClass} value={form.bank} onChange={(event) => setForm({ ...form, bank: event.target.value })} placeholder="Nome do banco, se aplicável" /></Field>
          <Field label="Data do lançamento"><input className={inputClass} type="date" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} /></Field>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3.5 text-sm font-semibold"><input type="checkbox" checked={form.urgent} onChange={(event) => setForm({ ...form, urgent: event.target.checked })} className="h-4 w-4 accent-gold" /> Urgente</label>
          <Field label="Observações"><textarea className={cn(inputClass, "min-h-20 py-2 sm:col-span-2")} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={create.isPending} className={btnGold}>{create.isPending ? "Enviando..." : "Enviar para aprovação"}</button><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancelar</button></div>
        </MobileCard>
      </form>}
      {isLoading ? <SkeletonRows rows={4} height={72} /> : isError ? <EmptyState title="Não foi possível carregar os lançamentos" hint="Tente novamente em alguns instantes." onAction={() => void refetch()} actionLabel="Tentar novamente" /> : grouped.size === 0 ? <EmptyState title="Nenhum lançamento diário" hint="As despesas registradas aparecerão separadas por dia." /> : <div className="space-y-5">{Array.from(grouped.entries()).map(([date, expenses]) => <section key={date}><div className="mb-2 flex items-center gap-2 rounded-xl bg-gold/10 px-3 py-2 text-sm font-bold uppercase"><CalendarDays className="h-4 w-4 text-gold" /> Lançamentos de {date === "sem-data" ? "data não informada" : dateBR(date)}</div><MobileCard className="divide-y divide-border/60">{expenses.map((expense) => <div key={expense.id} className="space-y-2 p-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-gold" /><span className="font-bold">Lançamento</span></div><div className={cn("text-[10px] font-bold uppercase", expense.status === "approved" ? "text-success" : expense.status === "returned" ? "text-destructive" : "text-warning")}>{expense.status === "approved" ? "Aprovada" : expense.status === "returned" ? "Devolvida" : "Aguardando aprovação"}</div></div><DetailLine label="FORNECEDOR" value={expense.supplier ?? "Não informado"} /><DetailLine label="VALOR" value={brl(expense.amount)} /><DetailLine label="FORMA" value={expense.payment_method ?? "Não informado"} /><DetailLine label="REFERENTE A" value={expense.description} /><DetailLine label="URGENTE" value={expense.urgent ? "Sim" : "Não"} /><DetailLine label="BANCO" value={expense.bank ?? "Não informado"} />{expense.notes && <DetailLine label="OBSERVAÇÕES" value={expense.notes} />}{expense.correction_note && <div className="rounded-lg bg-destructive/10 px-2.5 py-2 text-xs text-destructive">Correção: {expense.correction_note}</div>}</div>)}</MobileCard></section>)}</div>}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const icons: Record<string, string> = { FORNECEDOR: "👤", VALOR: "💰", FORMA: "💳", "REFERENTE A": "🧾", URGENTE: "⚠️", BANCO: "🏦", OBSERVAÇÕES: "📝" };
  return <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm"><span className="font-bold text-muted-foreground">{icons[label] ? `${icons[label]} ` : ""}{label}:</span><span className="min-w-0 break-words font-medium">{value}</span></div>;
}
