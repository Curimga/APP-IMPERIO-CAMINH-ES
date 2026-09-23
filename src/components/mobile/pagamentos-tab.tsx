import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCheck, CircleAlert, Hourglass, Truck } from "lucide-react";
import { useMobileFinance, useTrucks } from "@/lib/mobile/queries";
import { MobileCard, SectionTitle, SkeletonRows, EmptyState } from "@/components/mobile/ui";
import { settleReceivable, settlePayable, reopenReceivable, reopenPayable } from "@/lib/mobile/actions";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";
import { brl, dateBR } from "@/lib/format";
import { truckTitle } from "@/lib/truck-title";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

/* ============================================================
   ETAPA 4 — Aba Pagamentos (exclusiva do Executivo)
   ------------------------------------------------------------
   - A query financeira (useMobileFinance) SÓ DISPARA quando
     `enabled: isAdmin(roles)` (ver queries.ts). Para Financeiro
     e Secretária NENHUMA consulta financeira roda — o gate é de
     dados (backend side), não só esconder o botão.
   - Fontes reais: `snap.receivables` (contas a receber) e
     `snap.payables` (contas a pagar) do snapshot do dashboard,
     ambas com `truck_id` que vincula ao caminhão (sheet de
     detalhe aponta `/garagem/$truckId`).
   - A aba só é renderizada pelo guard `isFinanceExecutive(roles)`
     (ver agenda.tsx) — Financeiro e Secretária sequer a veem.
   ============================================================ */

interface PaymentRow {
  id: string;
  kind: "receber" | "pagar";
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
  received_at: string | null;
  paid_at: string | null;
  truck_id: string | null;
}

interface FinanceSnap {
  receivables?: Array<{
    id: string;
    description?: string | null;
    amount?: number | null;
    due_date?: string | null;
    received_at?: string | null;
    truck_id?: string | null;
  }>;
  payables?: Array<{
    id: string;
    description?: string | null;
    supplier?: string | null;
    amount?: number | null;
    due_date?: string | null;
    paid_at?: string | null;
    truck_id?: string | null;
  }>;
}

function toPaymentRows(snap?: FinanceSnap | null): PaymentRow[] {
  if (!snap) return [];
  const fromReceivable = (snap.receivables ?? []).map((r) => ({
    id: r.id,
    kind: "receber" as const,
    description: r.description || "Conta a receber",
    amount: Number(r.amount ?? 0),
    due_date: r.due_date ?? "",
    paid: r.received_at != null,
    received_at: r.received_at ?? null,
    paid_at: null,
    truck_id: r.truck_id ?? null,
  }));
  const fromPayable = (snap.payables ?? []).map((p) => ({
    id: p.id,
    kind: "pagar" as const,
    description: p.description || p.supplier || "Conta a pagar",
    amount: Number(p.amount ?? 0),
    due_date: p.due_date ?? "",
    paid: p.paid_at != null,
    received_at: null,
    paid_at: p.paid_at ?? null,
    truck_id: p.truck_id ?? null,
  }));
  return [...fromReceivable, ...fromPayable];
}

type Filter = "hoje" | "atrasados" | "proximos" | "pagos" | "todos";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "atrasados", label: "Atrasados" },
  { key: "proximos", label: "Próximos" },
  { key: "pagos", label: "Pagos" },
  { key: "todos", label: "Todos" },
];

