import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/mobile/haptic";

/**
 * "Puxar para atualizar" — dispara `onRefresh` quando o usuário puxa o topo
 * da página (o app usa rolagem do body, então escutamos como document-level).
 * Não conflita com a rolagem normal: só ativa quando `window.scrollY === 0`.
 */
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<void> | void }) {
  const [state, setState] = useState<"idle" | "pull" | "ready" | "refreshing">("idle");
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const animating = useRef(false);

  useEffect(() => {
    const MAX = 76;
    const onTouchStart = (e: TouchEvent) => {
      if (animating.current || state === "refreshing") return;
      if (window.scrollY > 0) return;
      const touch = e.touches[0];
      if (!touch) return;
      /* não capturar quando o toque começa em controles interativos */
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("button, a, input, select, textarea, [data-no-pull]")) return;
      startY.current = touch.clientY;
      setState("pull");
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null || animating.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const delta = touch.clientY - startY.current;
      if (delta <= 4) {
        if (pull > 0) setPull(0);
        return;
      }
      setPull(Math.min(delta, MAX + 24));
    };
    const onTouchEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pull >= MAX) {
        setState("refreshing");
        setPull(0);
        animating.current = true;
        haptic(12);
        try {
          const result = onRefresh();
          if (result && typeof (result as Promise<void>).then === "function") {
            (result as Promise<void>).finally(() => {
              animating.current = false;
              setState("idle");
            });
          } else {
            animating.current = false;
            setState("idle");
          }
        } catch {
          animating.current = false;
          setState("idle");
        }
      } else {
        setPull(0);
        setState("idle");
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pull, state]);

  const refreshing = state === "refreshing";
  const active = pull > 0;

  return (
    <div
      aria-hidden={!active && !refreshing}
      className={cn(
        "pointer-events-none fixed left-0 right-0 z-30 flex justify-center transition-transform duration-200",
        active || refreshing ? "translate-y-0 opacity-100" : "-translate-y-14 opacity-0",
      )}
      style={{ top: "env(safe-area-inset-top)", height: 56 }}
    >
      <div
        className="mt-2 flex h-10 w-10 items-center justify-center rounded-2xl border bg-card shadow-sm"
        style={{ transform: `rotate(${refreshing ? 0 : Math.min(pull / 76, 1) * 180}deg)` }}
      >
        <RefreshCw className={cn("h-5 w-5 text-gold-dark", refreshing && "animate-spin")} />
      </div>
    </div>
  );
}

/** Wrapper simples que expõe o indicador de atualização invisível. */
export function RefreshSurface({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}) {
  return (
    <>
      <PullToRefresh onRefresh={onRefresh} />
      {children}
    </>
  );
}