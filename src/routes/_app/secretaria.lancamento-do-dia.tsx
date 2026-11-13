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
import { useInventory, useSuppliers, useTrucks } from "@/lib/mobile/queries";
import { truckTitle } from "@/lib/truck-title";

export const Route = createFileRoute("/_app/secretaria/lancamento-do-dia")({ component: DailyExpensePage });

const PAYMENT_METHODS = ["PIX", "Dinheiro", "Cartão", "Transferência", "Boleto", "Cheque"];
const REGISTRATION_TYPES = [
  ["fornecedor", "Fornecedor"],
  ["banco", "Banco"],
  ["compartilhada", "Despesa compartilhada"],
  ["caminhao", "Caminhão"],
  ["colaborador", "Colaborador"],
  ["estoque", "Estoque"],
] as const;
const CATEGORIES = [
  ["outros", "Outros"], ["manutencao", "Manutenção"], ["combustivel", "Combustível"],
  ["documentacao", "Documentação"], ["transporte", "Transporte"], ["impostos", "Impostos"],
  ["pecas_caminhao", "Peças de caminhão"], ["refeicao", "Refeição"], ["limpeza", "Limpeza"],
  ["colaborador", "Colaborador"], ["caminhao", "Caminhão"],
] as const;

function DailyExpensePage() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier: "", supplierId: "", amount: "", paymentMethod: "", description: "", urgent: false, bank: "", bankAccountId: "", occurredAt: todayISO(), notes: "", registrationType: "fornecedor", category: "outros", truckId: "", employeeId: "", inventoryItemId: "", shared: false });
  const { data: suppliers = [] } = useSuppliers();
  const { data: trucks = [] } = useTrucks();
  const { data: inventory = [] } = useInventory();
  const { data: banks = [] } = useQuery({
    queryKey: ["daily-expense-bank-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("id, name, bank").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["daily-expense-employee-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
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
       if (form.category === "caminhao" && !form.truckId) throw new Error("Selecione o caminhão da despesa.");
       if (form.registrationType === "colaborador" && !form.employeeId) throw new Error("Selecione o colaborador.");
       if (form.registrationType === "estoque" && !form.inventoryItemId) throw new Error("Selecione o item de estoque.");
       return submitDailyExpense({
        supplier: form.supplier.trim(),
        amount,
        payment_method: form.paymentMethod,
        description: form.description.trim(),
        urgent: form.urgent,
        bank: form.bank.trim() || null,
        occurred_at: form.occurredAt,
         notes: form.notes.trim() || null,
         registration_type: form.registrationType,
         category: form.category,
         supplier_id: form.supplierId || null,
         bank_account_id: form.bankAccountId || null,
         employee_id: form.employeeId || null,
         inventory_item_id: form.inventoryItemId || null,
         truck_id: form.truckId || null,
         shared: form.registrationType === "compartilhada" || form.shared,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["daily-expenses"] });
       setForm({ supplier: "", supplierId: "", amount: "", paymentMethod: "", description: "", urgent: false, bank: "", bankAccountId: "", occurredAt: todayISO(), notes: "", registrationType: "fornecedor", category: "outros", truckId: "", employeeId: "", inventoryItemId: "", shared: false });
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
           <Field label="Cadastro *"><select className={inputClass} value={form.registrationType} onChange={(event) => setForm({ ...form, registrationType: event.target.value })}>{REGISTRATION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
           <Field label="Categoria *"><select className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
           <Field label="Fornecedor *"><select className={inputClass} value={form.supplierId} onChange={(event) => { const item = suppliers.find((supplier) => supplier.id === event.target.value); setForm({ ...form, supplierId: event.target.value, supplier: item?.name ?? "" }); }}><option value="">Selecione o fornecedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>
          <Field label="Valor *"><input className={inputClass} inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" /></Field>
          <Field label="Forma de pagamento *"><select className={inputClass} value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="">Selecione</option>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></Field>
          <Field label="Referente a *"><input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descrição do lançamento" /></Field>
           <Field label="Banco"><select className={inputClass} value={form.bankAccountId} onChange={(event) => { const item = banks.find((bank) => bank.id === event.target.value); setForm({ ...form, bankAccountId: event.target.value, bank: item ? `${item.name}${item.bank ? ` · ${item.bank}` : ""}` : "" }); }}><option value="">Selecione o banco</option>{banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}{bank.bank ? ` · ${bank.bank}` : ""}</option>)}</select></Field>
           {form.category === "caminhao" && <Field label="Caminhão *"><select className={inputClass} value={form.truckId} onChange={(event) => setForm({ ...form, truckId: event.target.value })}><option value="">Selecione o caminhão</option>{trucks.map((truck) => <option key={truck.id} value={truck.id}>{truckTitle(truck)}{truck.plate ? ` · ${truck.plate}` : ""}</option>)}</select></Field>}
           {form.registrationType === "colaborador" && <Field label="Colaborador *"><select className={inputClass} value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}><option value="">Selecione o colaborador</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></Field>}
           {form.registrationType === "estoque" && <Field label="Item de estoque *"><select className={inputClass} value={form.inventoryItemId} onChange={(event) => setForm({ ...form, inventoryItemId: event.target.value })}><option value="">Selecione o item</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name}{item.category ? ` · ${item.category}` : ""}</option>)}</select></Field>}
          <Field label="Data do lançamento"><input className={inputClass} type="date" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} /></Field>
           <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3.5 text-sm font-semibold"><input type="checkbox" checked={form.shared} onChange={(event) => setForm({ ...form, shared: event.target.checked })} className="h-4 w-4 accent-gold" /> Despesa compartilhada</label>
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
