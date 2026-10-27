import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clipboard, Clock3, ExternalLink, FileUp, History, MessageCircle, Paperclip, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { canAccessTruckFlow, canEditTruckFlow } from "@/lib/mobile/perm";
import {
  completeTruckFlowStep,
  getTruckFlowEvidenceUrl,
  removeTruckFlowEvidence,
  reopenTruckFlowStep,
  TRUCK_FLOW_STEPS,
  truckFlowStepDefinition,
  uploadTruckFlowEvidence,
  useTruckFlow,
  useTruckFlowAccess,
  type TruckFlowEvidence,
  type TruckFlowStep,
} from "@/lib/mobile/truck-flow";
import { truckTitle } from "@/lib/truck-title";
import { dateBR } from "@/lib/format";
import {
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
import { notifyDispatcherOnWhatsApp, truckFlowDispatcherMessage } from "@/lib/mobile/truck-flow-whatsapp";
import { TruckFlowPainter } from "@/components/mobile/truck-flow-painter";

export const Route = createFileRoute("/_app/fluxo-caminhao/$truckId")({
  component: TruckFlowDetailPage,
});

function TruckFlowDetailPage() {
  const { truckId } = Route.useParams();
  const { data: access, isLoading: accessLoading } = useTruckFlowAccess();
  const { data: flow, isLoading, isError, refetch } = useTruckFlow(truckId);

  if (accessLoading || isLoading) return <SkeletonRows rows={7} height={108} />;
  if (!canAccessTruckFlow(access?.access_level)) return <ErrorState title="Acesso não autorizado" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!flow) return <EmptyState title="Fluxo não encontrado" hint="Este caminhão ainda não possui um fluxo." />;

  const isEditor = canEditTruckFlow(access?.access_level);
  const completed = flow.steps.filter((step) => step.status === "completed").length;
  const totalSteps = Math.max(flow.steps.length, TRUCK_FLOW_STEPS.length);
  const progress = totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;
  const currentStep = flow.steps.find((step) => step.status === "pending");
  const isCompleted = flow.status === "completed";

  return (
    <div className="space-y-4">
      <PageHeader
        title={flow.truck ? truckTitle(flow.truck) : "Fluxo do caminhão"}
        subtitle={`Placa: ${flow.truck?.plate?.toUpperCase() ?? "Sem placa"} · ${completed} de ${totalSteps} etapas concluídas · ${progress}% do fluxo`}
        backTo="/fluxo-caminhao"
      />

      <MobileCard className="border-foreground/15 bg-card p-4">
        <div className="flex items-center gap-3">
          <TruckPlate plate={flow.truck?.plate} />
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Placa do caminhão</div>
            <div className="truncate text-[15px] font-bold">{flow.truck ? truckTitle(flow.truck) : "Caminhão"}</div>
          </div>
        </div>
      </MobileCard>

      {isCompleted && (
        <MobileCard className="border-success/40 bg-success/10 p-6 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" strokeWidth={2.5} />
          <div className="mt-3 text-2xl font-black uppercase tracking-tight text-success">Fluxo concluído</div>
          <div className="mt-1 text-sm text-muted-foreground">Todas as etapas deste caminhão foram finalizadas.</div>
        </MobileCard>
      )}

      <MobileCard className="overflow-hidden border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">Próxima etapa</div>
              <div className="mt-1 text-[17px] font-bold">{currentStep ? truckFlowStepDefinition(currentStep.step_key)?.label : "Fluxo concluído"}</div>
            </div>
            <div className="text-right text-[13px] font-bold text-gold-dark">{progress}%</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gold/15">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </MobileCard>

      <div className="space-y-3">
        {flow.steps.map((step) => (
          <StepCard key={step.id} flowId={flow.id} step={step} plate={flow.truck?.plate} isEditor={isEditor} onChanged={() => refetch()} />
        ))}
      </div>

      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1 text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <History className="h-4 w-4" /> Histórico
        </div>
        <MobileCard className="divide-y divide-border/60">
          {flow.events.map((event) => (
            <div key={event.id} className="px-3 py-3 text-[12px]">
              <div className="font-semibold">{eventLabel(event.event_type)}</div>
              <div className="mt-0.5 text-muted-foreground">{dateBR(event.created_at)} · usuário {event.actor_id.slice(0, 8)}</div>
              {event.reason && <div className="mt-1 text-muted-foreground">Motivo: {event.reason}</div>}
            </div>
          ))}
        </MobileCard>
      </section>
    </div>
  );
}

