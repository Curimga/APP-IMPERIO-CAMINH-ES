import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCheck, AlertTriangle, Wrench, DollarSign, Calendar, TrendingUp, Package, Users } from "lucide-react";
import { useNotifications } from "@/lib/mobile/queries";
import { markNotificationsRead } from "@/lib/mobile/actions";
import { MobileCard, SkeletonRows, EmptyState } from "@/components/mobile/ui";
import { mdBR, mdTime } from "@/lib/mobile/dates";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Enums } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/notificacoes")({
  component: Notificacoes,
});

const PRIORITY_DOT: Record<string, string> = {
  critica: "bg-destructive",
  alta: "bg-destructive",
  media: "bg-gold",
  baixa: "bg-muted-foreground",
};

const KIND_ICON: Partial<Record<Enums<"notification_type">, React.ReactNode>> = {
  manutencao: <Wrench className="h-4 w-4" />,
  financeiro: <DollarSign className="h-4 w-4" />,
  agenda: <Calendar className="h-4 w-4" />,
  vendas: <TrendingUp className="h-4 w-4" />,
  estoque: <Package className="h-4 w-4" />,
  clientes: <Users className="h-4 w-4" />,
  sistema: <Bell className="h-4 w-4" />,
};

const PREFIX_ICON: Record<string, React.ReactNode> = {
  info: <Bell className="h-4 w-4" />,
  success: <CheckCheck className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
};

function Notificacoes() {
  const { data, isLoading, isError } = useNotifications();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const markAll = async () => {
    const toRead = (data?.items ?? [])
      .filter((i) => !i.read && !readIds.has(i.id))
      .map((i) => i.id);
    if (!toRead.length) return;
    setReadIds((prev) => new Set([...prev, ...toRead]));
    try {
      await markNotificationsRead(toRead);
    } catch {
      /* silencioso */
    }
  };

  const markOne = async (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    try {
      await markNotificationsRead([id]);
    } catch {
      /* silencioso */
    }
  };

  const items = data?.items ?? [];
  const unread =
    (data?.unread ?? 0) -
    [...readIds].filter((id) => items.some((i) => i.id === id && !i.read)).length;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Notificações</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="flex h-10 items-center gap-1.5 rounded-xl border bg-background px-3 text-sm font-bold active:bg-muted/60"
          >
            <CheckCheck className="h-4 w-4" /> Marcar todas
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} height={64} />
      ) : isError ? (
        <EmptyState title="Erro ao carregar notificações" hint="Verifique sua conexão." />
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma notificação" hint="Avisos do sistema aparecem aqui." />
      ) : (
        <MobileCard className="divide-y">
          {items.map((n) => {
            const isRead = n.read || readIds.has(n.id);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => !isRead && markOne(n.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-3 text-left active:bg-muted/60",
                  !isRead && "bg-gold/[0.04]",
                )}
              >
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  {KIND_ICON[n.type] ?? PREFIX_ICON[n.type] ?? <Bell className="h-4 w-4" />}
                  <span
                    className={cn(
                      "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                      PRIORITY_DOT[n.priority] ?? "bg-muted-foreground",
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "text-[14px] leading-snug",
                      isRead ? "text-muted-foreground" : "font-semibold text-foreground",
                    )}
                  >
                    {n.message || n.title}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {n.link ? (
                      <Link to={n.link} className="text-gold" onClick={(e) => e.stopPropagation()}>
                        Ver detalhes
                      </Link>
                    ) : null}
                    {n.created_at ? (
                      <>
                        {" · "}
                        {mdBR(n.created_at)} {mdTime(n.created_at)}
                      </>
                    ) : null}
                  </div>
                </div>
                {!isRead && (
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-destructive" />
                )}
              </button>
            );
          })}
        </MobileCard>
      )}
    </>
  );
}
