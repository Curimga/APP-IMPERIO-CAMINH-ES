import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { BrandWordmark } from "@/components/brand";
import { Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/aguardando-aprovacao")({
  component: PendingPage,
});

function PendingPage() {
  const nav = useNavigate();
  const { signOut, refresh, profile } = useAuth();
  const blocked = profile?.status === "blocked";
  return (
    <div className="min-h-screen grid place-items-center bg-sidebar text-sidebar-foreground p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center"><BrandWordmark /></div>
        <div
          className={`h-16 w-16 mx-auto rounded-full flex items-center justify-center ${blocked ? "bg-destructive/20" : "bg-gold/15"}`}
        >
          {blocked ? (
            <ShieldAlert className="h-8 w-8 text-destructive" />
          ) : (
            <Clock className="h-8 w-8 text-gold" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">
            {blocked ? "Acesso bloqueado" : "Cadastro em análise"}
          </h1>
          <p className="mt-2 text-sm text-sidebar-foreground/70">
            {blocked
              ? "Sua conta foi bloqueada pelo administrador. Entre em contato para reativar o acesso."
              : `Olá${profile?.full_name ? `, ${profile.full_name}` : ""}. Sua conta foi criada e está aguardando aprovação do administrador.`}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          {!blocked && (
            <Button
              onClick={async () => {
                await refresh();
              }}
              className="bg-gold text-gold-foreground hover:opacity-90"
            >
              Verificar novamente
            </Button>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await signOut();
                nav({ to: "/login" });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Falha ao sair. Tente novamente.");
              }
            }}
          >
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
