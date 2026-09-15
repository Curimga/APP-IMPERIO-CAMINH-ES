import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, ShieldOff, UserRound } from "lucide-react";
import { useSoldTrucks } from "@/lib/mobile/queries";
import { MobileCard, SectionTitle, SkeletonRows, EmptyState } from "@/components/mobile/ui";
import { brl, dateBR } from "@/lib/format";
import { mdDiffDays, spaTodayISO } from "@/lib/mobile/dates";
import { truckTitle } from "@/lib/truck-title";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { isFinanceExecutive } from "@/lib/mobile/perm";

export const Route = createFileRoute("/_app/vendidos")({
  component: Vendidos,
});

function warrantyInfo(warrantyEnd: string | null) {
  if (!warrantyEnd) return { active: false, label: "Sem garantia cadastrada" };
  const days = mdDiffDays(warrantyEnd, spaTodayISO());
  if (days < 0) return { active: false, label: "Garantia encerrada há " + Math.abs(days) + " d" };
  if (days === 0) return { active: true, label: "Último dia de garantia!" };
  return { active: true, label: `Garantia: ${days} d restantes` };
}

function Vendidos() {
  const { roles } = useAuth();
  const isExec = isFinanceExecutive(roles);
  const { data, isLoading, isError } = useSoldTrucks();
  const trucks = data?.trucks ?? [];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Vendidos</h1>
      </div>
      <p className="text-[13px] text-muted-foreground">
        Caminhões vendidos e acompanhamento da garantia de 90 dias.
      </p>

      {isLoading ? (
        <SkeletonRows rows={5} height={64} />
      ) : isError ? (
        <EmptyState title="Erro ao carregar vendidos" hint="Verifique sua conexão." />
      ) : trucks.length === 0 ? (
        <EmptyState title="Nenhum caminhão vendido" hint="Os veículos vendidos aparecerão aqui." />
      ) : (
        <div className="space-y-2">
          <SectionTitle>
            {trucks.length} caminhão{trucks.length === 1 ? "" : "ões"} vendido
            {trucks.length === 1 ? "" : "s"}
          </SectionTitle>
          {trucks.map((t) => {
            const w = warrantyInfo(t.warranty_end);
            return (
              <MobileCard key={t.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold">{truckTitle(t)}</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {t.plate ?? ""} {t.year ?? ""}
                    </div>
                  </div>
                  {isExec && t.sold_price != null ? (
                    <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[12px] font-bold text-success">
                      {brl(t.sold_price)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                  <span>Venda {dateBR(t.sold_at)}</span>
                  {t.sold_customer_id ? (
                    <span className="flex items-center gap-1">
                      <UserRound className="h-3 w-3" /> {data?.customerName(t.sold_customer_id)}
                    </span>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold",
                    w.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {w.active ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <ShieldOff className="h-4 w-4" />
                  )}
                  {w.label}
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}
    </>
  );
}
