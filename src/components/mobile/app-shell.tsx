import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Truck,
  CalendarDays,
  Wrench,
  LayoutGrid,
  Plus,
  User,
  Package,
  Activity,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { canEditInventory, isAdmin } from "@/lib/mobile/perm";
import { AppHeader } from "@/components/mobile/header";
import { OfflineBanner } from "@/components/mobile/connection";
import { haptic } from "@/lib/mobile/haptic";
import { useNotifications, useServices } from "@/lib/mobile/queries";
import { RefreshSurface } from "@/components/mobile/pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const TABS = [
  { to: "/", label: "Início", icon: Home, active: (p: string) => p === "/" },
  {
    to: "/garagem",
    label: "Garagem",
    icon: Truck,
    active: (p: string) => p.startsWith("/garagem"),
  },
  {
    to: "/agenda",
    label: "Agenda",
    icon: CalendarDays,
    active: (p: string) => p.startsWith("/agenda"),
  },
  {
    to: "/servicos",
    label: "Serviços",
    icon: Wrench,
    active: (p: string) => p.startsWith("/servicos"),
  },
  {
    to: "/menu",
    label: "Menu",
    icon: LayoutGrid,
    active: (p: string) => p.startsWith("/menu"),
  },
] as const;

export function MobileTabBar() {
  const location = useLocation();
  const { data: notif } = useNotifications();
  const { data: services } = useServices();
  const unread = notif?.unread ?? 0;
  const delayedCount = (services ?? []).filter(
    (s) =>
      s.status === "em_andamento" &&
      s.expected_at &&
      s.expected_at.slice(0, 10) < new Date().toISOString().slice(0, 10),
  ).length;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.active(location.pathname);
          const badge =
            t.to === "/" ? unread : t.to === "/servicos" ? delayedCount : 0;
          return (
            <Link
              key={t.to}
              to={t.to as never}
              className="relative flex min-h-[58px] flex-col items-center justify-center gap-1 py-2"
              aria-current={isActive ? "page" : undefined}
            >
              {isActive ? (
                <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-gold" />
              ) : null}
              <span className="relative">
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    isActive ? "text-gold-dark" : "text-muted-foreground",
                  )}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white tabular-nums ring-2 ring-card">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  isActive ? "text-gold-dark" : "text-muted-foreground",
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export interface FabAction {
  label: string;
  description: string;
  icon: ReactNode;
  to?: string;
  onClick?: () => void;
}

function FabSheet({ actions }: { actions: FabAction[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (actions.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic(10);
          setOpen(true);
        }}
        aria-label="Ações rápidas"
        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+10px)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold text-gold-foreground shadow-premium pressable active:scale-95"
      >
        <Plus className="h-7 w-7" strokeWidth={2.4} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetHeader className="px-5 pb-2 pt-4 text-left">
            <SheetTitle className="text-base">Ações rápidas</SheetTitle>
            <SheetDescription>O que você deseja fazer agora?</SheetDescription>
          </SheetHeader>
          <div className="mt-2 space-y-0.5 px-2">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left tap-gold active:bg-muted/60"
                onClick={() => {
                  haptic(8);
                  setOpen(false);
                  if (a.to) navigate({ to: a.to as never });
                  a.onClick?.();
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary text-gold-dark">
                  {a.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold">{a.label}</div>
                  <div className="text-[12px] text-muted-foreground">{a.description}</div>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function useFabActions() {
  const { roles } = useAuth();
  const staff =
    roles.includes("admin") || roles.includes("financeiro") || roles.includes("secretaria");
  const actions: FabAction[] = [];
  if (staff) {
    actions.push({
      label: "Cadastrar caminhão",
      description: "Adicionar veículo à garagem",
      icon: <Truck className="h-5 w-5" />,
      to: "/garagem/novo",
    });
  }
  actions.push({
    label: "Criar compromisso",
    description: "Agendar na agenda",
    icon: <CalendarDays className="h-5 w-5" />,
    to: "/agenda/novo",
  });
  actions.push({
    label: "Cadastrar cliente",
    description: "Novo cliente",
    icon: <User className="h-5 w-5" />,
    to: "/clientes/novo",
  });
  actions.push({
    label: "Criar serviço",
    description: "Serviço para caminhão",
    icon: <Wrench className="h-5 w-5" />,
    to: "/servicos/novo",
  });
  if (canEditInventory(roles)) {
    actions.push({
      label: "Adicionar item ao estoque",
      description: "Item de material",
      icon: <Package className="h-5 w-5" />,
      to: "/estoque/novo",
    });
  }
  if (isAdmin(roles)) {
    actions.push({
      label: "Financeiro",
      description: "Indicadores e lançamentos",
      icon: <Activity className="h-5 w-5" />,
      to: "/financeiro",
    });
    actions.push({
      label: "Criar pagamento",
      description: "Pagar ou receber",
      icon: <Wallet className="h-5 w-5" />,
      to: "/pagamentos/novo",
    });
  }
  return actions;
}

/** Estrutura do app mobile: cabeçalho premium, conteúdo e navegação inferior. */
export function AppShell({ children }: { children: ReactNode }) {
  const actions = useFabActions();
  const qc = useQueryClient();
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background px-4 pb-28 text-foreground lg:max-w-2xl">
      <RefreshSurface
        onRefresh={() => {
          haptic(10);
          return qc.invalidateQueries();
        }}
      >
        <AppHeader />
        <OfflineBanner />
        <main className="space-y-3">{children}</main>
        <MobileTabBar />
        <FabSheet actions={actions} />
      </RefreshSurface>
    </div>
  );
}