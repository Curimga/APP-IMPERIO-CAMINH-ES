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

  return <div className="space-y-4"><PageHeader title="Aprovação do executivo" subtitle="Revise e confirme os lançamentos diários enviados pela Secretaria." backTo="/menu" />{rows.length === 0 ? <EmptyState title="Tudo em dia" hint="Não há despesas aguardando aprovação." /> : <MobileCard className="divide-y divide-border/60">{rows.map((row) => <div key={row.id} className="space-y-3 p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600"><ReceiptText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="font-semibold">{row.description}</div><div className="mt-1 text-xs text-muted-foreground">{dateBR(row.occurred_at)} · {row.proposed_category?.replaceAll("_", " ")}{row.supplier ? ` · ${row.supplier}` : ""}</div>{row.notes && <div className="mt-2 text-xs text-muted-foreground">{row.notes}</div>}</div><div className="text-right"><div className="font-bold tabular-nums">{brl(row.amount)}</div><div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase text-warning"><Clock3 className="h-3 w-3" /> Pendente</div></div></div><div className="grid grid-cols-2 gap-2"><button type="button" className={btnGhost} onClick={() => reject.mutate(row.id)} disabled={saving}><XCircle className="h-4 w-4" /> Devolver</button><button type="button" className={btnGold} onClick={() => approve.mutate(row)} disabled={saving || row.created_by === user?.id}><CheckCircle2 className="h-4 w-4" /> Aprovar</button></div>{row.created_by === user?.id && <p className="text-xs text-destructive">O solicitante não pode aprovar a própria despesa.</p>}</div>)}</MobileCard>}</div>;
}
