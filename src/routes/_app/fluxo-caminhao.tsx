import { useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, CircleDot, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { canAccessTruckFlow, canEditTruckFlow } from "@/lib/mobile/perm";
import {
  createTruckFlow,
  isTruckFlowDetailPath,
  useAvailableTrucksForFlow,
  useTruckFlowAccess,
  useTruckFlows,
} from "@/lib/mobile/truck-flow";
import { truckTitle } from "@/lib/truck-title";
import {
  Chip,
  EmptyState,
  ErrorState,
  Field,
  MobileCard,
  PageHeader,
  SkeletonRows,
  btnGold,
  inputClass,
} from "@/components/mobile/ui";

export const Route = createFileRoute("/_app/fluxo-caminhao")({
  component: TruckFlowRoute,
});

type Tab = "in_progress" | "completed";

function TruckFlowRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return isTruckFlowDetailPath(pathname) ? <Outlet /> : <TruckFlowPage />;
}

function TruckFlowPage() {
  const navigate = useNavigate();
  const { data: access, isLoading: accessLoading } = useTruckFlowAccess();
  const { data: flows = [], isLoading, isError, refetch } = useTruckFlows();
  const { data: availableTrucks = [], refetch: refetchAvailable } = useAvailableTrucksForFlow();
  const [tab, setTab] = useState<Tab>("in_progress");
  const [truckId, setTruckId] = useState("");
  const [saving, setSaving] = useState(false);

  if (accessLoading) return <SkeletonRows rows={4} height={92} />;
  if (!canAccessTruckFlow(access?.access_level)) {
    return <ErrorState title="Acesso não autorizado" hint="Seu usuário não possui acesso ao fluxo de caminhões." />;
  }
  if (isLoading) return <SkeletonRows rows={5} height={92} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const isEditor = canEditTruckFlow(access?.access_level);
  const inProgress = flows.filter((flow) => flow.status === "in_progress");
  const completed = flows.filter((flow) => flow.status === "completed");
  const visible = tab === "in_progress" ? inProgress : completed;

  const startFlow = async () => {
    if (!truckId) return;
    setSaving(true);
    try {
      await createTruckFlow(truckId);
      toast.success("Fluxo iniciado");
      await Promise.all([refetch(), refetchAvailable()]);
      navigate({ to: "/fluxo-caminhao/$truckId", params: { truckId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o fluxo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
       <PageHeader title="Fluxo de caminhão" subtitle="Nove etapas para preparar, vender e documentar o veículo" backTo="/menu" />

      {isEditor && availableTrucks.length > 0 && (
        <MobileCard className="space-y-3 p-4">
          <Field label="Iniciar fluxo de um caminhão">
            <select className={inputClass} value={truckId} onChange={(event) => setTruckId(event.target.value)}>
              <option value="">Selecione o caminhão</option>
              {availableTrucks.map((truck) => (
                <option key={truck.id} value={truck.id}>{truckTitle(truck)}{truck.plate ? ` · ${truck.plate}` : ""}</option>
              ))}
            </select>
          </Field>
          <button type="button" className={btnGold} disabled={!truckId || saving} onClick={startFlow}>
            <Plus className="h-4 w-4" /> {saving ? "Iniciando..." : "Iniciar fluxo"}
          </button>
        </MobileCard>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip label="Em andamento" count={inProgress.length} active={tab === "in_progress"} onClick={() => setTab("in_progress")} />
        <Chip label="Concluídos" count={completed.length} active={tab === "completed"} onClick={() => setTab("completed")} tone="success" />
      </div>

      {visible.length === 0 ? (
        <EmptyState title={tab === "in_progress" ? "Nenhum fluxo em andamento" : "Nenhum fluxo concluído"} hint={isEditor && availableTrucks.length > 0 ? "Selecione um caminhão acima para iniciar." : undefined} />
      ) : (
        <MobileCard className="divide-y divide-border/60">
          {visible.map((flow) => {
            const completedSteps = flow.steps.filter((step) => step.status === "completed").length;
            const totalSteps = flow.steps.length;
            const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
            return (
              <Link key={flow.id} to="/fluxo-caminhao/$truckId" params={{ truckId: flow.truck_id }} className="block px-3 py-3 active:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold">{flow.truck ? truckTitle(flow.truck) : "Caminhão"}</div>
                    <div className="mt-1 inline-flex rounded-md border border-foreground/15 bg-foreground/5 px-2 py-0.5 text-[13px] font-black tracking-[0.14em] text-foreground">
                      {flow.truck?.plate?.toUpperCase() ?? "SEM PLACA"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      {flow.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <CircleDot className="h-3.5 w-3.5 text-warning" />}
                      {flow.status === "completed" ? "Concluído" : "Em andamento"} · {completedSteps} de {totalSteps} etapas · {progress}%
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </MobileCard>
      )}
    </div>
  );
}
