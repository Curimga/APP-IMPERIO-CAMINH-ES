import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Download, Eraser, Minus, PaintBucket, Redo2, RotateCcw, Save, Share2, Trash2, Undo2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { getTruckFlowEvidenceUrl, uploadTruckFlowEvidence, type TruckFlowEvidence, type TruckFlowStep } from "@/lib/mobile/truck-flow";
import { MobileCard, btnGold, btnGhost } from "@/components/mobile/ui";
import { cn } from "@/lib/utils";
import { floodFill } from "@/lib/mobile/truck-flow-painter";

const PALETTE = ["#111827", "#ffffff", "#dc2626", "#f97316", "#facc15", "#16a34a", "#2563eb", "#7c3aed", "#ec4899", "#a16207"];
const PAINTING_PREFIX = "pintura-colorida-";
// Imagem padrão do aplicativo, compartilhada por todos os fluxos.
const DEFAULT_TRUCK_PAINTING_STORAGE_PATH = "7774953a-3eb2-4160-becb-8c126a193123/e3fe6e6f-2a0a-4389-830f-fdfc47c59268.png";

export function TruckFlowPainter({ step, onChanged }: { step: TruckFlowStep; onChanged: () => Promise<unknown> }) {
  const [original, setOriginal] = useState<ImageSource | null>(() => findOriginal());
  const [savedPainting, setSavedPainting] = useState<TruckFlowEvidence | null>(() => findSavedPainting(step.evidence));

  useEffect(() => {
    setOriginal(findOriginal());
    setSavedPainting(findSavedPainting(step.evidence));
  }, [step.evidence]);

  return (
    <MobileCard className="space-y-4 border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card p-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">Pintura do caminhão</div>
        <div className="mt-1 text-[13px] text-muted-foreground">Toque nas áreas fechadas para testar as cores do caminhão.</div>
      </div>
      {!original ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">A imagem original ainda não está disponível neste fluxo.</div>
      ) : (
        <PainterCanvas original={original} savedPainting={savedPainting} step={step} onChanged={onChanged} />
      )}
    </MobileCard>
  );
}

type ImageSource = { url: string; fileName: string; storagePath?: string; evidence?: TruckFlowEvidence };

