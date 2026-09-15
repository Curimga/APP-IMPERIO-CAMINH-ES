import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Wrench, CheckCircle2, Clock } from "lucide-react";
import { useServices } from "@/lib/mobile/queries";
import type { ServiceItem } from "@/lib/mobile/queries";
import { setServiceStatus } from "@/lib/mobile/actions";
import { MobileCard, SkeletonRows, EmptyState } from "@/components/mobile/ui";
import { dateBR } from "@/lib/format";
import { mdRelative } from "@/lib/mobile/dates";
import { truckTitle } from "@/lib/truck-title";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/servicos")({
  validateSearch: (s: Record<string, unknown>) => {
    const r: { truck_id?: string; tab?: "atrasados" | "concluidos" } = {};
    if (typeof s.truck_id === "string") r.truck_id = s.truck_id;
    if (s.tab === "atrasados" || s.tab === "concluidos") r.tab = s.tab;
    return r;
  },
  component: Servicos,
});

type Tab = "andamento" | "atrasados" | "concluidos";

function ServiceItem({ s }: { s: ServiceItem }) {
  const isLate =
    s.status === "em_andamento" &&
    s.expected_at &&
    mdRelative(s.expected_at).startsWith("atrasado");
  const isConcluido = s.status === "concluido";
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          isConcluido
            ? "border-success/30 bg-success/15 text-success"
            : isLate
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-gold/30 bg-gold/15 text-gold",
        )}
      >
        {isConcluido ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : isLate ? (
          <Clock className="h-4 w-4" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link to="/garagem/$truckId" params={{ truckId: s.truck_id }}>
          <div className="truncate text-[15px] font-semibold">{s.title}</div>
          <div className="text-[12px] text-muted-foreground">
            Caminhão: {s.truck ? truckTitle(s.truck) : "—"}
          </div>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]">
          <span className="text-muted-foreground">Início {dateBR(s.created_at)}</span>
          {s.expected_at ? (
            <span
              className={cn("font-semibold", isLate ? "text-destructive" : "text-muted-foreground")}
            >
              Previsão {dateBR(s.expected_at)} · {mdRelative(s.expected_at)}
            </span>
          ) : null}
          {s.completed_at ? (
            <span className="text-muted-foreground">Conclusão {dateBR(s.completed_at)}</span>
          ) : null}
        </div>
        {s.notes ? (
          <div className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{s.notes}</div>
        ) : null}
      </div>
      {!isConcluido && (
        <div className="shrink-0">
          {s.status === "em_andamento" ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await setServiceStatus(s.id, "concluido");
                  toast.success("Serviço concluído");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Falha");
                }
              }}
              className="rounded-lg bg-success px-2.5 py-1.5 text-[11px] font-bold text-white active:opacity-80"
            >
              Concluir
            </button>
          ) : null}
          {s.status === "pendente" ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await setServiceStatus(s.id, "em_andamento");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Falha");
                }
              }}
              className="rounded-lg bg-gold px-2.5 py-1.5 text-[11px] font-bold text-gold-foreground active:opacity-80"
            >
              Iniciar
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Servicos() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(() =>
    search.tab === "atrasados" || search.tab === "concluidos" ? search.tab : "andamento",
  );
  const { data, isLoading, isError } = useServices();

  const all = data ?? [];
  const andamento = all.filter((s) => s.status === "em_andamento");
  const atrasados = all.filter(
    (s) =>
      s.status === "em_andamento" &&
      s.expected_at &&
      mdRelative(s.expected_at).startsWith("atrasado"),
  );
  const concluidos = all.filter((s) => s.status === "concluido");
  const list = tab === "andamento" ? andamento : tab === "atrasados" ? atrasados : concluidos;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Serviços</h1>
        <Link
          to="/servicos/novo"
          search={{ truck_id: search.truck_id }}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-3 text-sm font-bold text-gold-foreground active:opacity-80"
        >
          <Plus className="h-4 w-4" /> Novo
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-secondary p-1">
        {(
          [
            ["andamento", "Andamento"],
            ["atrasados", "Atrasados"],
            ["concluidos", "Concluídos"],
          ] as [Tab, string][]
        ).map(([t, label]) => {
          const n = t === "andamento" ? andamento.length : t === "atrasados" ? atrasados.length : concluidos.length;
          const bad = t === "atrasados";
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {label}
              {n > 0 && (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                    bad ? "bg-destructive/15 text-destructive" : "bg-gold/15 text-gold-dark",
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <SkeletonRows rows={5} height={72} />
      ) : isError ? (
        <EmptyState title="Erro ao carregar serviços" hint="Verifique sua conexão." />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nenhum serviço aqui"
          hint={
            tab === "concluidos"
              ? "Serviços concluídos aparecem nesta aba."
              : "Toque em 'Novo' para criar um serviço."
          }
        />
      ) : (
        <MobileCard className="divide-y">
          {list.map((s) => (
            <ServiceItem key={s.id} s={s} />
          ))}
        </MobileCard>
      )}
    </>
  );
}
