import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, Phone, Mail, MapPin } from "lucide-react";
import { useCustomers } from "@/lib/mobile/queries";
import type { CustomerItem } from "@/lib/mobile/queries";
import { MobileCard, SkeletonRows, EmptyState, inputClass } from "@/components/mobile/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/clientes")({
  component: Clientes,
});

function ClientItem({ c }: { c: CustomerItem }) {
  const initial = (c.name ?? "?").trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 font-bold text-gold">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{c.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
          {c.phone ? (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {c.phone}
            </span>
          ) : null}
          {c.city ? (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {c.city}
            </span>
          ) : null}
          {c.email ? (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3" />
              {c.email}
            </span>
          ) : null}
        </div>
      </div>
      {c.status ? (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize",
            c.status === "ativo"
              ? "border-success/30 bg-success/15 text-success"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {c.status}
        </span>
      ) : null}
    </div>
  );
}

function Clientes() {
  const [q, setQ] = useState("");
  const { data, isLoading, isError } = useCustomers(q);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Clientes</h1>
        <Link
          to="/clientes/novo"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-3 text-sm font-bold text-gold-foreground active:opacity-80"
        >
          <Plus className="h-4 w-4" /> Novo
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, telefone, cidade..."
          aria-label="Buscar cliente"
          className={cn(inputClass, "pl-9")}
        />
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} height={64} />
      ) : isError ? (
        <EmptyState title="Erro ao carregar clientes" hint="Verifique sua conexão." />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          hint="Ajuste a busca ou cadastre um novo cliente."
        />
      ) : (
        <MobileCard className="divide-y">
          {(data ?? []).map((c) => (
            <ClientItem key={c.id} c={c} />
          ))}
        </MobileCard>
      )}
    </>
  );
}
