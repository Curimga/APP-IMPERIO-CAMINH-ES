import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Inbox, ArrowLeft, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/truck-status";

/* ============================================================
   Primários visuais do app premium — Império Caminhões
   ============================================================ */

export function MobileCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-card card-flat",
        onClick && "tap-gold active:opacity-80",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  right,
  className,
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between pb-1 pt-1", className)}>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {children}
      </h2>
      {right}
    </div>
  );
}

/** Cabeçalho de página com voltar, título e descrição opcional. */
export function PageHeader({
  title,
  subtitle,
  right,
  backTo,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  backTo?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {backTo && (
        <Link
          to={backTo as never}
          aria-label="Voltar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-card text-foreground pressable active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
  tone = "gold",
  count,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  tone?: "gold" | "default" | "success" | "destructive" | "info";
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold tap-gold pressable",
        active
          ? tone === "gold"
            ? "border-gold bg-gold text-gold-foreground"
            : tone === "success"
              ? "border-success bg-success text-success-foreground"
              : tone === "info"
                ? "border-info bg-info text-info-foreground"
                : tone === "destructive"
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground active:bg-muted/60",
      )}
    >
      {label}
      {count != null && count > 0 && (
        <span
          className={cn(
            "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
            active ? "bg-black/15 text-current" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function ListRow({
  to,
  title,
  subtitle,
  icon,
  right,
  onClick,
  unread,
  className,
}: {
  to?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  unread?: boolean;
  className?: string;
}) {
  const inner = (
    <div className={cn("flex items-center gap-3 px-3 py-3 min-h-11", className)}>
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[15px] font-medium leading-tight">{title}</div>
          {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {right ??
        (to || onClick ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        ) : null)}
    </div>
  );

  if (to)
    return (
      <Link
        to={to as never}
        className="block tap-gold active:bg-muted/50 transition-colors"
      >
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left tap-gold active:bg-muted/50 transition-colors"
      >
        {inner}
      </button>
    );
  return inner;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONE[status];
  const label = STATUS_LABEL[status] ?? status;
  if (!tone)
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          className,
        )}
      >
        {label}
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-snug",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function MoneyStat({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: ReactNode;
  accent?: "default" | "gold" | "success" | "destructive" | "muted" | "info";
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    gold: "text-gold-dark",
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
    info: "text-info",
  };
  return (
    <MobileCard className="p-3.5" onClick={onClick}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[17px] font-bold leading-tight tabular-nums",
          tones[accent ?? "default"],
        )}
      >
        {value}
      </div>
    </MobileCard>
  );
}

export function SkeletonRows({ rows = 5, height = 64 }: { rows?: number; height?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border bg-card" style={{ height }}>
          <div className="flex h-full items-center gap-3 px-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-muted/70" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-muted/70" />
              <div className="h-3 w-1/3 rounded bg-muted/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title = "Não foi possível carregar",
  hint = "Verifique sua conexão e tente novamente.",
  onRetry,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center coast-in">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
        <WifiOff className="h-6 w-6 text-destructive" />
      </div>
      <div className="mt-3 text-[15px] font-semibold">{title}</div>
      {hint && <div className="mt-1 max-w-[260px] text-[13px] text-muted-foreground">{hint}</div>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl border bg-card px-4 py-2.5 text-sm font-bold pressable active:scale-95"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  onAction,
  actionLabel,
}: {
  title: string;
  hint?: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="mt-3 text-[15px] font-semibold">{title}</div>
      {hint && <div className="mt-1 max-w-[260px] text-[13px] text-muted-foreground">{hint}</div>}
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-gold-foreground pressable active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Formulários premium
   ============================================================ */

export function Field({
  label,
  children,
  hint,
  error,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string | null;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-foreground">
        {label}
        {required && <span className="ml-0.5 text-gold-dark">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
      {!error && hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Grupo de campos com título de seção. */
export function FormSection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">
        {title}
      </h3>
      {children}
    </section>
  );
}

export const inputClass =
  "w-full h-11 rounded-xl border bg-card px-3.5 text-[15px] shadow-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold/70 placeholder:text-muted-foreground disabled:opacity-50";

export const btnGold =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold text-[15px] font-bold text-gold-foreground pressable disabled:opacity-50 disabled:pointer-events-none";
export const btnGhost =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-card text-[15px] font-semibold pressable disabled:opacity-50 disabled:pointer-events-none";