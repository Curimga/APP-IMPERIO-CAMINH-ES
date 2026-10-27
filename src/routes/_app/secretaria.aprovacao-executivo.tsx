import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, ReceiptText, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { approveExpenseConfirmation, returnExpenseConfirmation, useExpenseApprovalAccess, type ExpenseApprovalRequest } from "@/lib/mobile/expense-approval";
import { brl, dateBR } from "@/lib/format";
import { EmptyState, MobileCard, PageHeader, SkeletonRows, btnGold, btnGhost } from "@/components/mobile/ui";

export const Route = createFileRoute("/_app/secretaria/aprovacao-executivo")({ component: ExecutiveApprovalPage });

function ExecutiveApprovalPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: canApprove, isLoading: accessLoading } = useExpenseApprovalAccess();
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["daily-expenses-approval"],
    enabled: canApprove === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_approval_requests").select("*").eq("origin", "daily").eq("status", "pending").order("occurred_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExpenseApprovalRequest[];
    },
  });
  const approve = useMutation({
    mutationFn: (row: ExpenseApprovalRequest) => approveExpenseConfirmation(row.id, row.proposed_category ?? "outros"),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["daily-expenses-approval"] }); toast.success("Despesa aprovada e lançada."); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível aprovar."),
  });
  const reject = useMutation({
    mutationFn: (id: string) => returnExpenseConfirmation(id, "Lançamento devolvido pelo executivo."),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["daily-expenses-approval"] }); toast.success("Lançamento devolvido."); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível devolver."),
  });
  const saving = approve.isPending || reject.isPending;

  if (accessLoading || isLoading) return <SkeletonRows rows={4} height={100} />;
  if (!canApprove) return <EmptyState title="Acesso restrito" hint="A aprovação dos lançamentos diários está disponível somente ao Executivo autorizado." />;
  if (isError) return <EmptyState title="Não foi possível carregar as aprovações" hint="Tente novamente em alguns instantes." onAction={() => void refetch()} actionLabel="Tentar novamente" />;

  return <div className="space-y-4"><PageHeader title="Aprovação do executivo" subtitle="Revise e confirme os lançamentos diários enviados pela Secretaria." backTo="/menu" />{rows.length === 0 ? <EmptyState title="Tudo em dia" hint="Não há despesas aguardando aprovação." /> : <MobileCard className="divide-y divide-border/60">{rows.map((row) => <div key={row.id} className="space-y-3 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-amber-600" /><span className="font-bold">Lançamento diário</span></div><div className="flex items-center gap-1 text-[10px] font-bold uppercase text-warning"><Clock3 className="h-3 w-3" /> Pendente</div></div><DetailLine label="FORNECEDOR" value={row.supplier ?? "Não informado"} /><DetailLine label="VALOR" value={brl(row.amount)} /><DetailLine label="FORMA" value={row.payment_method ?? "Não informado"} /><DetailLine label="REFERENTE A" value={row.description} /><DetailLine label="URGENTE" value={row.urgent ? "Sim" : "Não"} /><DetailLine label="BANCO" value={row.bank ?? "Não informado"} /><DetailLine label="DATA" value={dateBR(row.occurred_at)} />{row.notes && <DetailLine label="OBSERVAÇÕES" value={row.notes} />}<div className="grid grid-cols-2 gap-2"><button type="button" className={btnGhost} onClick={() => reject.mutate(row.id)} disabled={saving}><XCircle className="h-4 w-4" /> Devolver</button><button type="button" className={btnGold} onClick={() => approve.mutate(row)} disabled={saving || row.created_by === user?.id}><CheckCircle2 className="h-4 w-4" /> Aprovar</button></div>{row.created_by === user?.id && <p className="text-xs text-destructive">O solicitante não pode aprovar a própria despesa.</p>}</div>)}</MobileCard>}</div>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const icons: Record<string, string> = { FORNECEDOR: "👤", VALOR: "💰", FORMA: "💳", "REFERENTE A": "🧾", URGENTE: "⚠️", BANCO: "🏦", DATA: "📅", OBSERVAÇÕES: "📝" };
  return <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm"><span className="font-bold text-muted-foreground">{icons[label] ? `${icons[label]} ` : ""}{label}:</span><span className="min-w-0 break-words font-medium">{value}</span></div>;
}
