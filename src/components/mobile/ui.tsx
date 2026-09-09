import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/truck-status";

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
        "rounded-2xl border bg-card shadow-[0_1px_3px_rgba(11,11,11,0.06)]",
        onClick && "active:bg-muted/60 transition-colors",
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
    <div className={cn("flex items-center justify-between mb-2 px-1", className)}>
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
        {children}
      </h2>
      {right}
    </div>
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">{icon}</div>
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
      <Link to={to as never} className="block active:bg-muted/60 transition-colors">
        {inner}
      </Link>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left active:bg-muted/60 transition-colors"
    >
      {inner}
    </button>
  );
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
  accent?: "default" | "gold" | "success" | "destructive" | "muted";
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    gold: "text-gold",
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
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
            <div className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
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
          className="mt-4 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-gold-foreground active:opacity-80"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
      {!error && hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full h-11 rounded-xl border bg-background px-3.5 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-gold placeholder:text-muted-foreground";

export const btnGold =
  "w-full h-12 rounded-xl bg-gold text-gold-foreground font-bold text-[15px] active:opacity-80 disabled:opacity-50";
export const btnGhost =
  "w-full h-12 rounded-xl border bg-background font-semibold text-[15px] active:bg-muted/60 disabled:opacity-50";
