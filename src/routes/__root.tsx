import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { useEffect } from "react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!window.isSecureContext && !isLocalhost) return () => {};

  let registration: ServiceWorkerRegistration | null = null;
  let refreshing = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  let lastUpdateCheck = 0;

  const checkForUpdate = () => {
    const currentRegistration = registration;
    if (!currentRegistration || document.visibilityState !== "visible") return;
    if (Date.now() - lastUpdateCheck < 60_000) return;
    lastUpdateCheck = Date.now();
    void currentRegistration.update().catch(() => undefined);
  };
  const onControllerChange = () => {
    // First installation already controls the current shell; reload only on later updates.
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  window.addEventListener("online", checkForUpdate);
  document.addEventListener("visibilitychange", checkForUpdate);

  void navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .then((activeRegistration) => {
      registration = activeRegistration;
      checkForUpdate();
    })
    .catch(() => {
      /* O app continua funcionando sem Service Worker. */
    });

  return () => {
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    window.removeEventListener("online", checkForUpdate);
    document.removeEventListener("visibilitychange", checkForUpdate);
  };
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const unregisterServiceWorker = registerServiceWorker();

    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const message = "message" in event ? event.message : "";
      const isChunkError =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed") ||
        message.includes("chunk") ||
        (event instanceof PromiseRejectionEvent &&
          String(event.reason).includes("Failed to fetch dynamically imported module"));

      if (isChunkError) {
        console.warn("Chunk loading error detected. Reloading application to sync assets...", event);
        window.location.reload();
      }
    };

    window.addEventListener("error", handleChunkError, true);
    window.addEventListener("unhandledrejection", handleChunkError);

    return () => {
      unregisterServiceWorker();
      window.removeEventListener("error", handleChunkError, true);
      window.removeEventListener("unhandledrejection", handleChunkError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}