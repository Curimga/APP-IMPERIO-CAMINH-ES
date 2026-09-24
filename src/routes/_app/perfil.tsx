import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Check, Mail, Phone, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { roleLabel } from "@/lib/mobile/perm";
import { MobileCard, SectionTitle, ListRow } from "@/components/mobile/ui";
import { useInstallPrompt, useSwUpdate } from "@/lib/mobile/install";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perfil")({
  component: Perfil,
});

const IOS_HINTS = [
  "Toque em Compartilhar (ícone do Safari)",
  "Role até 'Adicionar à Tela de Início'",
  "Confirme em 'Adicionar'",
];

function Perfil() {
  const { profile, roles, user, signOut } = useAuth();
  const nav = useNavigate();
  const install = useInstallPrompt();
  const sw = useSwUpdate();

  const initial = (profile?.full_name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  const logout = async () => {
    try {
      await signOut();
      nav({ to: "/login" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sair da conta. Tente novamente.");
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/menu"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Meu perfil</h1>
      </div>

      {/* Usuário */}
      <MobileCard className="flex items-center gap-3 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold text-lg font-extrabold text-gold-foreground">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-bold">{profile?.full_name ?? "Usuário"}</div>
          <div className="text-[13px] text-muted-foreground">{roleLabel(roles)}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
            {user?.email ? (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </span>
            ) : null}
            {profile?.phone ? (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {profile.phone}
              </span>
            ) : null}
          </div>
        </div>
      </MobileCard>

      {/* Instalação */}
      <MobileCard className="p-3">
        <SectionTitle>Instalação</SectionTitle>
        {install.isStandalone ? (
          <ListRow
            title="Aplicativo instalado"
            subtitle="Você está usando o app de forma independente."
            icon={
              <span className="text-success">
                <Check className="h-5 w-5" />
              </span>
            }
          />
        ) : install.canInstall ? (
          <ListRow
            title="Instalar aplicativo"
            subtitle="Adicionar à tela de início"
            icon={
              <span className="text-gold">
                <Download className="h-5 w-5" />
              </span>
            }
            onClick={() =>
              install.promptInstall().then((ok) => ok && toast.success("Aplicativo instalado"))
            }
          />
        ) : (
          <ListRow
            title="Instalar aplicativo"
            subtitle="Disponível pelo seu navegador"
            icon={
              <span className="text-gold">
                <Download className="h-5 w-5" />
              </span>
            }
          />
        )}
        {!install.isStandalone && !install.canInstall && (
          <ol className="mt-1 space-y-1 px-3 pb-1">
            {IOS_HINTS.map((h, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-muted-foreground">
                <span className="font-bold text-gold">{i + 1}.</span> {h}
              </li>
            ))}
          </ol>
        )}
      </MobileCard>

      {/* Atualização do app */}
      {sw.updateReady && (
        <MobileCard className="border-warning/40 p-3">
          <SectionTitle>Atualização</SectionTitle>
          <ListRow
            title="Nova versão disponível"
            subtitle="Reinicie para aplicar as novidades."
            icon={
              <span className="text-warning-foreground">
                <RefreshCw className="h-5 w-5" />
              </span>
            }
            onClick={() => sw.applyUpdate().then(() => toast.success("Atualizando..."))}
          />
        </MobileCard>
      )}

      {/* Sair */}
      <div className="pb-2">
        <button
          type="button"
          onClick={logout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 text-sm font-bold text-destructive active:opacity-80"
        >
          <LogOut className="h-4 w-4" /> Sair da conta
        </button>
      </div>
    </>
  );
}
