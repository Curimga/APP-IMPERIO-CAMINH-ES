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
  if (state.subscribed) return "Ativas neste aparelho (funciona com o app fechado).";
  if (state.permission === "granted") {
    return state.configured
      ? "Permissão concedida. Toque para ativar a entrega em segundo plano."
      : "Avisos com o app aberto. Entrega em segundo plano aguarda configuração do servidor.";
  }
  return "Toque para permitir notificações neste aparelho.";
}

export function PushNotificationSettings() {
  const push = usePushNotifications();
  const { supported, permission, subscribed, busy } = push;

  const canToggle = supported && permission !== "denied" && !push.iosNeedsInstall;
  const isOn = subscribed;

  const icon = isOn ? (
    <span className="text-success">
      <BellRing className="h-5 w-5" />
    </span>
  ) : (
    <span className="text-gold">
      {supported ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
    </span>
  );

  return (
    <MobileCard className="p-3">
      <SectionTitle>Notificações</SectionTitle>
      <ListRow
        title={isOn ? "Notificações ativas" : "Ativar notificações"}
        subtitle={subtitleFor(push)}
        icon={icon}
        right={canToggle ? <span className="text-[12px] font-bold text-gold">{busy ? "Aguarde" : isOn ? "Desativar" : "Ativar"}</span> : undefined}
        onClick={canToggle && !busy ? () => (isOn ? push.disable() : push.enable()) : undefined}
      />
    </MobileCard>
  );
}
