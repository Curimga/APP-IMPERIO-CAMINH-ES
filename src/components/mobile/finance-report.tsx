import { useState } from "react";
import { Layers, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import { haptic } from "@/lib/mobile/haptic";
import {
  computeMonthlyReports,
  computeWeeklyReports,
  type DashboardSnapshot,
  type PeriodReport,
} from "@/lib/dashboard-data";
import { MobileCard, MoneyStat, SectionTitle } from "./ui";

type PeriodMode = "semana" | "mes";

function Value({ value, reveal }: { value: number; reveal: boolean }) {
  return <>{reveal ? brl(value) : "R$ ••••"}</>;
}

function Lucro({ value, reveal, className }: { value: number; reveal: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      <Value value={value} reveal={reveal} />
    </span>
  );
}

function WaterfallRow({
  label,
  raw,
  sign,
  reveal,
  strong,
}: {
  label: string;
  raw: number;
  sign: "plus" | "minus" | "none";
  reveal: boolean;
  strong?: boolean;
}) {
  const color =
    sign === "plus" ? "text-success" : sign === "minus" ? "text-destructive" : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0 truncate text-[13px] text-muted-foreground">
        {sign === "minus" && <span className="mr-1 font-bold text-destructive">−</span>}
        {label}
      </span>
      <span
        className={cn(
          "shrink-0",
          strong ? "text-[16px] font-extrabold" : "text-[14px] font-semibold",
          color,
        )}
      >
        {reveal ? brl(raw) : "R$ ••••"}
      </span>
    </div>
  );
}

function Subtotal({ label, raw, pct, reveal }: { label: string; raw: number; pct: number; reveal: boolean }) {
  return (
    <>
      <div className="my-1 flex items-center gap-2">
        <span className="h-px flex-1 bg-border" />
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label} · {pct.toFixed(1)}%
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex items-center justify-between gap-3 py-1.5">
        <span className="text-[13px] font-semibold">{label}</span>
        <Lucro value={raw} reveal={reveal} className="text-[16px] font-extrabold" />
      </div>
    </>
  );
}

function WaterfallCard({ report, reveal }: { report: PeriodReport; reveal: boolean }) {
  return (
    <MobileCard className="p-4">
      <SectionTitle className="mb-1">
        <span className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-gold" /> Como o lucro é calculado
        </span>
      </SectionTitle>
      <WaterfallRow label="(+) Receita de vendas" raw={report.receita} sign="plus" reveal={reveal} />
      <WaterfallRow label="(−) Compra dos veículos" raw={-report.custoCompra} sign="minus" reveal={reveal} />
      <Subtotal label="(=) Lucro bruto" raw={report.lucroBruto} pct={report.margemBruta} reveal={reveal} />
      <WaterfallRow label="(−) Despesas diretas (caminhões)" raw={-report.despesasDiretas} sign="minus" reveal={reveal} />
      <Subtotal
        label="(=) Lucro líquido caminhões"
        raw={report.lucroLiquidoCaminhoes}
        pct={report.margemLiquidaCaminhoes}
        reveal={reveal}
      />
      <div className="mt-3 rounded-xl border border-dashed border-border p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Resultado global do CRM
        </div>
        <WaterfallRow label="Lucro bruto" raw={report.lucroBruto} sign="plus" reveal={reveal} />
        <WaterfallRow label="(−) Despesas gerais / OPEX" raw={-report.opex} sign="minus" reveal={reveal} />
        <Subtotal label="(=) Resultado líquido global" raw={report.resultadoGlobal} pct={report.margemGlobal} reveal={reveal} />
      </div>
    </MobileCard>
  );
}

