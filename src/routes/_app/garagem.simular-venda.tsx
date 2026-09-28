import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, ImageDown, Lock, Plus, Printer, TrendingUp, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MobileCard, SectionTitle, SkeletonRows, EmptyState, StatusBadge } from "@/components/mobile/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTruckDetail, useTrucks } from "@/lib/mobile/queries";
import { maySeeTruckFinance } from "@/lib/mobile/truck-detail";
import { todayISO } from "@/lib/format";
import { truckTitle } from "@/lib/truck-title";
import { STATUS_LABEL } from "@/lib/truck-status";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo.png";
import {
  calculateCrmSaleProposal,
  addDaysToIsoDate,
  buildClientProposalDto,
  buildProposalCode,
  canPersistRealSaleSafely,
  centsFromMoney,
  formatCents,
  moneyFromCents,
  paymentDiffMessage,
  saleSimulatorFinanceAccess,
  type CommissionMode,
  type CrmPaymentMethod,
  type ClientProposalDto,
  type PaymentLineInput,
} from "@/lib/sales-simulator";

export const Route = createFileRoute("/_app/garagem/simular-venda")({
  validateSearch: (search: Record<string, unknown>): { truck_id?: string } => ({
    truck_id: typeof search.truck_id === "string" ? search.truck_id : undefined,
  }),
  component: SaleSimulatorRoute,
});

const PAYMENT_METHODS: { value: CrmPaymentMethod; label: string }[] = [
  { value: "PIX", label: "PIX" },
  { value: "TRANSFERENCIA", label: "Transferência/TED" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "CARTAO", label: "Cartão" },
  { value: "BOLETO", label: "Boleto" },
  { value: "OUTRO", label: "Outro" },
];

type StepKey = "truck" | "proposal" | "payment" | "result" | "export";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "truck", label: "Caminhão" },
  { key: "proposal", label: "Proposta" },
  { key: "payment", label: "Pagamento" },
  { key: "result", label: "Resultado" },
  { key: "export", label: "Exportar" },
];

function brlInput(cents: number) {
  return cents ? moneyFromCents(cents).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

function pctLabel(bps: number | null) {
  if (bps == null) return "—";
  return `${(bps / 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (cents: number) => void }) {
  const [draft, setDraft] = useState(() => brlInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(brlInput(value));
  }, [focused, value]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={draft}
        inputMode="decimal"
        placeholder="0,00"
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(centsFromMoney(e.target.value));
        }}
        onBlur={() => {
          setFocused(false);
          setDraft(brlInput(value));
        }}
      />
    </div>
  );
}

function ValueCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-[16px] font-black tabular-nums">{value}</div>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1500;
const PDF_WIDTH = 612;
const PDF_HEIGHT = Math.round((PDF_WIDTH * CARD_HEIGHT) / CARD_WIDTH);

function pdfFromJpegDataUrl(jpegDataUrl: string) {
  const base64 = jpegDataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const imageBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) imageBytes[i] = binary.charCodeAt(i);
  const imageBuffer = new ArrayBuffer(imageBytes.length);
  new Uint8Array(imageBuffer).set(imageBytes);
  const header = "%PDF-1.4\n";
  const pageContent = `q ${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm /Im1 Do Q\n`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >> endobj`,
    `4 0 obj << /Type /XObject /Subtype /Image /Width ${CARD_WIDTH} /Height ${CARD_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >> stream\n`,
    "\nendstream endobj",
    `5 0 obj << /Length ${new TextEncoder().encode(pageContent).length} >> stream\n${pageContent}endstream endobj`,
  ];
  const chunks: BlobPart[] = [header];
  const offsets = [0];
  let length = header.length;
  offsets.push(length);
  chunks.push(objects[0] + "\n");
  length += objects[0].length + 1;
  offsets.push(length);
  chunks.push(objects[1] + "\n");
  length += objects[1].length + 1;
  offsets.push(length);
  chunks.push(objects[2] + "\n");
  length += objects[2].length + 1;
  offsets.push(length);
  chunks.push(objects[3]);
  length += objects[3].length;
  chunks.push(imageBuffer);
  length += imageBytes.length;
  chunks.push(objects[4] + "\n");
  length += objects[4].length + 1;
  offsets.push(length);
  chunks.push(objects[5] + "\n");
  length += objects[5].length + 1;
  const xrefOffset = length;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  xref += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(xref);
  return new Blob(chunks, { type: "application/pdf" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const FONT_STACK = 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const INK = "#0B0B0C";
const INK_SOFT = "#4A4E57";
const GOLD = "#C99A2E";
const GOLD_SOFT = "#F6E7C2";
const PAPER = "#FBFAF7";
const LINE = "#E6E2D8";

type Ctx = CanvasRenderingContext2D;

async function ensureProposalFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("600 40px Inter"),
        document.fonts.load("700 40px Inter"),
        document.fonts.load("800 40px Inter"),
      ]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]);
  } catch {
    // canvas falls back to the next font in the stack
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function setFont(ctx: Ctx, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
}

function wrapText(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 4) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  let cursor = y;
  for (const line of lines.slice(0, maxLines)) {
    ctx.fillText(line, x, cursor);
    cursor += lineHeight;
  }
  return cursor;
}

