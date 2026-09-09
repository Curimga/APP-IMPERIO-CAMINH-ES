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
  validateSearch: (s: Record<string, unknown>) => ({
    truck_id: typeof s.truck_id === "string" ? s.truck_id : undefined,
  }),
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
  const [tab, setTab] = useState<Tab>("andamento");
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

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["andamento", `Andamento (${andamento.length})`],
            ["atrasados", `Atrasados (${atrasados.length})`],
            ["concluidos", `Concluídos (${concluidos.length})`],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "h-10 rounded-xl border px-1 text-[13px] font-bold",
              tab === t ? "border-gold bg-gold text-gold-foreground" : "bg-background",
            )}
          >
            {label}
          </button>
        ))}
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
