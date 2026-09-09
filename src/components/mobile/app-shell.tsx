import { useEffect, useState, type ReactNode } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/mobile/perm";
import { NotificationsBell } from "@/components/notifications-bell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { mdWeekdayLabel } from "@/lib/mobile/dates";

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

function MobileHeader() {
  const { profile, roles } = useAuth();
  const name = profile?.full_name?.split(" ")[0] ?? "usuário";
  const initial = (profile?.full_name?.[0] ?? "U").toUpperCase();
  return (
    <header
      className="sticky top-0 z-30 -mx-4 mb-3 rounded-b-2xl bg-sidebar text-sidebar-foreground shadow-premium"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="px-4 pb-3 pt-3 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-gold text-gold-foreground flex items-center justify-center font-extrabold text-sm">
            IMP
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-[15px] font-bold leading-tight">
              Olá, <span className="truncate">{name}</span>
            </div>
            <div className="text-[11px] capitalize leading-tight text-sidebar-foreground/60">
              {roleLabel(roles)} · {mdWeekdayLabel().split(",")[0]}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <Link
            to="/perfil"
            aria-label="Perfil"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground font-bold"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}

function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  if (online) return null;
  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] font-medium text-warning-foreground"
      role="status"
    >
      <span className="h-2 w-2 rounded-full bg-warning" />
      Sem conexão — os dados exibidos podem estar desatualizados. Conecte-se para consultar ou
      salvar.
    </div>
  );
}

export interface FabAction {
  label: string;
  description: string;
  icon: ReactNode;
  to?: string;
  onClick?: () => void;
}

function FabSheet({
  actions,
  onNavigate,
}: {
  actions: FabAction[];
  onNavigate: (to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (actions.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ações rápidas"
        className="fixed right-4 bottom-[calc(64px+env(safe-area-inset-bottom)+10px)] z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold text-gold-foreground shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="h-7 w-7" strokeWidth={2.4} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 pb-6"
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
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-muted/60"
                onClick={() => {
                  setOpen(false);
                  if (a.to) onNavigate(a.to);
                  a.onClick?.();
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
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

export function MobileTabBar() {
  const location = useLocation();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.active(location.pathname);
          return (
            <Link
              key={t.to}
              to={t.to as never}
              className="flex flex-col items-center gap-1 py-2.5 min-h-[56px] justify-center"
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-[22px] w-[22px]",
                  isActive ? "text-gold" : "text-muted-foreground",
                )}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  isActive ? "text-gold" : "text-muted-foreground",
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

/** Estrutura do app mobile: cabeçalho, conteúdo scrollável e navegação inferior. */
export function AppShell({ children }: { children: ReactNode }) {
  const { roles } = useAuth();
  const nav = useNavigate();

  const allowedActions = (): FabAction[] => {
    const list: FabAction[] = [];
    if (roles.includes("admin") || roles.includes("secretaria") || roles.includes("financeiro")) {
      list.push({
        label: "Cadastrar caminhão",
        description: "Adicionar veículo à garagem",
        icon: <Truck className="h-5 w-5" />,
        to: "/garagem/novo",
      });
    }
    list.push({
      label: "Criar compromisso",
      description: "Agendar na agenda",
      icon: <CalendarDays className="h-5 w-5" />,
      to: "/agenda/novo",
    });
    list.push({
      label: "Cadastrar cliente",
      description: "Novo cliente",
      icon: <User className="h-5 w-5" />,
      to: "/clientes/novo",
    });
    list.push({
      label: "Criar serviço",
      description: "Serviço para caminhão",
      icon: <Wrench className="h-5 w-5" />,
      to: "/servicos/novo",
    });
    list.push({
      label: "Adicionar item ao estoque",
      description: "Item de material",
      icon: <Package className="h-5 w-5" />,
      to: "/estoque/novo",
    });
    return list;
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background px-4 pb-28 text-foreground lg:max-w-2xl">
      <MobileHeader />
      <OfflineBanner />
      <main className="space-y-3">{children}</main>
      <MobileTabBar />
      <FabSheet actions={allowedActions()} onNavigate={(to) => nav({ to: to as never })} />
    </div>
  );
}
