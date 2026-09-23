import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isFinancialNotification } from "@/lib/mobile/queries";
import { notificationLinkTarget } from "@/lib/mobile/notification-link";
import { markNotificationsRead } from "@/lib/mobile/actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notif {
  id: string;
  title: string;
  message: string | null;
  type: string;
  priority: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

const PRIORITY_DOT: Record<string, string> = {
  baixa: "bg-muted-foreground",
  media: "bg-gold",
  alta: "bg-warning",
  critica: "bg-destructive",
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter((i) => !i.read).length;

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(15);
    setItems(((data as Notif[]) ?? []).filter((n) => !isFinancialNotification(n)));
  };

  useEffect(() => {
    load();
    const channelName = `notifications-bell-${user?.id ?? "anon"}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user) return;
    await markNotificationsRead(items.filter((i) => !i.read).map((i) => i.id));
    load();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <div className="font-semibold">Notificações</div>
            <div className="text-xs text-muted-foreground">{unread} não lidas</div>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação ainda.</div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const target = notificationLinkTarget(n.link);
                const body = (
                  <div className="flex gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[n.priority] ?? "bg-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{n.type}</Badge>
                      </div>
                      {n.message && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className={n.read ? "opacity-60" : ""}>
                    {target ? <Link to={target as never}>{body}</Link> : body}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t px-4 py-2.5 text-center">
          <Link to="/notificacoes" className="text-xs text-gold hover:underline">Ver todas</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