export function PagamentosTab() {
  const { data, isLoading, isError } = useMobileFinance();
  const { data: trucks } = useTrucks();
  const invalidateMobile = useInvalidateMobile();
  const [filter, setFilter] = useState<Filter>("hoje");
  const [active, setActive] = useState<PaymentRow | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => toPaymentRows(data?.snap ?? null), [data?.snap]);

  const truckById = useMemo(() => {
    const m = new Map<string, NonNullable<NonNullable<typeof trucks>[number]>>();
    for (const t of trucks ?? []) m.set(t.id, t);
    return m;
  }, [trucks]);

  const today = (() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        switch (filter) {
          case "hoje":
            return !r.paid && r.due_date === today;
          case "atrasados":
            return !r.paid && r.due_date < today;
          case "proximos":
            return !r.paid && r.due_date > today;
          case "pagos":
            return r.paid;
          case "todos":
            return true;
        }
      })
      .sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));
  }, [rows, filter, today]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold pressable active:scale-95",
              filter === f.key ? "bg-gold text-gold-foreground" : "bg-background border-border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonRows rows={5} height={64} />
      ) : isError ? (
        <MobileCard>
          <SectionTitle>Erro ao carregar</SectionTitle>
          <p className="text-sm text-muted-foreground">Os dados financeiros não vieram agora.</p>
        </MobileCard>
      ) : filtered.length === 0 ? (
        <EmptyState title="Nada por aqui" hint="Nenhum lançamento nesta faixa de datas." />
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border bg-card">
          {filtered.slice(0, 50).map((p) => {
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left pressable active:scale-95"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    p.paid
                      ? "border-success/40 bg-success/10 text-success"
                      : p.due_date < today
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-gold/40 bg-gold/10 text-gold",
                  )}
                >
                  {p.paid ? (
                    <CheckCheck className="h-4 w-4" />
                  ) : p.due_date < today ? (
                    <CircleAlert className="h-4 w-4" />
                  ) : (
                    <Hourglass className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">
                    {p.kind === "receber" ? "A receber" : "A pagar"} — {p.description}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Truck className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {p.paid ? "pago" : p.due_date < today ? `atrasado (venceu ${dateBR(p.due_date)})` : `vence ${dateBR(p.due_date)}`}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-[14px] font-bold tabular-nums">{brl(p.amount)}</span>
              </button>
            );
          })}
        </div>
      )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <SheetHeader className="px-5 pb-2 pt-4 text-left">
            <SheetTitle className="text-base">
              {active ? (active.kind === "receber" ? "Conta a receber" : "Conta a pagar") : ""}
            </SheetTitle>
            <SheetDescription>Detalhes do lançamento financeiro</SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-6">
            {active ? (
              <>
                <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Descrição</dt>
                  <dd className="max-w-[55%] truncate font-semibold">{active.description}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Valor</dt>
                  <dd className="font-bold tabular-nums">{brl(active.amount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vencimento</dt>
                  <dd className="font-semibold tabular-nums">{active.due_date ? dateBR(active.due_date) : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Situação</dt>
                  <dd className={cn("font-bold", active.paid ? "text-success" : "text-destructive")}>
                    {active.paid ? "pago" : "em aberto"}
                  </dd>
                </div>
                {active.received_at ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Recebido em</dt>
                    <dd className="font-semibold tabular-nums">{dateBR(active.received_at)}</dd>
                  </div>
                ) : null}
                {active.paid_at ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pago em</dt>
                    <dd className="font-semibold tabular-nums">{dateBR(active.paid_at)}</dd>
                  </div>
                ) : null}
                {active.truck_id ? (
                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <dd className="flex min-w-0 items-center gap-2 text-muted-foreground">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {active.truck_id ? truckTitle(truckById.get(active.truck_id) ?? null) || "Caminhão" : "Caminhão"}
                        </span>
                      </dd>
                      <Link
                        to="/garagem/$truckId"
                        params={{ truckId: active.truck_id }}
                        className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[12px] font-bold pressable active:scale-95"
                        onClick={() => setActive(null)}
                      >
                        Abrir caminhão
                      </Link>
                    </div>
                  </div>
                ) : null}
              </dl>
                <div className="mt-4 space-y-2">
                {!active.paid ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        if (active.kind === "receber") {
                          await settleReceivable({ id: active.id });
                        } else {
                          await settlePayable({ id: active.id });
                        }
                        invalidateMobile(["receivables", "payables"]);
                        setActive(null);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Falha ao registrar");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-bold text-gold-foreground active:opacity-80 disabled:opacity-50"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {saving
                      ? "Registrando..."
                      : active.kind === "receber"
                        ? "Registrar recebimento"
                        : "Marcar como pago"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        if (active.kind === "receber") {
                          await reopenReceivable(active.id);
                        } else {
                          await reopenPayable(active.id);
                        }
                        invalidateMobile(["receivables", "payables"]);
                        setActive(null);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Falha ao reabrir");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-bold active:bg-muted/60 disabled:opacity-50"
                  >
                    <Hourglass className="h-4 w-4" />
                    {saving ? "Processando..." : "Reabrir lançamento"}
                  </button>
                )}
              </div>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