function drawLogo(ctx: Ctx, logo: HTMLImageElement | null, x: number, y: number, maxWidth: number, maxHeight: number) {
  if (logo && logo.naturalWidth > 0) {
    const ratio = logo.naturalWidth / logo.naturalHeight;
    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
    ctx.drawImage(logo, x, y + (maxHeight - height) / 2, width, height);
    return width;
  }
  setFont(ctx, 800, 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("IMPÉRIO CAMINHÕES", x, y + maxHeight / 2 + 11);
  return maxWidth;
}

async function drawProposalCard(canvas: HTMLCanvasElement, opts: { logo: string; proposal: ClientProposalDto }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível para gerar a proposta.");
  await ensureProposalFonts();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.textBaseline = "alphabetic";
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  let logoImage: HTMLImageElement | null = null;
  try {
    logoImage = await loadImage(opts.logo);
  } catch {
    logoImage = null;
  }

  const margin = 64;
  const contentWidth = CARD_WIDTH - margin * 2;
  const proposal = opts.proposal;

  const background = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  background.addColorStop(0, "#FFFFFF");
  background.addColorStop(1, PAPER);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const header = ctx.createLinearGradient(0, 0, CARD_WIDTH, 300);
  header.addColorStop(0, "#0A0A0B");
  header.addColorStop(1, "#1C1C20");
  ctx.fillStyle = header;
  ctx.fillRect(0, 0, CARD_WIDTH, 300);
  const goldBar = ctx.createLinearGradient(0, 0, CARD_WIDTH, 8);
  goldBar.addColorStop(0, GOLD);
  goldBar.addColorStop(1, "#F2D38A");
  ctx.fillStyle = goldBar;
  ctx.fillRect(0, 0, CARD_WIDTH, 8);

  drawLogo(ctx, logoImage, margin, 46, 300, 84);

  setFont(ctx, 600, 20);
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.textAlign = "right";
  ctx.fillText("PROPOSTA COMERCIAL", CARD_WIDTH - margin, 76);
  setFont(ctx, 700, 22);
  ctx.fillStyle = GOLD;
  ctx.fillText(proposal.proposalCode, CARD_WIDTH - margin, 110);
  setFont(ctx, 400, 20);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(`Emitida em ${proposal.issuedAtLabel}`, CARD_WIDTH - margin, 146);
  ctx.fillText(`Válida até ${proposal.validUntilLabel}`, CARD_WIDTH - margin, 176);
  ctx.textAlign = "left";

  setFont(ctx, 600, 26);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText("VEÍCULO OFERECIDO", margin, 222);
  setFont(ctx, 800, 54);
  ctx.fillStyle = "#FFFFFF";
  let titleY = 262;
  titleY = wrapText(ctx, proposal.vehicleTitle, margin, titleY, contentWidth - 20, 62, 2);
  if (proposal.vehicleSubtitle) {
    setFont(ctx, 400, 26);
    ctx.fillStyle = "rgba(255,255,255,0.66)";
    wrapText(ctx, proposal.vehicleSubtitle, margin, titleY + 6, contentWidth - 20, 34, 2);
  }

  let y = 352;
  ctx.save();
  ctx.shadowColor = "rgba(11,11,12,0.10)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, margin, y, contentWidth, 176, 24);
  ctx.fill();
  ctx.restore();

  setFont(ctx, 600, 20);
  ctx.fillStyle = INK_SOFT;
  ctx.fillText("VALOR DA PROPOSTA", margin + 36, y + 46);
  setFont(ctx, 800, 62);
  ctx.fillStyle = INK;
  ctx.fillText(proposal.priceLabel, margin + 36, y + 108);

  if (proposal.contractLabel) {
    setFont(ctx, 700, 22);
    const badgeWidth = ctx.measureText(proposal.contractLabel).width + 56;
    ctx.fillStyle = GOLD_SOFT;
    roundRect(ctx, CARD_WIDTH - margin - 36 - badgeWidth, y + 62, badgeWidth, 52, 26);
    ctx.fill();
    ctx.fillStyle = "#7A5A12";
    ctx.textAlign = "center";
    ctx.fillText(proposal.contractLabel, CARD_WIDTH - margin - 36 - badgeWidth / 2, y + 96);
    ctx.textAlign = "left";
  }
  y += 176 + 28;

  const specsPerRow = 3;
  const specRowHeight = 108;
  const specRows = Math.ceil(proposal.specs.length / specsPerRow);
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, margin, y, contentWidth, 56 + specRows * specRowHeight, 24);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  setFont(ctx, 600, 20);
  ctx.fillStyle = INK_SOFT;
  ctx.fillText("ESPECIFICAÇÕES", margin + 36, y + 42);

  proposal.specs.forEach((spec, index) => {
    const column = index % specsPerRow;
    const row = Math.floor(index / specsPerRow);
    const cellWidth = (contentWidth - 72) / specsPerRow;
    const cellX = margin + 36 + column * cellWidth;
    const cellY = y + 76 + row * specRowHeight;
    setFont(ctx, 500, 19);
    ctx.fillStyle = INK_SOFT;
    ctx.fillText(spec.label.toUpperCase(), cellX, cellY);
    setFont(ctx, 700, 27);
    ctx.fillStyle = INK;
    wrapText(ctx, spec.value, cellX, cellY + 38, cellWidth - 28, 32, 2);
  });
  y += 56 + specRows * specRowHeight + 28;

  const paymentRows = proposal.payments.slice(0, 6);
  const paymentBlockHeight = 72 + Math.max(1, paymentRows.length) * 56 + 44;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, margin, y, contentWidth, paymentBlockHeight, 24);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  setFont(ctx, 600, 20);
  ctx.fillStyle = INK_SOFT;
  ctx.fillText("CONDIÇÕES DE PAGAMENTO", margin + 36, y + 44);

  if (paymentRows.length > 0) {
    setFont(ctx, 600, 18);
    ctx.fillStyle = "#8A8E97";
    ctx.fillText("PARCELA", margin + 36, y + 82);
    ctx.fillText("FORMA", margin + 150, y + 82);
    ctx.fillText("VENCIMENTO", margin + 400, y + 82);
    ctx.textAlign = "right";
    ctx.fillText("VALOR", CARD_WIDTH - margin - 36, y + 82);
    ctx.textAlign = "left";

    paymentRows.forEach((payment, index) => {
      const rowY = y + 116 + index * 56;
      ctx.strokeStyle = "#F0EDE5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margin + 36, rowY - 22);
      ctx.lineTo(CARD_WIDTH - margin - 36, rowY - 22);
      ctx.stroke();
      setFont(ctx, 700, 24);
      ctx.fillStyle = INK;
      ctx.fillText(payment.installment, margin + 36, rowY + 4);
      setFont(ctx, 500, 23);
      ctx.fillStyle = INK_SOFT;
      ctx.fillText(payment.method, margin + 150, rowY + 4);
      ctx.fillText(payment.dueLabel, margin + 400, rowY + 4);
      setFont(ctx, 700, 25);
      ctx.fillStyle = INK;
      ctx.textAlign = "right";
      ctx.fillText(payment.amountLabel, CARD_WIDTH - margin - 36, rowY + 4);
      ctx.textAlign = "left";
    });
  } else {
    setFont(ctx, 500, 24);
    ctx.fillStyle = INK_SOFT;
    wrapText(ctx, proposal.paymentSummary, margin + 36, y + 96, contentWidth - 72, 34, 2);
  }
  y += paymentBlockHeight + 28;

  if (proposal.publicNote) {
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, margin, y, contentWidth, 40, 20);
    ctx.fill();
    ctx.fillStyle = GOLD;
    roundRect(ctx, margin, y, 8, 40, 4);
    ctx.fill();
    setFont(ctx, 600, 19);
    ctx.fillStyle = INK_SOFT;
    ctx.fillText("OBSERVAÇÕES", margin + 32, y + 27);
    setFont(ctx, 400, 22);
    ctx.fillStyle = INK;
    wrapText(ctx, proposal.publicNote, margin + 32, y + 62, contentWidth - 64, 32, 4);
    y += 132;
  }

  const footerHeight = CARD_HEIGHT - y - 28;
  ctx.fillStyle = INK;
  roundRect(ctx, margin, y, contentWidth, Math.max(120, footerHeight), 24);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.fillRect(margin, y, contentWidth, 5);

  setFont(ctx, 600, 20);
  ctx.fillStyle = "rgba(255,255,255,0.60)";
  ctx.fillText("PRÓXIMOS PASSOS", margin + 36, y + 48);
  setFont(ctx, 400, 23);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  wrapText(
    ctx,
    `Confirmação de disponibilidade, análise de crédito e assinatura do contrato com a ${proposal.contactName}.`,
    margin + 36,
    y + 84,
    contentWidth - 380,
    32,
    3,
  );

  setFont(ctx, 600, 19);
  ctx.fillStyle = GOLD;
  ctx.fillText("CONTATO", CARD_WIDTH - margin - 330, y + 48);
  setFont(ctx, 700, 23);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(proposal.contactName, CARD_WIDTH - margin - 330, y + 82);
  setFont(ctx, 400, 20);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  wrapText(ctx, proposal.contactLine, CARD_WIDTH - margin - 330, y + 112, 294, 28, 3);

  setFont(ctx, 400, 17);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  wrapText(ctx, proposal.disclaimer, margin + 36, CARD_HEIGHT - 46, contentWidth - 72, 24, 2);
}