function TruckPlate({ plate }: { plate: string | null | undefined }) {
  return (
    <div className="flex h-12 min-w-28 shrink-0 items-center justify-center rounded-lg border-2 border-foreground/25 bg-background px-3 text-[15px] font-black tracking-[0.16em] text-foreground shadow-sm">
      {plate?.toUpperCase() ?? "SEM PLACA"}
    </div>
  );
}

function StepCard({ flowId, step, plate, isEditor, onChanged }: { flowId: string; step: TruckFlowStep; plate: string | null | undefined; isEditor: boolean; onChanged: () => Promise<unknown> }) {
  const definition = truckFlowStepDefinition(step.step_key);
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"complete" | "reopen" | null>(null);
  const [notes, setNotes] = useState(step.notes ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  const copyMessage = async (message: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Área de transferência indisponível.");
      await navigator.clipboard.writeText(message);
      setClipboardMessage(null);
      toast.success("Mensagem copiada. Cole no grupo e toque em enviar.");
    } catch {
      setClipboardMessage(message);
      toast.error("Não foi possível copiar. Use o botão ‘Copiar mensagem’ abaixo.");
    }
  };

  const notifyDispatcher = async () => {
    const message = truckFlowDispatcherMessage(plate);
    if (!message) {
      toast.error("Preencha a placa do caminhão antes de avisar o despachante.");
      return;
    }

    const result = await notifyDispatcherOnWhatsApp({
      plate,
      openGroup: (url) => window.open(url, "_blank", "noopener,noreferrer"),
      // Start clipboard permission from the original button gesture.
      copyMessage: (value) =>
        navigator.clipboard?.writeText(value) ?? Promise.reject(new Error("Área de transferência indisponível.")),
    });
    if (result.copied) {
      toast.success("Mensagem copiada. Cole no grupo e toque em enviar.");
    } else {
      setClipboardMessage(result.message);
      toast.error("Não foi possível copiar. Use o botão ‘Copiar mensagem’ abaixo.");
    }
  };

  const run = async () => {
    setSaving(true);
    try {
      if (mode === "complete") {
        await completeTruckFlowStep(flowId, step.step_key, notes);
        toast.success("Etapa concluída");
      } else if (mode === "reopen") {
        if (!reason.trim()) throw new Error("Informe o motivo da reabertura.");
        await reopenTruckFlowStep(flowId, step.step_key, reason);
        toast.success("Etapa reaberta");
      }
      setMode(null);
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a etapa.");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setSaving(true);
    try {
      await uploadTruckFlowEvidence(step.id, file);
      toast.success("Evidência anexada");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível anexar o arquivo.");
    } finally {
      setSaving(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <MobileCard className={cn("overflow-hidden", step.status === "completed" && "border-success/30")}>
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold", step.status === "completed" ? "bg-success/15 text-success" : "bg-gold/15 text-gold-dark")}>
            {step.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> : step.display_order}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold">{definition?.label ?? step.step_key}</div>
            {definition?.description && <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{definition.description}</div>}
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              {step.completed_at ? `Concluída em ${dateBR(step.completed_at)}` : "Pendente"}
            </div>
          </div>
        </div>

        {step.notes && <div className="rounded-xl bg-muted/40 px-3 py-2 text-[13px]">{step.notes}</div>}

        {isEditor && step.step_key === "orcamento_estetica_externa" && (
          <TruckFlowPainter step={step} onChanged={onChanged} />
        )}

        {isEditor && step.step_key === "vistoria_despachante" && (
          <div className="space-y-2">
            <button type="button" className={btnGhost} onClick={notifyDispatcher}>
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> Avisar despachante no WhatsApp
            </button>
            {clipboardMessage && (
              <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3">
                <div className="text-[12px] font-semibold text-warning">Mensagem não copiada. Copie abaixo e cole no grupo do WhatsApp:</div>
                <textarea
                  aria-label="Mensagem para o despachante"
                  className="min-h-24 w-full resize-none rounded-lg bg-background px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                  readOnly
                  value={clipboardMessage}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button type="button" className={btnGold} onClick={() => copyMessage(clipboardMessage)}>
                  <Clipboard className="h-4 w-4" /> Copiar mensagem
                </button>
              </div>
            )}
          </div>
        )}

        {step.evidence.length > 0 && (
          <div className="space-y-1.5">
            {step.evidence.map((evidence) => (
              <EvidenceRow key={evidence.id} evidence={evidence} canRemove={isEditor} onChanged={onChanged} />
            ))}
          </div>
        )}

        {isEditor && (
          <div className="grid grid-cols-2 gap-2">
            <input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => upload(event.target.files?.[0])} />
            <button type="button" className={btnGhost} disabled={saving} onClick={() => fileInput.current?.click()}>
              <FileUp className="h-4 w-4" /> Evidência
            </button>
            {step.status === "pending" ? (
              <button type="button" className={btnGold} onClick={() => setMode(mode === "complete" ? null : "complete")}>
                <CheckCircle2 className="h-4 w-4" /> Concluir
              </button>
            ) : (
              <button type="button" className={btnGhost} onClick={() => setMode(mode === "reopen" ? null : "reopen")}>
                <RotateCcw className="h-4 w-4" /> Reabrir
              </button>
            )}
          </div>
        )}

        {mode === "complete" && (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <Field label={definition?.descriptionRequired ? "Descrição do que precisa ser feito" : "Observações"} required={definition?.descriptionRequired}>
              <textarea className={cn(inputClass, "min-h-24 py-2")} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
            <button type="button" className={btnGold} disabled={saving || Boolean(definition?.descriptionRequired && !notes.trim())} onClick={run}>{saving ? "Salvando..." : "Confirmar conclusão"}</button>
          </div>
        )}

        {mode === "reopen" && (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <Field label="Motivo da reabertura" required>
              <textarea className={cn(inputClass, "min-h-24 py-2")} value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
            <button type="button" className={btnGold} disabled={saving || !reason.trim()} onClick={run}>{saving ? "Salvando..." : "Confirmar reabertura"}</button>
          </div>
        )}
      </div>
    </MobileCard>
  );
}

function EvidenceRow({ evidence, canRemove, onChanged }: { evidence: TruckFlowEvidence; canRemove: boolean; onChanged: () => Promise<unknown> }) {
  const [removing, setRemoving] = useState(false);

  const open = async () => {
    try {
      window.open(await getTruckFlowEvidenceUrl(evidence.storage_path), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o arquivo.");
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await removeTruckFlowEvidence(evidence);
      toast.success("Evidência removida");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover a evidência.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
      <Paperclip className="h-4 w-4 shrink-0 text-gold-dark" />
      <button type="button" onClick={open} className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold">{evidence.file_name}</button>
      <button type="button" onClick={open} aria-label="Abrir evidência"><ExternalLink className="h-4 w-4 text-muted-foreground" /></button>
      {canRemove && <button type="button" disabled={removing} onClick={remove} aria-label="Remover evidência"><Trash2 className="h-4 w-4 text-destructive" /></button>}
    </div>
  );
}

function eventLabel(value: string) {
  const labels: Record<string, string> = {
    created: "Fluxo criado",
    step_completed: "Etapa concluída",
    step_reopened: "Etapa reaberta",
    flow_completed: "Fluxo concluído",
    flow_reopened: "Fluxo reaberto",
    evidence_added: "Evidência adicionada",
    evidence_removed: "Evidência removida",
  };
  return labels[value] ?? value;
}
