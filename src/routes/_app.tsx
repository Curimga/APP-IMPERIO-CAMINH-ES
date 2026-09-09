import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/components/dashboard/use-realtime-sync";
import { AppShell } from "@/components/mobile/app-shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    // Validação de sessão apenas no cliente (SSR ainda não tem localStorage).
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

function AppLayout() {
  const { loading, session, profile } = useAuth();
  const nav = useNavigate();

  // Sincronização em tempo real — o mesmo hub do CRM, com invalidação seletiva
  // por tabela (as chaves mobile estão registradas no TABLE_KEYS do próprio hub).
  useRealtimeSync();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav({ to: "/login" });
      return;
    }
    if (profile && profile.status !== "active") {
      nav({ to: "/aguardando-aprovacao" });
    }
  }, [loading, session, profile, nav]);

  if (loading || !profile || profile.status !== "active") {
    return (
      <div className="min-h-dvh grid place-items-center bg-[#0B0B0B]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-gold-foreground font-extrabold">
            IMP
          </div>
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
