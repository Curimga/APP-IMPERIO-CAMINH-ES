import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Boxes,
  Landmark,
  ArrowUpRight,
  LayoutDashboard,
  FileBarChart2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileFinance, useCapitalImobilizado } from "@/lib/mobile/queries";
import { canSeeFinance } from "@/lib/mobile/perm";
import {
  MobileCard,
  SectionTitle,
  SkeletonRows,
  EmptyState,
  MoneyStat,
} from "@/components/mobile/ui";
import { FinanceReport } from "@/components/mobile/finance-report";
import { dateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/financeiro")({
  component: Financeiro,
});

type OpenRow = {
  amount: number;
  paid_at?: string | null;
  received_at?: string | null;
};

const sumOpen = (rows: OpenRow[] | undefined | null, paidField: "paid_at" | "received_at") =>
  (rows ?? []).reduce((s, r) => s + (r[paidField] == null ? Number(r.amount ?? 0) : 0), 0);

/**
 * O módulo Financeiro é exclusivo do Executivo. Os hooks financeiros
 * (`useMobileFinance`, `useCapitalImobilizado`) só executam consulta quando o
 * usuário é admin — para não executivos nenhuma requisição financeira dispara.
 */
function Financeiro() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const [reveal, setReveal] = useState(false);
  const [tab, setTab] = useState<"indicadores" | "relatorios">("indicadores");
  const { data, isLoading, isError } = useMobileFinance();
  const cap = useCapitalImobilizado();

  if (!canSeeFinance(roles)) {
    return (
      <EmptyState
        title="Você não possui permissão para acessar esta área"
        hint="O módulo Financeiro é restrito ao Executivo."
        actionLabel="Voltar para o início"
        onAction={() => navigate({ to: "/" })}
      />
    );
  }

  if (isLoading || !data) return <SkeletonRows rows={4} height={84} />;
  if (isError)
    return <EmptyState title="Erro ao carregar indicadores" hint="Verifique sua conexão." />;

  const { snap, kpis } = data;

  const valuemaybe = (v: number, pre = "R$ "): string =>
    reveal
      ? `${pre}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "R$ ••••";
  const banks = (snap.banks ?? []) as Tables<"bank_accounts">[];
  const receivables = (snap.receivables ?? []) as Tables<"receivables">[];
  const payables = (snap.payables ?? []) as Tables<"payables">[];
  const receivablesOpen = sumOpen(receivables, "received_at");
  const payablesOpen = sumOpen(payables, "paid_at");

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

      {/* Alternador Indicadores / Relatórios */}
      <div className="grid grid-cols-2 gap-2">
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
      </div>

      {tab === "relatorios" ? (
        <FinanceReport snap={snap} reveal={reveal} />
      ) : (
        <>
          {/* Principais indicadores */}
          <div className="grid grid-cols-2 gap-2">
            <MoneyStat
              label="Saldo em conta"
              value={valuemaybe(kpis.balance ?? 0)}
              accent={kpis.balance >= 0 ? "success" : "destructive"}
            />
            <MoneyStat label="Receita do mês" value={valuemaybe(kpis.revMonth ?? 0)} accent="gold" />
            <MoneyStat
              label="Resultado do mês"
              value={valuemaybe(kpis.netProfit ?? 0)}
              accent={(kpis.netProfit ?? 0) >= 0 ? "success" : "destructive"}
            />
            <MoneyStat label="Opex do mês" value={valuemaybe(kpis.opex ?? 0)} accent="muted" />
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

          {/* Contas a receber / pagar */}
          <div className="grid grid-cols-2 gap-2">
            <MobileCard className="p-3">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-success uppercase">
                <TrendingUp className="h-3.5 w-3.5" /> A receber
              </div>
              <div className="mt-1 text-lg font-extrabold tabular-nums">
                {valuemaybe(receivablesOpen)}
              </div>
            </MobileCard>
            <MobileCard className="p-3">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-destructive uppercase">
                <TrendingDown className="h-3.5 w-3.5" /> A pagar
              </div>
              <div className="mt-1 text-lg font-extrabold tabular-nums">{valuemaybe(payablesOpen)}</div>
            </MobileCard>
          </div>

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
            {payablesOpen === 0 && receivablesOpen === 0 ? (
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
