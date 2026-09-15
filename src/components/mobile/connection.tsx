import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConnStatus = "online" | "reconnecting" | "offline";

/**
 * Estado de conexão do dispositivo + saúde do canal Realtime do Supabase.
 * O app nunca sincroniza "com o CRM" diretamente — usamos o mesmo banco.
 */
export function useConnection(): ConnStatus {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const onBack = () => {
      if (!online) setReconnecting(true);
      const t = setTimeout(() => setReconnecting(false), 900);
      return () => clearTimeout(t);
    };
    window.addEventListener("online", onBack);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.removeEventListener("online", onBack);
    };
  }, [online]);

  if (!online) return "offline";
  if (reconnecting) return "reconnecting";
  return "online";
}

export const CONN_META: Record<
  ConnStatus,
  { label: string; dot: string; text: string; icon: typeof Wifi }
> = {
  online: { label: "Online", dot: "bg-success", text: "text-sidebar-foreground/70", icon: Wifi },
  reconnecting: {
    label: "Reconectando",
    dot: "bg-warning animate-pulse",
    text: "text-sidebar-foreground/70",
    icon: RefreshCw,
  },
  offline: { label: "Offline", dot: "bg-destructive", text: "text-sidebar-foreground/70", icon: WifiOff },
};

/** Pílula discreta de status de conexão (usada no cabeçalho premium). */
export function ConnectionPill({ className }: { className?: string }) {
  const status = useConnection();
  const meta = CONN_META[status];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-sidebar-accent/60 px-2.5 py-1",
        className,
      )}
      title={meta.label}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      <Icon className={cn("h-3 w-3", meta.text)} />
      <span className={cn("text-[10px] font-semibold", meta.text)}>{meta.label}</span>
    </div>
  );
}

/** Banner de aviso quando offline (substitui o antigo OfflineBanner). */
export function OfflineBanner() {
  const status = useConnection();
  if (status !== "offline") return null;
  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] font-medium text-warning-foreground"
      role="status"
    >
      <CloudOff className="h-4 w-4 shrink-0" />
      Sem conexão — os dados podem estar desatualizados. Conecte-se para consultar ou salvar.
    </div>
  );
}