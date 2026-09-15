import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { roleLabel } from "@/lib/mobile/perm";
import { NotificationsBell } from "@/components/notifications-bell";
import { ConnectionPill } from "@/components/mobile/connection";
import logo from "@/assets/logo.png";

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function shortDate(d = new Date()): string {
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * Cabeçalho premium do app: logo, saudação, cargo, data, sino, avatar e busca.
 * Fundo escuro com identidade automotiva da Império.
 */
export function AppHeader() {
  const { profile, roles } = useAuth();
  const name = profile?.full_name?.split(" ")[0] ?? "usuário";
  const initial = (profile?.full_name?.[0] ?? "U").toUpperCase();

  return (
    <header
      className="gradient-dark sticky top-0 z-30 -mx-4 mb-3 rounded-b-xl border-b border-sidebar-border text-sidebar-foreground"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
            <img src={logo} alt="Império Caminhões" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold leading-tight">
              {greeting()}, <span className="truncate">{name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] leading-tight text-sidebar-foreground/60">
              <span className="capitalize">{roleLabel(roles)}</span>
              <span>·</span>
              <span>{shortDate()}</span>
            </div>
          </div>
        </div>
        <ConnectionPill className="hidden sm:flex" />
        <div className="flex items-center gap-1.5">
          <Link
            to="/busca"
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-accent/60 text-sidebar-foreground pressable active:scale-95"
          >
            <Search className="h-[18px] w-[18px]" />
          </Link>
          <NotificationsBell />
          <Link
            to="/perfil"
            aria-label="Perfil"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-sm font-extrabold text-gold-foreground pressable active:scale-95"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}