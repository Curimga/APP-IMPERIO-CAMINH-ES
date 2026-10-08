import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Boxes,
  Landmark,
  ArrowUpRight,
  LayoutDashboard,
  FileBarChart2,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  RefreshCw,
  WalletCards,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useBankingAccess,
  useBankingData,
  useCapitalImobilizado,
  useCreateBankMovement,
  useCreateBankTransfer,
  useMobileFinance,
  type BankPeriod,
  type BankTxType,
} from "@/lib/mobile/queries";
import { canAccessBanking, canSeeFinance } from "@/lib/mobile/perm";
import {
  MobileCard,
  SectionTitle,
  SkeletonRows,
  EmptyState,
  MoneyStat,
  Chip,
} from "@/components/mobile/ui";
import { FinanceReport } from "@/components/mobile/finance-report";
import { brl, dateBR, money, parseMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/financeiro")({
  component: Financeiro,
});

/**
 * O módulo Financeiro é exclusivo do Executivo. Os hooks financeiros
 * (`useMobileFinance`, `useCapitalImobilizado`) só executam consulta quando o
 * usuário é admin — para não executivos nenhuma requisição financeira dispara.
 */
function Financeiro() {
  const { roles, user } = useAuth();
  const navigate = useNavigate();
  const [reveal, setReveal] = useState(false);
  const [tab, setTab] = useState<"contas" | "indicadores" | "relatorios">("contas");
  const canBank = canAccessBanking(roles, user?.email, user?.id);
  const canExecutive = canSeeFinance(roles, user?.email);
  const { data, isLoading, isError } = useMobileFinance();
  const cap = useCapitalImobilizado();

  if (!canBank) {
    return (
      <EmptyState
        title="Você não possui permissão para acessar esta área"
        hint="Contas bancárias são restritas ao Executivo/Admin e ao usuário individual autorizado."
        actionLabel="Voltar para o início"
        onAction={() => navigate({ to: "/" })}
      />
    );
  }

  if (canExecutive && (isLoading || !data)) return <SkeletonRows rows={4} height={84} />;
  if (canExecutive && isError)
    return <EmptyState title="Erro ao carregar indicadores" hint="Verifique sua conexão." />;

  const snap = data?.snap;
  const kpis = data?.kpis;

  const valuemaybe = (v: number, pre = "R$ "): string =>
    reveal
      ? `${pre}${money(Number(v ?? 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "R$ ••••";
  const banks = (snap?.banks ?? []) as Tables<"bank_accounts">[];
  const receivables = (snap?.receivables ?? []) as Tables<"receivables">[];
  const payables = (snap?.payables ?? []) as Tables<"payables">[];
  const hasOpenDue =
    receivables.some((r) => r.received_at == null && r.due_date) ||
    payables.some((p) => p.paid_at == null && p.due_date);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Financeiro</h1>
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Ocultar valores" : "Mostrar valores"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      <div className={cn("grid gap-2", canExecutive ? "grid-cols-3" : "grid-cols-1")}>
        <button
          type="button"
          onClick={() => setTab("contas")}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-bold pressable",
            tab === "contas"
              ? "border-gold bg-gold text-gold-foreground"
              : "bg-card text-muted-foreground active:bg-muted/60",
          )}
        >
          <WalletCards className="h-4 w-4" /> Contas
        </button>
        {canExecutive ? (
          <>
        <button
          type="button"
          onClick={() => setTab("indicadores")}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-bold pressable",
            tab === "indicadores"
              ? "border-gold bg-gold text-gold-foreground"
              : "bg-card text-muted-foreground active:bg-muted/60",
          )}
        >
          <LayoutDashboard className="h-4 w-4" /> Indicadores
        </button>
        <button
          type="button"
          onClick={() => setTab("relatorios")}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-bold pressable",
            tab === "relatorios"
              ? "border-gold bg-gold text-gold-foreground"
              : "bg-card text-muted-foreground active:bg-muted/60",
          )}
        >
          <FileBarChart2 className="h-4 w-4" /> Relatórios
        </button>
          </>
        ) : null}
      </div>

      {tab === "contas" ? (
        <BankingPanel />
      ) : tab === "relatorios" && snap ? (
        <FinanceReport snap={snap} reveal={reveal} />
      ) : (
        <>
          {/* Principais indicadores */}
          <div className="grid grid-cols-2 gap-2">
              <MoneyStat
                label="Saldo em conta"
              value={valuemaybe(kpis?.balance ?? 0)}
              accent={(kpis?.balance ?? 0) >= 0 ? "success" : "destructive"}
            />
            <MoneyStat label="Receita do mês" value={valuemaybe(kpis?.revMonth ?? 0)} accent="gold" />
          </div>

          {/* Capital imobilizado */}
          <MobileCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-gold" />
                <span className="text-sm font-bold">Capital imobilizado</span>
              </div>
              <Link to="/garagem" className="flex items-center gap-1 text-xs font-bold text-gold">
                Garagem <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight">
              {valuemaybe(cap.data?.total ?? 0)}
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {cap.data?.count ?? 0} caminhão...
              {(cap.data?.count ?? 0) === 1 ? "" : "ões"} parado
              {(cap.data?.count ?? 0) === 1 ? "" : "s"} em estoque (compra + despesas)
            </div>
          </MobileCard>

          {/* Contas bancárias */}
          <MobileCard className="p-3">
            <SectionTitle className="mb-1">Contas bancárias</SectionTitle>
            {banks.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nenhuma conta ativa.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {banks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-[14px] font-medium">{b.name}</span>
                    </div>
                    <span className="shrink-0 text-[14px] font-bold tabular-nums">
                      {valuemaybe(Number(b.current_balance ?? 0))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>

          {/* Próximos vencimentos */}
          <MobileCard className="p-3">
            <SectionTitle className="mb-1">Próximos vencimentos</SectionTitle>
            {!hasOpenDue ? (
              <p className="text-[13px] text-muted-foreground">Nenhum lançamento em aberto.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {receivables
                  .filter((r) => r.received_at == null && r.due_date)
                  .sort((a, b) => a.due_date.localeCompare(b.due_date))
                  .slice(0, 5)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">
                          {r.description || "Receber"}
                        </div>
                        <div className="text-xs text-muted-foreground">Vence {dateBR(r.due_date)}</div>
                      </div>
                      <span className="shrink-0 text-[14px] font-bold tabular-nums text-success">
                        {valuemaybe(Number(r.amount ?? 0))}
                      </span>
                    </div>
                  ))}
                {payables
                  .filter((p) => p.paid_at == null && p.due_date)
                  .sort((a, b) => a.due_date.localeCompare(b.due_date))
                  .slice(0, 5)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">
                          {p.description || p.supplier || "Pagar"}
                        </div>
                        <div className="text-xs text-muted-foreground">Vence {dateBR(p.due_date)}</div>
                      </div>
                      <span className="shrink-0 text-[14px] font-bold tabular-nums text-destructive">
                        {valuemaybe(Number(p.amount ?? 0))}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </>
  );
}

function BankingPanel() {
  const canAccess = useBankingAccess();
  const [period, setPeriod] = useState<BankPeriod>("30d");
  const [accountId, setAccountId] = useState("all");
  const [type, setType] = useState<"all" | BankTxType>("all");
  const [mode, setMode] = useState<"list" | "entrada" | "saida" | "transferencia" | "review">("list");
  const [reviewTxType, setReviewTxType] = useState<BankTxType>("entrada");
  const [form, setForm] = useState({ bankAccountId: "", amount: "", occurredAt: new Date().toISOString().slice(0, 10), categoryId: "", description: "" });
  const [transfer, setTransfer] = useState({ fromAccountId: "", toAccountId: "", amount: "", description: "" });
  const banking = useBankingData({ period, accountId, type });
  const movement = useCreateBankMovement();
  const transferMutation = useCreateBankTransfer();

  if (!canAccess) return null;
  if (banking.isLoading) return <SkeletonRows rows={5} height={92} />;
  if (banking.isError) {
    return <EmptyState title="Não foi possível carregar as contas" hint="Confira sua conexão e tente novamente." />;
  }

  const data = banking.data;
  if (!data) return null;
  const activeCategories = data.categories.filter((c) => (mode === "entrada" ? c.kind === "receita" : c.kind === "despesa"));
  const selectedAccount = data.accounts.find((a) => a.id === form.bankAccountId);
  const reviewType = mode === "review" ? reviewTxType : mode;
  const canReviewMovement = form.bankAccountId && parseMoney(form.amount) > 0 && form.occurredAt;
  const saveMovement = async (txType: BankTxType) => {
    await movement.mutateAsync({ ...form, type: txType });
    setForm({ bankAccountId: "", amount: "", occurredAt: new Date().toISOString().slice(0, 10), categoryId: "", description: "" });
    setMode("list");
  };

  if (mode === "entrada" || mode === "saida") {
    const txType = mode;
    return (
      <MobileCard className="space-y-4 p-4">
        <SectionTitle>{txType === "entrada" ? "Adicionar entrada" : "Adicionar saída"}</SectionTitle>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-bold">Conta
            <select className="h-12 rounded-xl border bg-background px-3 text-base" value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}>
              <option value="">Escolha a conta</option>
              {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">Valor
            <input className="h-12 rounded-xl border bg-background px-3 text-lg font-bold" inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Data
            <input className="h-12 rounded-xl border bg-background px-3 text-base" type="date" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Categoria
            <select className="h-12 rounded-xl border bg-background px-3 text-base" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Sem categoria</option>
              {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">Descrição
            <input className="h-12 rounded-xl border bg-background px-3 text-base" placeholder="Ex.: depósito, tarifa, pagamento" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="h-12 rounded-xl border bg-card font-bold" onClick={() => setMode("list")}>Cancelar</button>
          <button type="button" className="h-12 rounded-xl bg-gold font-extrabold text-gold-foreground disabled:opacity-50" disabled={!canReviewMovement} onClick={() => { setReviewTxType(txType); setMode("review"); }}>Revisar</button>
        </div>
      </MobileCard>
    );
  }

  if (mode === "review") {
    return (
      <MobileCard className="space-y-4 p-4">
        <SectionTitle>Confirmar antes de salvar</SectionTitle>
        <div className="rounded-2xl bg-surface-secondary p-4 text-sm leading-7">
          <div><b>Tipo:</b> {reviewType === "saida" ? "Saída" : "Entrada"}</div>
          <div><b>Conta:</b> {selectedAccount?.name ?? "Conta selecionada"}</div>
          <div><b>Valor:</b> {brl(parseMoney(form.amount))}</div>
          <div><b>Data:</b> {dateBR(form.occurredAt)}</div>
          <div><b>Descrição:</b> {form.description || "Sem descrição"}</div>
        </div>
        {movement.isError ? <p className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">Não foi possível salvar. Confira os dados e tente novamente.</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="h-12 rounded-xl border bg-card font-bold" disabled={movement.isPending} onClick={() => setMode(reviewType === "saida" ? "saida" : "entrada")}>Voltar</button>
          <button type="button" className="h-12 rounded-xl bg-gold font-extrabold text-gold-foreground disabled:opacity-50" disabled={movement.isPending} onClick={() => void saveMovement(reviewType === "saida" ? "saida" : "entrada").catch(() => undefined)}>{movement.isPending ? "Salvando..." : "Confirmar"}</button>
        </div>
      </MobileCard>
    );
  }

  if (mode === "transferencia") {
    const canTransfer = transfer.fromAccountId && transfer.toAccountId && transfer.fromAccountId !== transfer.toAccountId && parseMoney(transfer.amount) > 0;
    return (
      <MobileCard className="space-y-4 p-4">
        <SectionTitle>Transferir entre contas</SectionTitle>
        <p className="text-sm text-muted-foreground">O APP registra uma saída na origem e uma entrada no destino, igual ao CRM.</p>
        <label className="grid gap-1 text-sm font-bold">Conta de origem
          <select className="h-12 rounded-xl border bg-background px-3" value={transfer.fromAccountId} onChange={(e) => setTransfer({ ...transfer, fromAccountId: e.target.value })}>
            <option value="">Escolha</option>{data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">Conta de destino
          <select className="h-12 rounded-xl border bg-background px-3" value={transfer.toAccountId} onChange={(e) => setTransfer({ ...transfer, toAccountId: e.target.value })}>
            <option value="">Escolha</option>{data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">Valor
          <input className="h-12 rounded-xl border bg-background px-3 text-lg font-bold" inputMode="decimal" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} placeholder="0,00" />
        </label>
        <label className="grid gap-1 text-sm font-bold">Descrição
          <input className="h-12 rounded-xl border bg-background px-3" value={transfer.description} onChange={(e) => setTransfer({ ...transfer, description: e.target.value })} placeholder="Motivo da transferência" />
        </label>
        {transferMutation.isSuccess ? <p className="rounded-xl bg-success/10 p-3 text-sm font-bold text-success"><CheckCircle2 className="mr-1 inline h-4 w-4" /> Transferência registrada</p> : null}
        {transferMutation.isError ? <p className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">Não foi possível transferir. Confira os dados e tente novamente.</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="h-12 rounded-xl border bg-card font-bold" disabled={transferMutation.isPending} onClick={() => setMode("list")}>Cancelar</button>
          <button type="button" className="h-12 rounded-xl bg-gold font-extrabold text-gold-foreground disabled:opacity-50" disabled={!canTransfer || transferMutation.isPending} onClick={() => void transferMutation.mutateAsync(transfer).then(() => setTransfer({ fromAccountId: "", toAccountId: "", amount: "", description: "" })).catch(() => undefined)}>{transferMutation.isPending ? "Salvando..." : "Confirmar"}</button>
        </div>
      </MobileCard>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-success text-success-foreground font-extrabold" onClick={() => setMode("entrada")}><ArrowDownCircle className="h-5 w-5" /> Adicionar entrada</button>
        <button type="button" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-destructive text-destructive-foreground font-extrabold" onClick={() => setMode("saida")}><ArrowUpCircle className="h-5 w-5" /> Adicionar saída</button>
      </div>
      <button type="button" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border bg-card font-bold text-gold" onClick={() => setMode("transferencia")}><ArrowLeftRight className="h-5 w-5" /> Transferir entre contas</button>
      {movement.isSuccess ? <p className="rounded-xl bg-success/10 p-3 text-sm font-bold text-success"><CheckCircle2 className="mr-1 inline h-4 w-4" /> Movimentação registrada</p> : null}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip label="7 dias" active={period === "7d"} onClick={() => setPeriod("7d")} />
        <Chip label="30 dias" active={period === "30d"} onClick={() => setPeriod("30d")} />
        <Chip label="90 dias" active={period === "90d"} onClick={() => setPeriod("90d")} />
        <Chip label="Todas" active={type === "all"} onClick={() => setType("all")} />
        <Chip label="Entradas" active={type === "entrada"} tone="success" onClick={() => setType("entrada")} />
        <Chip label="Saídas" active={type === "saida"} tone="destructive" onClick={() => setType("saida")} />
      </div>
      <MobileCard className="p-3">
        <label className="grid gap-1 text-sm font-bold">Filtrar por conta
          <select className="h-11 rounded-xl border bg-background px-3" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="all">Todas as contas</option>
            {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </MobileCard>
      <div className="grid grid-cols-2 gap-2">
        <MoneyStat label="Entradas" value={brl(data.totals.in)} accent="success" />
        <MoneyStat label="Saídas" value={brl(data.totals.out)} accent="destructive" />
      </div>
      <MobileCard className="p-3">
        <SectionTitle right={<button type="button" className="text-gold" onClick={() => void banking.refetch()} aria-label="Atualizar"><RefreshCw className="h-4 w-4" /></button>}>Contas bancárias</SectionTitle>
        {data.accounts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma conta ativa.</p> : data.accounts.map((a) => (
          <div key={a.id} className="border-t py-3 first:border-t-0">
            <div className="flex justify-between gap-3"><div><div className="font-bold">{a.name}</div><div className="text-xs text-muted-foreground">{a.bank || "Banco não informado"}</div></div><div className="text-right font-extrabold tabular-nums">{brl(a.current_balance)}</div></div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]"><span>Entradas: <b>{brl(a.period_in)}</b></span><span>Saídas: <b>{brl(a.period_out)}</b></span><span>Última: <b>{dateBR(a.last_movement_at)}</b></span></div>
          </div>
        ))}
      </MobileCard>
      <MobileCard className="p-3">
        <SectionTitle>Movimentações</SectionTitle>
        {data.transactions.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma movimentação neste filtro.</p> : data.transactions.map((tx) => (
          <div key={tx.id} className="border-t py-3 first:border-t-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="font-bold">{tx.type === "entrada" ? "Entrada" : "Saída"} · {tx.financial_categories?.name ?? "Sem categoria"}</div><div className="text-sm text-muted-foreground">{tx.description || "Sem descrição"}</div><div className="text-xs text-muted-foreground">{dateBR(tx.occurred_at)} · {tx.bank_accounts?.name ?? "Conta"} · {tx.source ?? "manual"}</div></div>
              <div className={cn("shrink-0 text-right font-extrabold tabular-nums", tx.type === "entrada" ? "text-success" : "text-destructive")}>{tx.type === "entrada" ? "+" : "-"}{brl(tx.amount)}</div>
            </div>
          </div>
        ))}
      </MobileCard>
    </>
  );
}
