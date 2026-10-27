import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, ReceiptText, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { submitExpenseConfirmation, type ExpenseApprovalRequest } from "@/lib/mobile/expense-approval";
import { brl, dateBR, parseMoney, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState, Field, MobileCard, PageHeader, SkeletonRows, btnGold, btnGhost, inputClass } from "@/components/mobile/ui";

export const Route = createFileRoute("/_app/secretaria/lancamento-do-dia")({ component: DailyExpensePage });

const CATEGORIES = ["administrativo", "aluguel", "energia", "agua", "internet", "marketing", "material_escritorio", "impostos", "outros"];

function DailyExpensePage() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "outros", supplier: "", occurredAt: todayISO(), status: "pago", notes: "" });
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
      if (!form.description.trim()) throw new Error("Informe a descrição.");
      if (amount <= 0) throw new Error("Informe um valor válido.");
      return submitExpenseConfirmation({
        target_type: "general_expense",
        origin: "daily",
        proposed_category: form.category,
        amount,
        description: form.description.trim(),
        occurred_at: form.occurredAt,
        supplier: form.supplier.trim() || null,
        notes: form.notes.trim() || null,
        proposed_status: form.status,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["daily-expenses"] });
      setForm({ description: "", amount: "", category: "outros", supplier: "", occurredAt: todayISO(), status: "pago", notes: "" });
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
          <Field label="Descrição *"><input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <Field label="Valor (R$) *"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" /></Field>
          <Field label="Categoria"><select className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select></Field>
          <Field label="Fornecedor"><input className={inputClass} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} /></Field>
          <Field label="Data da despesa"><input className={inputClass} type="date" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} /></Field>
          <Field label="Status financeiro"><select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="pago">Pago</option><option value="pendente">Pendente</option></select></Field>
          <Field label="Observações"><textarea className={cn(inputClass, "min-h-20 py-2 sm:col-span-2")} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={create.isPending} className={btnGold}>{create.isPending ? "Enviando..." : "Enviar para aprovação"}</button><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancelar</button></div>
        </MobileCard>
      </form>}
      {isLoading ? <SkeletonRows rows={4} height={72} /> : isError ? <EmptyState title="Não foi possível carregar os lançamentos" hint="Tente novamente em alguns instantes." onAction={() => void refetch()} actionLabel="Tentar novamente" /> : grouped.size === 0 ? <EmptyState title="Nenhum lançamento diário" hint="As despesas registradas aparecerão separadas por dia." /> : <div className="space-y-5">{Array.from(grouped.entries()).map(([date, expenses]) => <section key={date}><div className="mb-2 flex items-center gap-2 rounded-xl bg-gold/10 px-3 py-2 text-sm font-bold uppercase"><CalendarDays className="h-4 w-4 text-gold" /> Despesas da {date === "sem-data" ? "data não informada" : dateBR(date)}</div><MobileCard className="divide-y divide-border/60">{expenses.map((expense) => <div key={expense.id} className="flex items-start gap-3 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><ReceiptText className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{expense.description}</div><div className="text-xs text-muted-foreground">{expense.proposed_category?.replaceAll("_", " ")}{expense.supplier ? ` · ${expense.supplier}` : ""}</div>{expense.correction_note && <div className="mt-1 text-xs text-destructive">Correção: {expense.correction_note}</div>}</div><div className="shrink-0 text-right"><div className="text-sm font-bold tabular-nums">{brl(expense.amount)}</div><div className={cn("text-[10px] font-bold uppercase", expense.status === "approved" ? "text-success" : expense.status === "returned" ? "text-destructive" : "text-warning")}>{expense.status === "approved" ? "Aprovada" : expense.status === "returned" ? "Devolvida" : "Aguardando aprovação"}</div></div></div>)}</MobileCard></section>)}</div>}
    </div>
  );
}
