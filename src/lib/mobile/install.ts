import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

/** Detecção de modo standalone / iOS Safari para instruções de instalação. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as NavigatorWithStandalone).standalone === true;
    setIsStandalone(checkStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    const media = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setIsStandalone(media.matches);
    media.addEventListener("change", onChange);

    const lastDismissed = localStorage.getItem("imperio:install-dismissed");
    if (lastDismissed && Date.now() - Number(lastDismissed) < 7 * 86400000) setDismissed(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
      media.removeEventListener("change", onChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setDeferred(null);
    return choice.outcome === "accepted";
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem("imperio:install-dismissed", String(Date.now()));
  }, []);

  return {
    canInstall: !!deferred,
    isStandalone,
    dismissed,
    promptInstall,
    dismiss,
  };
}

/**
 * Feedback discreto "nova versão disponível". Como não usamos gerador automático de SW,
 * verificamos se o SW registrado mudou de versão com polling leve a cada 30min.
 */
export function useSwUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const check = async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (reg?.waiting) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", () => setUpdateReady(false));
    const interval = setInterval(check, 30 * 60 * 1000);
    check();
    return () => clearInterval(interval);
  }, []);

  const applyUpdate = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      setUpdateReady(false);
    }
  }, []);

  return { updateReady, applyUpdate };
}