function PeriodRow({ item }: { item: PeriodReport }) {
  const lucro = item.resultadoGlobal;
  const margem = item.margemGlobal;
  return (
    <div className="flex items-center gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-[14px] font-semibold leading-tight">
          {item.label}
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
            {item.vendas} {item.vendas === 1 ? "venda" : "vendas"}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {item.rangeLabel} · Receita {brl(item.receita)} · Desp. {brl(item.opex)}
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-muted">
          <div
            className={cn(
              "h-full min-w-0 rounded-l",
              lucro > 0 ? "bg-success" : lucro < 0 ? "bg-destructive" : "bg-muted-foreground/40",
            )}
            style={{
              width: `${Math.min(100, Math.max(margem, 0))}%`,
              transform: lucro < 0 ? "scaleX(-1)" : undefined,
              transformOrigin: lucro < 0 ? "right" : "left",
            }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <Lucro value={lucro} reveal className="text-[14px] font-bold" />
        <div className={cn("text-[10px] font-semibold tabular-nums", lucro >= 0 ? "text-success" : "text-destructive")}>
          {lucro >= 0 ? "+" : ""}{margem.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function PeriodCard({ header, items }: { header: string; items: PeriodReport[] }) {
  if (items.length === 0)
    return (
      <MobileCard className="p-4 text-center text-[13px] text-muted-foreground">
        Sem dados no período.
      </MobileCard>
    );
  const list = [...items].reverse();
  return (
    <MobileCard className="p-3">
      <SectionTitle className="mb-1">{header}</SectionTitle>
      <div className="divide-y divide-border/60">
        {list.map((item) => (
          <PeriodRow key={item.key || item.rangeLabel} item={item} />
        ))}
      </div>
    </MobileCard>
  );
}

export function FinanceReport({ snap, reveal }: { snap: DashboardSnapshot; reveal: boolean }) {
  const [mode, setMode] = useState<PeriodMode>("mes");
  const months = computeMonthlyReports(snap, 12);
  const weeks = computeWeeklyReports(snap, 8);
  const current = (mode === "mes" ? months : weeks).at(-1);
  const isNew = mode === "mes";

  return (
    <div className="space-y-3">
      {/* Seletor de período */}
      <div className="flex items-center gap-2">
        {(
          [
            { v: "mes", label: "Mensal" },
            { v: "semana", label: "Semanal" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => {
              haptic(10);
              setMode(opt.v);
            }}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-bold pressable",
              mode === opt.v
                ? "border-gold bg-gold text-gold-foreground"
                : "bg-card text-muted-foreground active:bg-muted/60",
            )}
          >
            {opt.v === "mes" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {opt.label}
          </button>
        ))}
      </div>

      {current && (
        <>
          {/* Resumo do período atual */}
          <MobileCard className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-dark">
                  {isNew ? "Relatório mensal" : "Relatório semanal"}
                </div>
                <div className="mt-0.5 text-[18px] font-extrabold leading-tight">
                  {current.label}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {current.rangeLabel} · {current.vendas} {current.vendas === 1 ? "venda" : "vendas"}
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Resultado do período
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MoneyStat label="Faturamento realizado" value={<Value value={current.receita} reveal={reveal} />} accent="gold" />
              <MoneyStat
                label="Lucro bruto"
                value={
                  <span className={cn(current.lucroBruto >= 0 ? "text-success" : "text-destructive")}>
                    <Value value={current.lucroBruto} reveal={reveal} />
                  </span>
                }
                accent={current.lucroBruto >= 0 ? "success" : "destructive"}
              />
              <MoneyStat
                label="Lucro líquido caminhões"
                value={
                  <span className={cn(current.lucroLiquidoCaminhoes >= 0 ? "text-success" : "text-destructive")}>
                    <Value value={current.lucroLiquidoCaminhoes} reveal={reveal} />
                  </span>
                }
                accent={current.lucroLiquidoCaminhoes >= 0 ? "success" : "destructive"}
              />
              <MoneyStat
                label="Resultado líquido global"
                value={
                  <span className={cn(current.resultadoGlobal >= 0 ? "text-success" : "text-destructive")}>
                    <Value value={current.resultadoGlobal} reveal={reveal} />
                  </span>
                }
                accent={current.resultadoGlobal >= 0 ? "success" : "destructive"}
              />
            </div>

            <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Estrutura de custos
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MoneyStat label="Compra dos veículos" value={<Value value={current.custoCompra} reveal={reveal} />} accent="muted" />
              <MoneyStat label="Despesas diretas" value={<Value value={current.despesasDiretas} reveal={reveal} />} accent="muted" />
              <MoneyStat label="Custo total dos caminhões" value={<Value value={current.custoTotal} reveal={reveal} />} accent="muted" />
              <MoneyStat label="Despesas gerais / OPEX" value={<Value value={current.opex} reveal={reveal} />} accent="muted" />
            </div>
          </MobileCard>

          <WaterfallCard report={current} reveal={reveal} />

          <PeriodCard
            header={isNew ? "Comparativo dos últimos 12 meses" : "Comparativo das últimas 8 semanas"}
            items={isNew ? months : weeks}
          />
        </>
      )}
    </div>
  );
}
