import { Bell, BellOff, BellRing } from "lucide-react";
import { MobileCard, SectionTitle, ListRow } from "@/components/mobile/ui";
import { usePushNotifications } from "@/hooks/use-push-notifications";

function subtitleFor(state: {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  iosNeedsInstall: boolean;
}): string {
  if (!state.supported) return "Não suportado neste navegador.";
  if (state.iosNeedsInstall) return "No iPhone, instale o app na Tela de Início para ativar.";
  if (state.permission === "denied") return "Bloqueadas no navegador. Libere nas configurações do site.";
  if (state.subscribed) return "Ativas neste aparelho.";
  if (!state.configured) {
    return "A ativação depende da configuração do servidor (VAPID).";
  }
  if (state.permission === "granted") {
    return "Permissão concedida. Toque para ativar neste aparelho.";
  }
  return "Toque para permitir notificações neste aparelho.";
}

export function PushNotificationSettings() {
  const push = usePushNotifications();
  const { supported, permission, subscribed, busy, configured } = push;

  const isOn = subscribed;
  const canToggle =
    supported &&
    !push.iosNeedsInstall &&
    permission !== "denied" &&
    configured &&
    !busy;

  const icon = isOn ? (
    <span className="text-success">
      <BellRing className="h-5 w-5" />
    </span>
  ) : (
    <span className="text-gold">
      {supported ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
    </span>
  );

  let title = "Ativar notificações";
  if (isOn) title = "Notificações ativas";
  else if (!supported) title = "Notificações no celular";
  else if (push.iosNeedsInstall) title = "Notificações no celular";
  else if (permission === "denied") title = "Notificações no celular";
  else if (!configured) title = "Notificações no celular";

  const right = canToggle ? (
    <span className="text-[12px] font-bold text-gold">{busy ? "Aguarde" : isOn ? "Desativar" : "Ativar"}</span>
  ) : undefined;

  const onClick =
    canToggle && !busy ? () => (isOn ? push.disable() : push.enable()) : undefined;

  return (
    <MobileCard className="p-3">
      <SectionTitle>Notificações no celular</SectionTitle>
      <ListRow
        title={title}
        subtitle={subtitleFor(push)}
        icon={icon}
        right={right}
        onClick={onClick}
      />
    </MobileCard>
  );
}