function PainterCanvas({ original, savedPainting, step, onChanged }: { original: ImageSource; savedPainting: TruckFlowEvidence | null; step: TruckFlowStep; onChanged: () => Promise<unknown> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const redoRef = useRef<ImageData[]>([]);
  const [color, setColor] = useState(PALETTE[2]);
  const [customColor, setCustomColor] = useState(PALETTE[2]);
  const [tool, setTool] = useState<"fill" | "erase" | "pan">("fill");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [clearOpen, setClearOpen] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const originalUrlPromise = original.evidence
        ? getTruckFlowEvidenceUrl(original.evidence.storage_path)
        : original.storagePath
          ? getTruckFlowEvidenceUrl(original.storagePath)
          : Promise.resolve(original.url);
      const [currentUrl, originalUrl] = await Promise.all([
        savedPainting ? getTruckFlowEvidenceUrl(savedPainting.storage_path) : originalUrlPromise,
        originalUrlPromise,
      ]);
      const image = new Image();
      const baseImage = new Image();
      image.crossOrigin = "anonymous";
      baseImage.crossOrigin = "anonymous";
      image.onload = () => {
        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext("2d")?.drawImage(image, 0, 0);
        baseImageRef.current = baseImage;
        setRevision((value) => value + 1);
      };
      image.src = currentUrl;
      baseImage.src = originalUrl;
    };
    void load().catch(() => toast.error("Não foi possível carregar a imagem salva."));
    return () => { cancelled = true; };
  }, [original, savedPainting]);

  const fill = (event: PointerEvent<HTMLCanvasElement>) => {
    if (tool === "pan") {
      dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (tool !== "fill" && tool !== "erase") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
    const context = canvas.getContext("2d");
    if (!context) return;
    const before = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = floodFill(before, x, y, tool === "erase" ? [255, 255, 255, 255] : hexToRgba(color));
    if (!result.changed) {
      toast.error("Esta área não pôde ser preenchida com segurança.");
      return;
    }
    undoRef.current.push(before);
    redoRef.current = [];
    context.putImageData(result.image, 0, 0);
    setSaveState("idle");
    setRevision((value) => value + 1);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + event.clientX - dragRef.current.x,
      y: dragRef.current.oy + event.clientY - dragRef.current.y,
    });
  };

  const stopMove = () => { dragRef.current = null; };

  const undo = () => restoreHistory(undoRef, redoRef);
  const redo = () => restoreHistory(redoRef, undoRef);
  const restoreHistory = (from: React.MutableRefObject<ImageData[]>, to: React.MutableRefObject<ImageData[]>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const previous = from.current.pop();
    if (!canvas || !context || !previous) return;
    to.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    context.putImageData(previous, 0, 0);
    setSaveState("idle");
    setRevision((value) => value + 1);
  };

  const clear = () => {
    if (!clearOpen) return setClearOpen(true);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    undoRef.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    context.clearRect(0, 0, canvas.width, canvas.height);
    const image = baseImageRef.current;
    if (image) context.drawImage(image, 0, 0);
    redoRef.current = [];
    setClearOpen(false);
    setSaveState("idle");
    setRevision((value) => value + 1);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setSaveState("idle");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Não foi possível gerar o PNG.")), "image/png"));
      await uploadTruckFlowEvidence(step.id, new File([blob], `${PAINTING_PREFIX}${Date.now()}.png`, { type: "image/png" }));
      await onChanged();
      setSaveState("saved");
      toast.success("Pintura salva no fluxo.");
    } catch (error) {
      setSaveState("error");
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a pintura.");
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "volvo-fh-pintura.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.share) return download();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], "volvo-fh-pintura.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Pintura do Volvo FH" });
    else download();
  };

  return (
    <div className="space-y-3" data-revision={revision}>
      <div className="flex flex-wrap gap-2">
        {PALETTE.map((value) => <button key={value} type="button" aria-label={`Cor ${value}`} className={cn("h-8 w-8 rounded-full border-2", color === value && "ring-2 ring-foreground ring-offset-2")} style={{ backgroundColor: value }} onClick={() => { setColor(value); setTool("fill"); }} />)}
        <label className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2" style={{ backgroundColor: customColor }} aria-label="Cor personalizada"><input className="h-10 w-10 cursor-pointer" type="color" value={customColor} onChange={(event) => { setCustomColor(event.target.value); setColor(event.target.value); setTool("fill"); }} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={cn(btnGhost, "w-auto px-3")} onClick={() => setTool("fill")}><PaintBucket className="h-4 w-4" /> Pintar</button>
        <button type="button" className={cn(btnGhost, "w-auto px-3")} onClick={() => setTool("erase")}><Eraser className="h-4 w-4" /> Borracha</button>
        <button type="button" className={cn(btnGhost, "w-auto px-3")} onClick={() => setTool("pan")}><RotateCcw className="h-4 w-4" /> Mover</button>
        <button type="button" className={cn(btnGhost, "w-auto px-3")} disabled={!undoRef.current.length} onClick={undo}><Undo2 className="h-4 w-4" /></button>
        <button type="button" className={cn(btnGhost, "w-auto px-3")} disabled={!redoRef.current.length} onClick={redo}><Redo2 className="h-4 w-4" /></button>
        <button type="button" className={cn(btnGhost, "w-auto px-3")} onClick={clear}><Trash2 className="h-4 w-4" /> Limpar pintura</button>
      </div>
      {clearOpen && <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">Apagar toda a pintura? <button type="button" className="ml-2 font-bold underline" onClick={clear}>Confirmar</button> <button type="button" className="ml-2 underline" onClick={() => setClearOpen(false)}>Cancelar</button></div>}
      <div className="flex items-center justify-center gap-2">
        <button type="button" className={cn(btnGhost, "w-auto px-3")} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}><Minus className="h-4 w-4" /></button>
        <span className="min-w-14 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
        <button type="button" className={cn(btnGhost, "w-auto px-3")} onClick={() => setZoom((value) => Math.min(3, value + 0.25))}><ZoomIn className="h-4 w-4" /></button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-xl border bg-white p-2 touch-none">
        <canvas ref={canvasRef} onPointerDown={fill} onPointerMove={move} onPointerUp={stopMove} onPointerCancel={stopMove} className={cn("mx-auto block max-w-none origin-top-left", tool === "pan" ? "cursor-grab" : "cursor-crosshair")} style={{ width: `${zoom * 100}%`, transform: `translate(${offset.x}px, ${offset.y}px)` }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={btnGold} disabled={saving} onClick={save}><Save className="h-4 w-4" /> {saving ? "Salvando..." : saveState === "saved" ? "Salvo" : "Salvar no fluxo"}</button>
        <button type="button" className={btnGhost} onClick={download}><Download className="h-4 w-4" /> Baixar PNG</button>
      </div>
      <button type="button" className={btnGhost} onClick={share}><Share2 className="h-4 w-4" /> Compartilhar PNG</button>
      {saveState === "error" && <div className="text-xs font-semibold text-destructive">Erro ao salvar a pintura. Tente novamente.</div>}
      {saveState === "saved" && <div className="flex items-center gap-1 text-xs font-semibold text-success"><Check className="h-3.5 w-3.5" /> Pintura salva no fluxo.</div>}
    </div>
  );
}

function findOriginal(): ImageSource {
  return {
    url: "",
    fileName: "volvo-fh-para-colorir.png",
    storagePath: DEFAULT_TRUCK_PAINTING_STORAGE_PATH,
  };
}

function findSavedPainting(evidence: TruckFlowEvidence[]) {
  return evidence.filter((item) => item.file_name.startsWith(PAINTING_PREFIX)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const value = hex.replace("#", "");
  return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16), 255];
}
