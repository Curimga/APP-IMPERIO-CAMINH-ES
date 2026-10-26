import { createFileRoute } from "@tanstack/react-router";
import {
  Truck,
  CalendarDays,
  Wrench,
  Users,
  DollarSign,
  Box,
  ShieldCheck,
  Bell,
  UserRound,
  Download,
  ListTodo,
  BrainCircuit,
  ReceiptText,
  FileCheck2,
} from "lucide-react";
import { canAccessTruckFlow, canApproveExpenses, MOBILE_MENU } from "@/lib/mobile/perm";
import { useAuth } from "@/hooks/use-auth";
import { MobileCard, ListRow } from "@/components/mobile/ui";
import { useNotifications } from "@/lib/mobile/queries";
import { useInstallPrompt } from "@/lib/mobile/install";
import { usePendencies } from "@/routes/_app/pendencias";
import { useTruckFlowAccess } from "@/lib/mobile/truck-flow";
import { useExpenseApprovalAccess, useExpenseApprovalRequests } from "@/lib/mobile/expense-approval";

export const Route = createFileRoute("/_app/menu")({
  component: Menu,
});

const ICONS: Record<string, React.ReactNode> = {
  truck: <Truck className="h-5 w-5" />,
  calendar: <CalendarDays className="h-5 w-5" />,
  wrench: <Wrench className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  dollar: <DollarSign className="h-5 w-5" />,
  box: <Box className="h-5 w-5" />,
  shield: <ShieldCheck className="h-5 w-5" />,
  assistant: <BrainCircuit className="h-5 w-5" />,
  receipt: <ReceiptText className="h-5 w-5" />,
  "file-check": <FileCheck2 className="h-5 w-5" />,
};

function Menu() {
  const { roles, user } = useAuth();
  const { data } = useNotifications();
  const pendencias = usePendencies();
  const install = useInstallPrompt();
  const { data: flowAccess } = useTruckFlowAccess();
  const { data: approvalAccess } = useExpenseApprovalAccess();
  const { data: approvalRequests = [] } = useExpenseApprovalRequests();
  const hasReturnedRequest = approvalRequests.some((request) => request.status === "returned");
  const items = [
    ...MOBILE_MENU.filter((m) => m.allowed(roles, user?.email, user?.id)),
    ...(canAccessTruckFlow(flowAccess?.access_level)
      ? [{ label: "Fluxo de caminhão", to: "/fluxo-caminhao", icon: "truck", description: "Etapas do caminhão" }]
      : []),
    ...(canApproveExpenses(approvalAccess) || hasReturnedRequest
      ? [{ label: "Confirmação de despesas", to: "/confirmacao-despesas", icon: "file-check", description: "Aprovar ou devolver lançamentos" }]
      : []),
  ];
  const unread = data?.unread ?? 0;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Menu</h1>
      </div>

      <MobileCard className="divide-y">
        <ListRow
          to="/pendencias"
          title="Pendências"
          subtitle={
            pendencias.total > 0
              ? `${pendencias.total} ${pendencias.total === 1 ? "pendência" : "pendências"} para atenção`
              : "Nenhuma pendência registrada"
          }
          icon={
            <span className="text-gold-dark">
              <ListTodo className="h-5 w-5" />
            </span>
          }
          right={
            pendencias.total > 0 ? (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive/15 px-1.5 text-xs font-bold tabular-nums text-destructive">
                {pendencias.total}
              </span>
            ) : undefined
          }
          unread={pendencias.total > 0}
        />
        {items.map((m) => (
          <ListRow
            key={m.to}
            to={m.to}
            title={m.label}
            subtitle={m.description}
            icon={<span className="text-gold">{ICONS[m.icon]}</span>}
          />
        ))}
        <ListRow
          to="/notificacoes"
          title="Notificações"
          subtitle={unread > 0 ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Todas lidas"}
          icon={
            <span className="text-gold">
              <Bell className="h-5 w-5" />
            </span>
          }
          unread={unread > 0}
        />
        <ListRow
          to="/perfil"
          title="Meu perfil"
          subtitle="Instalar app, conta e sair"
          icon={
            <span className="text-gold">
              <UserRound className="h-5 w-5" />
            </span>
          }
        />
      </MobileCard>

      {install.canInstall && (
        <button
          type="button"
          onClick={() => install.promptInstall()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-bold text-gold active:bg-muted/60"
        >
          <Download className="h-4 w-4" /> Instalar aplicativo
        </button>
      )}
      <p className="text-center text-[11px] text-muted-foreground">
        Versão 1.0.0 · Serviço: Império Caminhões
      </p>
    </>
  );
}
