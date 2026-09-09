import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, TriangleAlert, Plus, MapPin } from "lucide-react";
import { useInventory } from "@/lib/mobile/queries";
import type { InventoryItem } from "@/lib/mobile/queries";
import { MobileCard, SectionTitle, SkeletonRows, EmptyState } from "@/components/mobile/ui";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/estoque")({
  component: Estoque,
});

function ItemRow({ item }: { item: InventoryItem }) {
  const qty = Number(item.quantity ?? 0);
  const min = Number(item.min_quantity ?? 0);
  const low = min > 0 && qty <= min;
  const totalValue = qty * Number(item.unit_price ?? 0);
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          low
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-gold/30 bg-gold/15 text-gold",
        )}
      >
        {low ? <TriangleAlert className="h-4 w-4" /> : <Package className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{item.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
          {item.category ? <span>{item.category}</span> : null}
          {item.storage_location ? (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {item.storage_location}
            </span>
          ) : null}
          {item.unit_price != null ? (
            <span className="font-semibold">{brl(item.unit_price)}</span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("text-[15px] font-bold tabular-nums", low ? "text-destructive" : "")}>
          {qty} {item.unit ?? "un"}
        </div>
        {low ? <div className="text-[11px] font-semibold text-destructive">mín. {min}</div> : null}
      </div>
      {totalValue > 0 ? (
        <div className="hidden w-20 shrink-0 text-right text-[12px] text-muted-foreground">
          {brl(totalValue)}
        </div>
      ) : null}
    </div>
  );
}

function Estoque() {
  const { data, isLoading, isError } = useInventory();
  const items = data ?? [];
  const low = items.filter(
    (i) =>
      Number(i.min_quantity ?? 0) > 0 && Number(i.quantity ?? 0) <= Number(i.min_quantity ?? 0),
  );
  const normal = items.filter(
    (i) =>
      !(Number(i.min_quantity ?? 0) > 0 && Number(i.quantity ?? 0) <= Number(i.min_quantity ?? 0)),
  );

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Estoque</h1>
        <Link
          to="/estoque/novo"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-3 text-sm font-bold text-gold-foreground active:opacity-80"
        >
          <Plus className="h-4 w-4" /> Item
        </Link>
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} height={64} />
      ) : isError ? (
        <EmptyState title="Erro ao carregar o estoque" hint="Verifique sua conexão." />
      ) : items.length === 0 ? (
        <EmptyState title="Estoque vazio" hint="Toque em 'Item' para adicionar um material." />
      ) : (
        <div className="space-y-2">
          {low.length > 0 && (
            <>
              <SectionTitle>Atenção — estoque baixo</SectionTitle>
              <MobileCard className="divide-y">
                {low.map((i) => (
                  <ItemRow key={i.id} item={i} />
                ))}
              </MobileCard>
            </>
          )}
          <SectionTitle>Itens em estoque ({normal.length})</SectionTitle>
          <MobileCard className="divide-y">
            {normal.map((i) => (
              <ItemRow key={i.id} item={i} />
            ))}
          </MobileCard>
        </div>
      )}
    </>
  );
}
