import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/lib/mobile/queries";
import { canSeeFinanceNotifications } from "@/lib/mobile/perm";
import {
  buildPushPayload,
  disablePush,
  enablePush,
  getCurrentSubscription,
  getNotificationPermission,
  isPushConfigured,
  isPushSupported,
  loadSeenIds,
  needsIosInstallHint,
  pruneSeenIds,
  releaseSubscription,
  saveSeenIds,
  selectNewNotifications,
  syncSubscription,
} from "@/lib/mobile/push";

/**
 * Orquestra o Web Push no app autenticado.
 *
 *  - A entrega em segundo plano (app fechado) é feita pela Edge Function
 *    push-send via webhook — NÃO por polling nem por notificação local.
 *  - O aviso local abaixo é apenas um complemento com o app aberto quando o
 *    aparelho não possui subscription ativa.
 */

export interface PushNotificationsValue {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  iosNeedsInstall: boolean;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

const PushNotificationsContext = createContext<PushNotificationsValue | null>(null);

export function usePushEngine(): PushNotificationsValue {
  const { user, roles } = useAuth();
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);

  const refresh = useCallback(async (userId: string | null) => {
    setSupported(isPushSupported());
    setConfigured(isPushConfigured());
    setPermission(getNotificationPermission());
    setIosNeedsInstall(needsIosInstallHint());
    const sub = await getCurrentSubscription();
    setSubscribed(Boolean(sub));
    if (sub && userId) await syncSubscription(userId);
  }, []);

  useEffect(() => {
    if (!user) return;
    lastUserIdRef.current = user.id;
    refresh(user.id);
  }, [user?.id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        const userId = lastUserIdRef.current;
        if (userId) releaseSubscription(userId);
        lastUserIdRef.current = null;
        setSubscribed(false);
        setPermission(getNotificationPermission());
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const enable = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const result = await enablePush(user.id);
      if (result.ok) {
        toast.success(
          result.background
            ? "Notificações ativadas neste aparelho."
            : "Avisos ativados. A entrega com o app fechado ativa após a configuração do servidor.",
        );
      } else {
        toast.error(result.message);
      }
      await refresh(user.id);
    } finally {
      setBusy(false);
    }
  }, [user, refresh]);

  const disable = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      await disablePush(user.id);
      toast.success("Notificações desativadas neste aparelho.");
      await refresh(user.id);
    } finally {
      setBusy(false);
    }
  }, [user, refresh]);

  // Complemento (app aberto): espelha localmente as novas notificações quando
  // o aparelho não possui push ativo. Nunca é tratado como entrega em segundo plano.
  const includeFinance = canSeeFinanceNotifications(roles, user?.email, user?.id);
  const mirrorActive =
    supported && permission === "granted" && !subscribed && !iosNeedsInstall && Boolean(user);
  const { data } = useNotifications({ includeFinance });
  const seededRef = useRef(false);

  useEffect(() => {
    if (!mirrorActive || !data) return;
    const items = data.items ?? [];
    if (!seededRef.current) {
      saveSeenIds(pruneSeenIds([...loadSeenIds(), ...items.map((i) => i.id)]));
      seededRef.current = true;
      return;
    }
    const fresh = selectNewNotifications(items, loadSeenIds());
    if (!fresh.length) return;
    saveSeenIds(pruneSeenIds([...loadSeenIds(), ...fresh.map((i) => i.id)]));
    if (!document.hidden) return;
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) return;
      for (const item of fresh.slice(0, 5)) {
        const payload = buildPushPayload(item);
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: "/icons/crown-192.png",
          badge: "/icons/crown-96.png",
          tag: payload.tag,
          data: { link: payload.link ?? "/", notificationId: payload.notificationId },
        });
      }
    })();
  }, [mirrorActive, data]);

  return useMemo(
    () => ({ supported, configured, permission, subscribed, iosNeedsInstall, busy, enable, disable }),
    [supported, configured, permission, subscribed, iosNeedsInstall, busy, enable, disable],
  );
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const value = usePushEngine();
  return (
    <PushNotificationsContext.Provider value={value}>{children}</PushNotificationsContext.Provider>
  );
}

export function usePushNotifications(): PushNotificationsValue {
  const ctx = useContext(PushNotificationsContext);
  if (!ctx) throw new Error("usePushNotifications deve ser usado dentro de PushNotificationsProvider");
  return ctx;
}
