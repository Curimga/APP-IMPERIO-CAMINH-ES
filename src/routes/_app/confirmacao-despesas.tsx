import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock3, History, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  approveExpenseConfirmation,
  correctAndResubmitExpense,
  returnExpenseConfirmation,
  useExpenseApprovalAccess,
  useExpenseApprovalRequests,
  type ExpenseApprovalRequestWithEvents,
} from "@/lib/mobile/expense-approval";
import { brl, dateBR, parseMoney } from "@/lib/format";
import {
  Chip,
  EmptyState,
  ErrorState,
  Field,
  MobileCard,
  PageHeader,
  SkeletonRows,
  btnGold,
  btnGhost,
  inputClass,
} from "@/components/mobile/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/confirmacao-despesas")({
  component: ExpenseConfirmationPage,
});

type Tab = "pending" | "returned" | "history";
type Action = "approve" | "return" | "correct" | null;

const CATEGORY_OPTIONS = [
  "administrativo",
  "aluguel",
  "energia",
  "agua",
  "internet",
  "marketing",
  "material_escritorio",
  "impostos",
  "manutencao",
  "combustivel",
  "documentacao",
  "transporte",
  "reforma",
  "pecas_caminhao",
  "outros",
];

const TRUCK_EXPENSE_CATEGORIES = [
  "manutencao",
  "combustivel",
  "documentacao",
  "transporte",
  "impostos",
  "reforma",
  "outros",
  "pecas_caminhao",
  "patrocinio",
];

