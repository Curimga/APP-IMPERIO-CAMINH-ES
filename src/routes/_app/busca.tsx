import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { KeyboardEvent } from "react";
import { Search, Truck, User, Wrench } from "lucide-react";
import { useGlobalSearch } from "@/lib/mobile/queries";
import { ListRow, EmptyState, SkeletonRows, MobileCard, PageHeader } from "@/components/mobile/ui";
import { StatusBadge } from "@/components/mobile/ui";
import { useDebouncedValue } from "@/lib/mobile/debounce";

export const Route = createFileRoute("/_app/busca")({
  component: BuscaPage,
});

function BuscaPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 250);
  const { data, isLoading, isFetching } = useGlobalSearch(debounced);
  const typing = q.trim().length < 2;

  const results = data ?? null;

  const total = useMemo(
    () => (results ? results.trucks.length + results.customers.length + results.services.length : 0),
    [results],
  );

  return (
    <div className="space-y-3">
      <PageHeader title="Buscar" subtitle="Caminhões, clientes e serviços" />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Digite para pesquisar..."
          className="h-12 w-full rounded-xl border bg-card pl-11 pr-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-gold/70 placeholder:text-muted-foreground"
          inputMode="search"
          enterKeyHint="search"
        />
      </div>

      {typing ? (
        <p className="px-1 text-[13px] text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar em toda a base.
        </p>
      ) : isLoading || isFetching ? (
        <SkeletonRows rows={4} height={60} />
      ) : !results ? (
        <EmptyState title="Nada encontrado" hint="Tente outro nome, placa, modelo ou cidade." />
      ) : (
        <div className="space-y-4">
          {total === 0 && (
            <EmptyState title="Nada encontrado" hint="Tente outro nome, placa, modelo ou cidade." />
          )}

          {results.trucks.length > 0 && (
            <section className="space-y-1">
              <h2 className="px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Caminhões ({results.trucks.length})
              </h2>
              <MobileCard className="divide-y divide-border">
                {results.trucks.map((t) => {
                  const openTruck = () => navigate({ to: "/garagem/$truckId", params: { truckId: t.id } });
                  return (
                    <div
                      key={t.id}
                      role="link"
                      tabIndex={0}
                      onClick={openTruck}
                      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openTruck();
                        }
                      }}
                      className="cursor-pointer tap-gold active:bg-muted/50"
                      aria-label={`Abrir ficha de ${t.brand} ${t.model} ${t.plate ?? ""}`.trim()}
                    >
                      <ListRow
                        icon={<Truck className="h-5 w-5 text-gold-dark" />}
                        title={`${t.brand} ${t.model}`}
                        subtitle={t.plate ?? "Sem placa"}
                        right={<StatusBadge status={t.status} />}
                      />
                    </div>
                  );
                })}
              </MobileCard>
            </section>
          )}

          {results.customers.length > 0 && (
            <section className="space-y-1">
              <h2 className="px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Clientes ({results.customers.length})
              </h2>
              <MobileCard className="divide-y divide-border">
                {results.customers.map((c) => (
                  <ListRow
                    key={c.id}
                    to={`/clientes`}
                    icon={<User className="h-5 w-5 text-gold-dark" />}
                    title={c.name}
                    subtitle={[c.city, c.phone].filter(Boolean).join(" · ")}
                  />
                ))}
              </MobileCard>
            </section>
          )}

          {results.services.length > 0 && (
            <section className="space-y-1">
              <h2 className="px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Serviços ({results.services.length})
              </h2>
              <MobileCard className="divide-y divide-border">
                {results.services.map((s) => (
                  <ListRow
                    key={s.id}
                    to={`/servicos`}
                    icon={<Wrench className="h-5 w-5 text-gold-dark" />}
                    title={s.title}
                    subtitle={
                      s.truck ? `${s.truck.brand} ${s.truck.model}` : "Sem caminhão vinculado"
                    }
                    right={<StatusBadge status={s.status} />}
                  />
                ))}
              </MobileCard>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
