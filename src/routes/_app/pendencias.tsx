import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, ShieldCheck, Coins, Bell, ArrowRight } from "lucide-react";
import { useServices, useSoldTrucks, useTodaysEvents, useNotifications } from "@/lib/mobile/queries";
import { SkeletonRows, MobileCard, EmptyState, PageHeader, SectionTitle } from "@/components/mobile/ui";
import { mdDaysUntil, mdRelative, mdTime } from "@/lib/mobile/dates";
import { truckTitle } from "@/lib/truck-title";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { isFinanceExecutive } from "@/lib/mobile/perm";

export const Route = createFileRoute("/_app/pendencias")({
  component: Pendencias,
});

export function usePendencies() {
  const { roles } = useAuth();
  const services = useServices();
  const sold = useSoldTrucks();
  const events = useTodaysEvents();
  const notif = useNotifications();

  const atrasados = (services.data ?? []).filter(
    (s) => s.status === "em_andamento" && s.expected_at && mdRelative(s.expected_at).startsWith("atrasado"),
  );
  const garantias = (sold.data?.trucks ?? []).filter((t) => {
    const d = mdDaysUntil(t.warranty_end);
    return t.warranty_end && d >= 0 && d <= 30;
  });
  // "Vencimentos de hoje" revela compromissos financeiros — apenas Executivo.
  const monetarios = isFinanceExecutive(roles)
    ? (events.data ?? []).filter((e) => e.type === "pagamento" || e.type === "vencimento")
    : [];
  const criticas = (notif.data?.items ?? []).filter(
    (n) => !n.read && (n.priority === "critica" || n.priority === "alta"),
  );

  const loading =
    services.isLoading || sold.isLoading || events.isLoading || notif.isLoading;
  const total = atrasados.length + garantias.length + monetarios.length + criticas.length;

  return { atrasados, garantias, monetarios, criticas, total, loading };
}

function Pendencias() {
  const p = usePendencies();

  if (p.loading) return <SkeletonRows rows={5} height={64} />;

  const rows = [
    {
      icon: <Wrench className="h-4 w-4" />,
      chip: "bg-destructive/15 text-destructive border-destructive/40",
      label: "Serviços atrasados",
      to: "/servicos",
      search: { tab: "atrasados" as const },
      count: p.atrasados.length,
      items: p.atrasados.slice(0, 3).map((s) => ({
        title: s.title,
        subtitle: s.truck ? truckTitle(s.truck) : "Sem caminhão",
      })),
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      chip: "bg-warning/15 text-warning-foreground border-warning/40",
      label: "Garantias a vencer",
      to: "/vendidos",
      search: undefined,
      count: p.garantias.length,
      items: p.garantias.slice(0, 3).map((t) => ({
        title: `${t.brand} ${t.model}`,
        subtitle: `vence ${mdRelative(t.warranty_end)}`,
      })),
    },
    {
      icon: <Coins className="h-4 w-4" />,
      chip: "bg-gold/15 text-gold-dark border-gold/40",
      label: "Vencimentos de hoje",
      to: "/agenda",
      search: { view: "pagamentos" as const },
      count: p.monetarios.length,
      items: p.monetarios.slice(0, 3).map((e) => ({
        title: e.title,
        subtitle: e.all_day ? "dia inteiro" : mdTime(e.starts_at),
      })),
    },
    {
      icon: <Bell className="h-4 w-4" />,
      chip: "bg-info/15 text-info border-info/40",
      label: "Alertas importantes",
      to: "/notificacoes",
      search: undefined,
      count: p.criticas.length,
      items: p.criticas.slice(0, 3).map((n) => ({ title: n.title, subtitle: "não lida" })),
    },
  ];

  return (
    <>
      <PageHeader title="Pendências" subtitle={`${p.total} ${p.total === 1 ? "pendência" : "pendências"} para atenção`} />
      <div className="space-y-3">
        {rows
          .filter((r) => r.count > 0)
          .map((r) => (
            <section key={r.label}>
              <SectionTitle>
                {r.label}
                <span className="text-muted-foreground">· {r.count}</span>
              </SectionTitle>
              <Link to={r.to as never} search={r.search as never}>
                <MobileCard className="divide-y divide-border/60">
                  {r.items.map((it) => (
                    <div key={it.title} className="flex items-center gap-3 px-3 py-2.5">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", r.chip)}>
                        {r.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{it.title}</div>
                        <div className="text-[12px] text-muted-foreground">{it.subtitle}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  ))}
                </MobileCard>
              </Link>
            </section>
          ))}
        {p.total === 0 && (
          <EmptyState title="Nenhuma pendência" hint="Tudo em dia por aqui. Bom trabalho!" />
        )}
      </div>
    </>
  );
}