function ExpenseConfirmationPage() {
  const { user } = useAuth();
  const { data: canApprove = false, isLoading: accessLoading } = useExpenseApprovalAccess();
  const { data: requests = [], isLoading, isError, refetch } = useExpenseApprovalRequests();
  const [tab, setTab] = useState<Tab>("pending");

  const pending = requests.filter((request) => request.status === "pending");
  const returned = requests.filter((request) => request.status === "returned");
  const history = requests.filter((request) => request.status === "approved");
  const activeTab = !canApprove && tab === "pending" ? "returned" : tab;
  const visible = activeTab === "pending" ? pending : activeTab === "returned" ? returned : history;

  if (isLoading || accessLoading) return <SkeletonRows rows={5} height={132} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Confirmação de despesas"
        subtitle={canApprove ? "Revisão executiva com trilha de auditoria" : "Acompanhe e corrija suas solicitações"}
        backTo="/menu"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {canApprove && <Chip label="Pendentes" count={pending.length} active={activeTab === "pending"} onClick={() => setTab("pending")} />}
        <Chip label="Devolvidas" count={returned.length} active={activeTab === "returned"} onClick={() => setTab("returned")} tone="destructive" />
        <Chip label="Histórico" count={history.length} active={activeTab === "history"} onClick={() => setTab("history")} tone="success" />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={activeTab === "pending" ? "Nenhuma aprovação pendente" : activeTab === "returned" ? "Nenhuma solicitação devolvida" : "Nenhuma despesa aprovada"}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              canApprove={canApprove}
              isOwner={request.created_by === user?.id}
              onChanged={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  canApprove,
  isOwner,
  onChanged,
}: {
  request: ExpenseApprovalRequestWithEvents;
  canApprove: boolean;
  isOwner: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const [action, setAction] = useState<Action>(null);
  const [category, setCategory] = useState(request.proposed_category ?? "outros");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState(request.description);
  const [amount, setAmount] = useState(String(request.amount));
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const baseCategories = request.target_type === "truck_expense" ? TRUCK_EXPENSE_CATEGORIES : CATEGORY_OPTIONS;
  const categoryOptions = baseCategories.includes(category) ? baseCategories : [category, ...baseCategories];

  const submit = async () => {
    setSaving(true);
    try {
      if (action === "approve") {
        await approveExpenseConfirmation(request.id, category);
        toast.success("Despesa aprovada e lançada");
      } else if (action === "return") {
        if (!reason.trim()) throw new Error("Informe o motivo da devolução.");
        await returnExpenseConfirmation(request.id, reason);
        toast.success("Solicitação devolvida para correção");
      } else if (action === "correct") {
        const parsedAmount = parseMoney(amount, 0);
        if (!description.trim()) throw new Error("Informe a descrição.");
        if (parsedAmount <= 0) throw new Error("Informe um valor válido.");
        await correctAndResubmitExpense(request.id, {
          proposed_category: category,
          amount: parsedAmount,
          description: description.trim(),
        });
        toast.success("Solicitação corrigida e reenviada");
      }
      setAction(null);
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setSaving(false);
    }
  };

  const statusTone = request.status === "approved" ? "text-success" : request.status === "returned" ? "text-destructive" : "text-warning";

  return (
    <MobileCard className="overflow-hidden">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold">{request.description}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {targetLabel(request.target_type)} · {originLabel(request.origin)} · {dateBR(request.submitted_at)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[16px] font-extrabold tabular-nums">{brl(request.amount)}</div>
            <div className={cn("text-[10px] font-bold uppercase", statusTone)}>{statusLabel(request.status)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <Info label="Categoria proposta" value={request.proposed_category ?? "Não informada"} />
          <Info label="Data da despesa" value={request.occurred_at ? dateBR(request.occurred_at) : "Não informada"} />
          {request.supplier && <Info label="Fornecedor" value={request.supplier} />}
          {request.due_date && <Info label="Vencimento" value={dateBR(request.due_date)} />}
        </div>

        {request.correction_note && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            <strong>Correção solicitada:</strong> {request.correction_note}
          </div>
        )}

        {request.status === "pending" && canApprove && !isOwner && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnGhost} onClick={() => setAction(action === "return" ? null : "return")}>
              <Undo2 className="h-4 w-4" /> Devolver
            </button>
            <button type="button" className={btnGold} onClick={() => setAction(action === "approve" ? null : "approve")}>
              <CheckCircle2 className="h-4 w-4" /> Aprovar
            </button>
          </div>
        )}

        {request.status === "returned" && isOwner && (
          <button type="button" className={btnGold} onClick={() => setAction(action === "correct" ? null : "correct")}>
            <RotateCcw className="h-4 w-4" /> Corrigir e reenviar
          </button>
        )}

        {action && (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            {action === "return" ? (
              <Field label="Motivo da devolução" required>
                <textarea className={cn(inputClass, "min-h-24 py-2")} value={reason} onChange={(event) => setReason(event.target.value)} />
              </Field>
            ) : (
              <>
                {action === "correct" && (
                  <>
                    <Field label="Descrição" required>
                      <input className={inputClass} value={description} onChange={(event) => setDescription(event.target.value)} />
                    </Field>
                    <Field label="Valor" required>
                      <input className={inputClass} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
                    </Field>
                  </>
                )}
                <Field label={action === "approve" ? "Categoria final" : "Categoria proposta"} required>
                  <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                    {categoryOptions.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
                  </select>
                </Field>
              </>
            )}
            <button type="button" className={btnGold} disabled={saving} onClick={submit}>
              {saving ? "Salvando..." : action === "approve" ? "Confirmar aprovação" : action === "return" ? "Confirmar devolução" : "Reenviar"}
            </button>
          </div>
        )}

        <button type="button" onClick={() => setShowHistory((value) => !value)} className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
          <History className="h-3.5 w-3.5" /> {showHistory ? "Ocultar histórico" : "Ver histórico"}
        </button>
        {showHistory && (
          <div className="space-y-2 border-l-2 border-muted pl-3">
            {[...request.expense_approval_events]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((event) => (
                <div key={event.id} className="text-[11px]">
                  <div className="flex items-center gap-1 font-semibold"><Clock3 className="h-3 w-3" /> {eventLabel(event.event_type)} · {dateBR(event.created_at)}</div>
                  {event.note && <div className="mt-0.5 text-muted-foreground">{event.note}</div>}
                </div>
              ))}
          </div>
        )}
      </div>
    </MobileCard>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div><div className="truncate font-medium">{value}</div></div>;
}

function targetLabel(value: string) {
  return value === "general_expense" ? "Despesa geral" : value === "truck_expense" ? "Despesa de caminhão" : "Conta a pagar";
}

function originLabel(value: string) {
  return value === "service" ? "Serviço" : value === "inventory" ? "Estoque" : "Manual";
}

function statusLabel(value: string) {
  return value === "approved" ? "Aprovada" : value === "returned" ? "Devolvida" : "Pendente";
}

function eventLabel(value: string) {
  const labels: Record<string, string> = { submitted: "Enviada", corrected: "Corrigida", returned: "Devolvida", resubmitted: "Reenviada", approved: "Aprovada", cancelled: "Cancelada" };
  return labels[value] ?? value;
}
