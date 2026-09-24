import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, Phone, Mail, MapPin, Pencil } from "lucide-react";
import { useCustomers } from "@/lib/mobile/queries";
import type { CustomerItem } from "@/lib/mobile/queries";
import { updateCustomer } from "@/lib/mobile/actions";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";
import { MobileCard, SkeletonRows, EmptyState, inputClass, Field } from "@/components/mobile/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/clientes")({
  validateSearch: (s: Record<string, unknown>) => {
    const r: { q?: string } = {};
    if (typeof s.q === "string") r.q = s.q;
    return r;
  },
  component: ClientesRoute,
});

function ClientesRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return pathname === "/clientes/novo" ? <Outlet /> : <Clientes />;
}

function ClientItem({ c }: { c: CustomerItem }) {
  const initial = (c.name ?? "?").trim()[0]?.toUpperCase() ?? "?";
  const hasDetails = Boolean(c.phone || c.city || c.email);
  return (
    <div className="flex w-full items-start gap-3 px-3.5 py-3.5 sm:px-4 sm:py-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[15px] font-bold text-gold sm:h-12 sm:w-12 sm:text-base">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold leading-5 sm:text-base">{c.name}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {c.status ? (
              <span
                className={cn(
                  "max-w-24 truncate rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize leading-4 sm:max-w-32 sm:text-[11px]",
                  c.status === "ativo"
                    ? "border-success/30 bg-success/15 text-success"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {c.status.replace("_", " ")}
              </span>
            ) : null}
            <Pencil className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>
        {hasDetails ? (
          <div className="mt-1.5 grid min-w-0 grid-cols-1 gap-1 text-[11px] leading-4 text-muted-foreground sm:grid-cols-2 sm:text-xs">
            {c.phone ? (
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.phone}</span>
              </span>
            ) : null}
            {c.city ? (
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.city}</span>
              </span>
            ) : null}
            {c.email ? (
              <span className="flex min-w-0 items-center gap-1.5 truncate sm:col-span-2">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.email}</span>
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mt-1.5 text-[11px] text-muted-foreground sm:text-xs">Sem contato cadastrado</div>
        )}
      </div>
    </div>
  );
}

const CUSTOMER_STATUS_OPTIONS = [
  "interessado",
  "negociando",
  "ativo",
  "recorrente",
  "pos_venda",
  "garantia",
  "repasse",
] as const;

function CustomerSheet({ c, onClose }: { c: CustomerItem; onClose: () => void }) {
  const invalidateMobile = useInvalidateMobile();
  const [name, setName] = useState(c.name ?? "");
  const [phone, setPhone] = useState(c.phone ?? "");
  const [email, setEmail] = useState(c.email ?? "");
  const [city, setCity] = useState(c.city ?? "");
  const [status, setStatus] = useState(
    CUSTOMER_STATUS_OPTIONS.includes((c.status ?? "") as (typeof CUSTOMER_STATUS_OPTIONS)[number])
      ? (c.status as (typeof CUSTOMER_STATUS_OPTIONS)[number])
      : "ativo",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Informe o nome do cliente.");
    setSaving(true);
    try {
      await updateCustomer(c.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        status: status as (typeof CUSTOMER_STATUS_OPTIONS)[number],
      });
      invalidateMobile(["customers"]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="px-5 pb-2 pt-4 text-left">
          <SheetTitle className="text-base">Editar cliente</SheetTitle>
          <SheetDescription>Atualize os dados cadastrais.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-3 px-5">
          <Field label="Nome *">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
            </Field>
            <Field label="Cidade">
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
          </div>
          <Field label="E-mail">
            <input
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
            />
          </Field>
          <Field label="Situação">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof CUSTOMER_STATUS_OPTIONS)[number])}
            >
              {CUSTOMER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          {error ? (
            <div
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-bold text-gold-foreground active:opacity-80 disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Clientes() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [active, setActive] = useState<CustomerItem | null>(null);
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
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center text-left pressable active:scale-[0.99]"
              onClick={() => setActive(c)}
            >
              <ClientItem c={c} />
            </button>
          ))}
        </MobileCard>
      )}

      {active ? <CustomerSheet c={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
