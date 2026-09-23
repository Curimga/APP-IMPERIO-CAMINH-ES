import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Package, TriangleAlert, Plus, MapPin, Minus, Trash2 } from "lucide-react";
import { useInventory } from "@/lib/mobile/queries";
import type { InventoryItem } from "@/lib/mobile/queries";
import { adjustInventoryQuantity, deleteInventoryItem } from "@/lib/mobile/actions";
import { useInvalidateMobile } from "@/lib/mobile/invalidate";
import { MobileCard, SectionTitle, SkeletonRows, EmptyState } from "@/components/mobile/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

function ItemSheet({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const invalidateMobile = useInvalidateMobile();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qty, setQty] = useState(() => Number(item.quantity ?? 0));

  const run = async (fn: () => Promise<number | void>) => {
    setBusy(true);
    try {
      const next = await fn();
      if (typeof next === "number") setQty(next);
      invalidateMobile(["inventory_items"]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na operação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0 pb-8">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="px-5 pb-2 pt-4 text-left">
          <SheetTitle className="text-base">{item.name}</SheetTitle>
          <SheetDescription>Entrada, saída e remoção do estoque.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-5">
          <div className="grid grid-cols-3 items-center gap-2 text-center">
            <div className="rounded-xl bg-muted p-3">
              <div className="text-[11px] text-muted-foreground">Quantidade</div>
              <div className="text-xl font-bold tabular-nums">
                {qty} {item.unit ?? "un"}
              </div>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <div className="text-[11px] text-muted-foreground">Mínimo</div>
              <div className="text-xl font-bold tabular-nums">{item.min_quantity ?? 0}</div>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <div className="text-[11px] text-muted-foreground">Unitário</div>
              <div className="text-xl font-bold tabular-nums">{brl(item.unit_price ?? 0)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => adjustInventoryQuantity(item.id, -1))}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-bold active:bg-muted/60 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" /> Saída de 1
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => adjustInventoryQuantity(item.id, 1))}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gold text-sm font-bold text-gold-foreground active:opacity-80 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Entrada de 1
            </button>
          </div>

          <div className="border-t pt-4">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Remover <strong>{item.name}</strong> do estoque?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                    className="h-11 rounded-xl border bg-background text-sm font-bold active:bg-muted/60 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await deleteInventoryItem(item.id);
                        onClose();
                      })
                    }
                    className="h-11 rounded-xl bg-destructive text-sm font-bold text-white active:opacity-80 disabled:opacity-50"
                  >
                    {busy ? "Removendo..." : "Remover item"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-sm font-bold text-destructive active:opacity-80 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Remover item
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Estoque() {
  const { data, isLoading, isError } = useInventory();
  const [active, setActive] = useState<InventoryItem | null>(null);
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
                  <button
                    key={i.id}
                    type="button"
                    className="flex w-full items-center text-left pressable active:scale-[0.99]"
                    onClick={() => setActive(i)}
                  >
                    <ItemRow item={i} />
                  </button>
                ))}
              </MobileCard>
            </>
          )}
          <SectionTitle>Itens em estoque ({normal.length})</SectionTitle>
          <MobileCard className="divide-y">
            {normal.map((i) => (
              <button
                key={i.id}
                type="button"
                className="flex w-full items-center text-left pressable active:scale-[0.99]"
                onClick={() => setActive(i)}
              >
                <ItemRow item={i} />
              </button>
            ))}
          </MobileCard>
        </div>
      )}

      {active ? <ItemSheet item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
