import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Download, Check, Mail, Phone, LogOut, RefreshCw, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { roleLabel } from "@/lib/mobile/perm";
import { MobileCard, SectionTitle, ListRow } from "@/components/mobile/ui";
import { PushNotificationSettings } from "@/components/mobile/push-settings";
import { useInstallPrompt, useSwUpdate } from "@/lib/mobile/install";
import { supabase } from "@/integrations/supabase/client";
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const initial = (profile?.full_name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  const logout = async () => {
    await signOut();
    nav({ to: "/login" });
  };

  const changePassword = async () => {
    const password = newPassword.trim();
    if (password.length < 6) {
      toast.error("Use uma senha com pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword.trim()) {
      toast.error("As senhas digitadas não conferem.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setSavingPassword(false);
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

      {/* Senha */}
      <MobileCard className="p-3">
        <SectionTitle>Senha de acesso</SectionTitle>
        <div className="space-y-3 px-1 pb-1">
          <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-gold-foreground">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-bold">Alterar senha</div>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                Digite a nova senha duas vezes. Não precisa informar a senha atual.
              </p>
            </div>
          </div>

          <label className="grid gap-1.5 text-sm font-bold">
            Nova senha
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha"
              className="h-12 rounded-xl border bg-background px-3 text-base outline-none focus:border-gold"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold">
            Confirmar nova senha
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite novamente"
              className="h-12 rounded-xl border bg-background px-3 text-base outline-none focus:border-gold"
            />
          </label>

          <button
            type="button"
            onClick={changePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-extrabold text-gold-foreground active:opacity-80 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" /> {savingPassword ? "Alterando..." : "Alterar senha"}
          </button>
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

      {/* Notificações no celular */}
      <PushNotificationSettings />

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