function canvasToBlob(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg", quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob || blob.size === 0 || blob.type !== type) {
          reject(new Error("Falha ao gerar imagem válida da proposta."));
          return;
        }
        resolve(blob);
      }, type, quality);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Canvas bloqueado por imagem externa."));
    }
  });
}

async function validateImageBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SaleSimulatorRoute() {
  const search = Route.useSearch();
  const { roles, user } = useAuth();
  const access = saleSimulatorFinanceAccess(roles, user?.email);
  const isExec = maySeeTruckFinance(roles, user?.email);
  const [step, setStep] = useState<StepKey>(search.truck_id ? "proposal" : "truck");
  const [truckSearch, setTruckSearch] = useState("");
  const [selectedTruckId, setSelectedTruckId] = useState(search.truck_id ?? "");
  const [proposedPriceCents, setProposedPriceCents] = useState(0);
  const [proposalDate, setProposalDate] = useState(todayISO());
  const [contractType, setContractType] = useState<"garantia" | "repasse">("garantia");
  const [notes, setNotes] = useState("");
  const [proposalContact, setProposalContact] = useState("");
  const [proposalPublicNote, setProposalPublicNote] = useState("");
  const [commissionMode] = useState<CommissionMode>("fixed");
  const [commissionFixedCents, setCommissionFixedCents] = useState(0);
  const [taxesCents, setTaxesCents] = useState(0);
  const [extraCostCents, setExtraCostCents] = useState(0);
  const [payments, setPayments] = useState<PaymentLineInput[]>([]);
  const [downloadOk, setDownloadOk] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const trucksQ = useTrucks();
  const detailQ = useTruckDetail(selectedTruckId || undefined);

  const trucks = trucksQ.data ?? [];
  const selectedTruck = detailQ.data?.truck ?? trucks.find((t) => t.id === selectedTruckId) ?? null;
  const announcedPriceCents = selectedTruck ? centsFromMoney(selectedTruck.expected_price ?? 0) : 0;
  const purchasePriceCents = selectedTruck ? centsFromMoney(selectedTruck.purchase_price ?? 0) : 0;
  const accumulatedExpensesCents = selectedTruck ? centsFromMoney(selectedTruck.expenses_total ?? 0) : 0;

  const result = calculateCrmSaleProposal({
    announcedPriceCents,
    proposedPriceCents,
    purchasePriceCents,
    accumulatedExpensesCents,
    taxesCents,
    extraCostCents,
    payments,
    commission: {
      enabled: isExec && commissionFixedCents > 0,
      mode: commissionMode,
      fixedCents: commissionFixedCents,
    },
    canSeeFinance: isExec,
  });

  const publicData = useMemo(() => selectedTruck ? {
    truckTitle: truckTitle(selectedTruck),
    truckSubtitle: [selectedTruck.brand, selectedTruck.model].filter(Boolean).join(" "),
    plate: selectedTruck.plate,
    year: selectedTruck.year,
    color: selectedTruck.color,
    mileageKm: selectedTruck.mileage,
    fuel: selectedTruck.fuel,
    chassis: selectedTruck.chassis,
    priceCents: result.proposedPriceCents,
    paymentSummary: payments.length ? payments.map((p) => `${PAYMENT_METHODS.find((m) => m.value === p.method)?.label}: ${formatCents(p.amountCents)}`).join(" | ") : "Condições de pagamento a combinar",
    payments: payments.map((p) => ({ method: PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method, amountCents: p.amountCents, dueDate: p.dueDate })),
    sellerName: "Império Caminhões",
    contactLine: proposalContact,
    contractType,
    issuedAt: proposalDate,
    validUntil: addDaysToIsoDate(proposalDate, 7),
    proposalCode: buildProposalCode(proposalDate),
    publicNote: proposalPublicNote,
  } : null, [contractType, payments, proposalContact, proposalDate, proposalPublicNote, result.proposedPriceCents, selectedTruck]);
  const clientProposal = useMemo(() => {
    if (!publicData) return null;
    try {
      return buildClientProposalDto(publicData);
    } catch {
      return null;
    }
  }, [publicData]);
  useEffect(() => {
    setImageBlob(null);
    setExportError(null);
    setImagePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, [clientProposal]);

  function selectTruck(id: string) {
    setSelectedTruckId(id);
    const truck = trucks.find((t) => t.id === id);
    const price = centsFromMoney(truck?.expected_price ?? 0);
    setProposedPriceCents(price);
    setPayments(price ? [{ id: crypto.randomUUID(), method: "PIX", amountCents: price, dueDate: proposalDate }] : []);
    setStep("proposal");
  }

  function canOpenStep(target: StepKey) {
    const order = STEPS.findIndex((s) => s.key === target);
    if (order <= 0) return true;
    if (!selectedTruck && order > 0) return false;
    if (proposedPriceCents <= 0 && order > 1) return false;
    return true;
  }

  function StepHeader() {
    return (
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" data-no-pull>
        {STEPS.map((item, index) => {
          const active = step === item.key;
          const enabled = canOpenStep(item.key);
          return (
            <button
              key={item.key}
              type="button"
              disabled={!enabled}
              onClick={() => setStep(item.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-bold disabled:opacity-40",
                active ? "border-gold bg-gold text-gold-foreground" : "bg-card text-muted-foreground",
              )}
            >
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-black/10 text-[10px]">{index + 1}</span>
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  function printProposal() {
    window.print();
  }

  async function generateImagePreview() {
    setDownloadOk(null);
    setExportError(null);
    if (!clientProposal) {
      setExportError("Selecione um caminhão e revise a proposta antes de gerar o arquivo.");
      return null;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      setExportError("Prévia da proposta ainda não está pronta.");
      return null;
    }
    try {
      await drawProposalCard(canvas, { logo: logoUrl, proposal: clientProposal });
      const blob = await canvasToBlob(canvas, "image/png");
      await validateImageBlob(blob);
      setImageBlob(blob);
      setImagePreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      setDownloadOk("Prévia da imagem gerada e validada.");
      return blob;
    } catch (error) {
      setImageBlob(null);
      setExportError(error instanceof Error ? error.message : "Falha ao gerar imagem da proposta.");
      return null;
    }
  }

  async function exportPdf() {
    setDownloadOk(null);
    setExportError(null);
    if (!clientProposal || !canvasRef.current) {
      setExportError("Gere uma proposta válida antes de exportar o PDF.");
      return;
    }
    try {
      await drawProposalCard(canvasRef.current, { logo: logoUrl, proposal: clientProposal });
      const jpegDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.92);
      if (!jpegDataUrl.startsWith("data:image/jpeg")) throw new Error("Falha ao gerar imagem base do PDF.");
      downloadBlob(pdfFromJpegDataUrl(jpegDataUrl), `proposta-imperio-${selectedTruck?.plate ?? "caminhao"}.pdf`);
      setDownloadOk("PDF baixado.");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Falha ao gerar PDF da proposta.");
    }
  }

  function downloadImage() {
    if (!imageBlob) {
      setExportError("Gere e confira a prévia antes de baixar a imagem.");
      return;
    }
    downloadBlob(imageBlob, `proposta-imperio-${selectedTruck?.plate ?? "caminhao"}.png`);
    setDownloadOk("Imagem baixada.");
  }

  const filteredTrucks = trucks.filter((t) => {
    const term = truckSearch.trim().toLowerCase();
    if (!term) return true;
    return [t.id, t.plate, t.brand, t.model, t.year].filter(Boolean).join(" ").toLowerCase().includes(term);
  }).slice(0, 20);

  if (!access.canAccess) {
    return (
      <>
        <Link to="/garagem" className="inline-flex items-center gap-2 text-sm font-bold text-gold"><ArrowLeft className="h-4 w-4" /> Garagem</Link>
        <MobileCard className="p-5 text-center"><Lock className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><h1 className="text-lg font-black">Simulador restrito</h1><p className="mt-2 text-sm text-muted-foreground">{access.reason}</p></MobileCard>
      </>
    );
  }

  const persistDecision = canPersistRealSaleSafely({ hasTruckId: Boolean(selectedTruck), hasCustomerId: true, hasSellerId: true, hasCrmSaleSimulatorAction: false });

  return (
    <>
      <div className="flex items-center gap-3">
        <Link to="/garagem" aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-black">Simular venda</h1><p className="text-[12px] text-muted-foreground">Proposta local baseada nos registros reais do CRM. Não grava venda.</p></div>
      </div>
      <StepHeader />

      {step === "truck" ? <MobileCard className="p-3">
        <SectionTitle className="mb-3">1. Caminhão</SectionTitle>
        <Input value={truckSearch} onChange={(e) => setTruckSearch(e.target.value)} placeholder="Buscar por placa, modelo ou ID" />
        {trucksQ.isLoading ? <SkeletonRows rows={3} height={48} /> : null}
        {trucksQ.isError ? <EmptyState title="Erro ao carregar caminhões" hint="Tente novamente." /> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {filteredTrucks.map((t) => (
            <button key={t.id} type="button" onClick={() => selectTruck(t.id)} className={cn("min-w-0 rounded-xl border p-3 text-left", selectedTruckId === t.id ? "border-gold bg-gold/10" : "bg-card")}>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold sm:text-base">{truckTitle(t)}</div>
                  <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{t.plate ?? "sem placa"} · ID {t.id.slice(0, 8)}</div>
                </div>
                <div className="shrink-0 scale-90 origin-top-right sm:scale-100"><StatusBadge status={t.status} /></div>
              </div>
            </button>
          ))}
        </div>
      </MobileCard> : null}

      {selectedTruck && step !== "truck" ? (
        <MobileCard className="p-3">
          <SectionTitle className="mb-2">Resumo do caminhão</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-3">
            <ValueCard label="Modelo" value={truckTitle(selectedTruck)} />
            <ValueCard label="Status" value={STATUS_LABEL[selectedTruck.status] ?? selectedTruck.status} />
            <ValueCard label="Preço anunciado" value={formatCents(announcedPriceCents)} />
          </div>
        </MobileCard>
      ) : null}

      {step === "proposal" ? <MobileCard className="p-3">
        <SectionTitle className="mb-3">2. Proposta</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Condição</Label><select value={contractType} onChange={(e) => setContractType(e.target.value as "garantia" | "repasse")} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="garantia">Garantia</option><option value="repasse">Repasse</option></select></div>
          <MoneyInput label="Preço proposto" value={proposedPriceCents} onChange={setProposedPriceCents} />
          <div className="space-y-1.5"><Label>Data da proposta</Label><Input type="date" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Observação interna da simulação</Label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Não aparece no card do cliente." /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Contato exibido na proposta</Label><Input value={proposalContact} onChange={(e) => setProposalContact(e.target.value)} placeholder="Telefone, WhatsApp ou e-mail comercial da loja" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Observação que aparece na proposta</Label><textarea value={proposalPublicNote} onChange={(e) => setProposalPublicNote(e.target.value)} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Ex.: Veículo comprocedência, documentation completa, entrega imediata." /></div>
        </div>
        <Button type="button" className="mt-3 w-full" disabled={proposedPriceCents <= 0} onClick={() => setStep("payment")}>Continuar para pagamento</Button>
      </MobileCard> : null}

      {step === "payment" ? <MobileCard className="p-3">
        <SectionTitle className="mb-3">3. Condições de pagamento</SectionTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setPayments((items) => [...items, { id: crypto.randomUUID(), method: "PIX", amountCents: 0, dueDate: proposalDate }])}><Plus className="h-4 w-4" /> Adicionar parcela</Button>
        <div className="mt-3 space-y-2">
          {payments.length === 0 ? <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">Nenhuma condição cadastrada.</p> : null}
          {payments.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_150px_150px_40px]">
                <select value={p.method} onChange={(e) => setPayments((items) => items.map((x) => x.id === p.id ? { ...x, method: e.target.value as CrmPaymentMethod } : x))} className="h-10 rounded-md border bg-background px-2 text-sm">{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
                <MoneyInput label="Valor" value={p.amountCents} onChange={(amountCents) => setPayments((items) => items.map((x) => x.id === p.id ? { ...x, amountCents } : x))} />
                <div className="space-y-1.5"><Label>Vencimento</Label><Input type="date" value={p.dueDate} onChange={(e) => setPayments((items) => items.map((x) => x.id === p.id ? { ...x, dueDate: e.target.value } : x))} /></div>
                <button type="button" aria-label="Remover" onClick={() => setPayments((items) => items.filter((x) => x.id !== p.id))} className="mt-6 flex h-10 items-center justify-center rounded-md border bg-card"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" className="mt-3 w-full" onClick={() => setStep("result")}>Ver resultado</Button>
      </MobileCard> : null}

      {step === "result" && isExec ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.48fr)]">
          <MobileCard className="p-5">
            <SectionTitle className="mb-5 text-base">Simulador de venda</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyInput label="Preço de venda (R$)" value={proposedPriceCents} onChange={setProposedPriceCents} />
              <MoneyInput label="Comissão (R$)" value={commissionFixedCents} onChange={setCommissionFixedCents} />
              <MoneyInput label="Impostos / taxas (R$)" value={taxesCents} onChange={setTaxesCents} />
              <MoneyInput label="Custo extra (R$)" value={extraCostCents} onChange={setExtraCostCents} />
            </div>
            <div className="mt-5 grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Valor de compra</span><strong>{formatCents(result.purchasePriceCents ?? 0)}</strong></div>
              <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Despesas acumuladas</span><strong>{formatCents(result.accumulatedExpensesCents ?? 0)}</strong></div>
              <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Comissão</span><strong>{formatCents(result.commissionCents ?? 0)}</strong></div>
              <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Impostos</span><strong>{formatCents(result.taxesCents ?? 0)}</strong></div>
              <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Custo extra</span><strong>{formatCents(result.extraCostCents ?? 0)}</strong></div>
              <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Custo total</span><strong>{formatCents(result.totalCostCents ?? 0)}</strong></div>
            </div>
          </MobileCard>

          <MobileCard className="border-success/40 p-5">
            <div className="mb-4 flex items-center gap-2 font-black"><TrendingUp className="h-4 w-4 text-success" />Resultado projetado</div>
            <div className="text-xs uppercase text-muted-foreground">Lucro líquido</div>
            <div className={cn("mt-1 text-3xl font-black tabular-nums", (result.netProfitCents ?? 0) >= 0 ? "text-success" : "text-destructive")}>{formatCents(result.netProfitCents ?? 0)}</div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-muted-foreground">Margem</div><div className="font-black">{pctLabel(result.marginBps)}</div></div>
              <div><div className="text-muted-foreground">Markup</div><div className="font-black">{pctLabel(result.markupBps)}</div></div>
            </div>
            <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">Margem bruta = (lucro / venda). Markup = (lucro / custo total).</p>
            <div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={!clientProposal} onClick={exportPdf}><FileText className="h-4 w-4" />PDF</Button><Button type="button" variant="outline" onClick={printProposal}><Printer className="h-4 w-4" />Imprimir</Button></div>
          </MobileCard>
        </div>
      ) : step === "result" ? (
        <MobileCard className="p-3">
          <SectionTitle className="mb-3">Resultado</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2"><ValueCard label="Preço proposto" value={formatCents(result.proposedPriceCents)} /><ValueCard label="Total condições" value={formatCents(result.paymentsTotalCents)} /></div>
        </MobileCard>
      ) : null}

      {step === "result" ? <MobileCard className="p-3">
        <SectionTitle className="mb-3">Conferência de pagamento</SectionTitle>
        <p className={cn("rounded-xl p-3 text-sm font-bold", result.isBalanced ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>{paymentDiffMessage(result.paymentDiffCents)}</p>
        <p className="mt-2 text-xs text-muted-foreground">{persistDecision.reason}</p>
        <Button type="button" className="mt-3 w-full" onClick={() => setStep("export")}>Finalizar e exportar</Button>
      </MobileCard> : null}

      {step === "export" ? <MobileCard className="p-3">
        <SectionTitle className="mb-3">Exportar proposta para cliente</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button type="button" disabled={!clientProposal} onClick={generateImagePreview}><ImageDown className="h-4 w-4" /> Gerar prévia</Button>
          <Button type="button" disabled={!clientProposal} onClick={exportPdf}><FileText className="h-4 w-4" /> Exportar PDF</Button>
          <Button type="button" disabled={!imageBlob} onClick={downloadImage}><ImageDown className="h-4 w-4" /> Baixar imagem</Button>
        </div>
        {downloadOk ? <p className="mt-2 text-sm font-bold text-success"><Download className="mr-1 inline h-4 w-4" />{downloadOk}</p> : null}
        {exportError ? <p className="mt-2 rounded-xl bg-destructive/10 p-3 text-sm font-bold text-destructive">{exportError}</p> : null}
        {imagePreviewUrl ? <div className="mt-4 overflow-hidden rounded-2xl border bg-muted p-2"><img src={imagePreviewUrl} alt="Prévia validada da proposta" className="mx-auto block w-full max-w-[360px] rounded-xl" /></div> : null}
        <div className={cn("mt-4 overflow-hidden rounded-2xl border bg-muted p-2", imagePreviewUrl && "sr-only")}><canvas ref={canvasRef} className="mx-auto block w-full max-w-[360px] rounded-xl" aria-label="Prévia da imagem da proposta" /></div>
        <p className="mt-2 text-xs text-muted-foreground">PDF e card do cliente não incluem custo de compra, comissão, margem, CPF/CNPJ ou notas internas.</p>
      </MobileCard> : null}
    </>
  );
}
