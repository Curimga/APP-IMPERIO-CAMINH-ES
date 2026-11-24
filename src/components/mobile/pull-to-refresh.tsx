import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/mobile/haptic";

type RefreshState = "idle" | "pull" | "ready" | "refreshing";

/**
 * Pull to refresh that only captures a deliberate vertical pull at the page top.
 * Horizontal gestures, form controls, and normal scrolling remain native.
 */
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<void> | void }) {
  const [state, setState] = useState<RefreshState>("idle");
  const [pull, setPull] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const pullRef = useRef(0);
  const stateRef = useRef<RefreshState>("idle");
  const refreshRef = useRef(onRefresh);
  const mountedRef = useRef(true);

  refreshRef.current = onRefresh;

  const setMode = useCallback((next: RefreshState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const threshold = 76;
    const resetGesture = () => {
      start.current = null;
      pullRef.current = 0;
      setPull(0);
      if (stateRef.current !== "refreshing") setMode("idle");
    };

    const onTouchStart = (event: TouchEvent) => {
      if (stateRef.current === "refreshing" || event.touches.length !== 1 || window.scrollY > 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("button, a, input, select, textarea, [role='button'], [data-no-pull]")) return;
      const touch = event.touches[0];
      if (touch) start.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchMove = (event: TouchEvent) => {
      const origin = start.current;
      const touch = event.touches[0];
      if (!origin || !touch || event.touches.length !== 1) return;

      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        resetGesture();
        return;
      }
      if (dy < -8) {
        resetGesture();
        return;
      }
      if (dy <= 8 || window.scrollY > 0) return;

      // Only cancel the browser's native pull-to-refresh after a downward
      // vertical gesture is clear; this keeps taps and horizontal back-swipes intact.
      event.preventDefault();
      const nextPull = Math.min(dy, threshold + 24);
      pullRef.current = nextPull;
      setPull(nextPull);
      setMode(nextPull >= threshold ? "ready" : "pull");
    };

    const onTouchEnd = () => {
      if (!start.current) return;
      start.current = null;
      if (pullRef.current >= threshold && stateRef.current !== "refreshing") {
        pullRef.current = 0;
        setPull(0);
        setMode("refreshing");
        haptic(12);
        void Promise.resolve()
          .then(() => refreshRef.current())
          .catch(() => undefined)
          .finally(() => {
            if (mountedRef.current) setMode("idle");
          });
        return;
      }
      pullRef.current = 0;
      setPull(0);
      setMode("idle");
    };

    const onTouchCancel = () => resetGesture();
    const passive = { passive: true } as const;
    window.addEventListener("touchstart", onTouchStart, passive);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, passive);
    window.addEventListener("touchcancel", onTouchCancel, passive);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [setMode]);

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
