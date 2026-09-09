import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard } from "@/components/mobile/ui";
import { createInventoryItem } from "@/lib/mobile/actions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/estoque/novo")({
  component: NewInventoryItem,
});

type Form = {
  name: string;
  category: string;
  quantity: string;
  min_quantity: string;
  unit_price: string;
  unit: string;
  storage_location: string;
  supplier_name: string;
};
const EMPTY: Form = {
  name: "",
  category: "",
  quantity: "",
  min_quantity: "",
  unit_price: "",
  unit: "un",
  storage_location: "",
  supplier_name: "",
};

const toNumber = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function NewInventoryItem() {
  const nav = useNavigate();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome do item.");
    const qty = toNumber(form.quantity);
    if (qty == null || qty < 0) return setError("Informe uma quantidade válida.");
    setSaving(true);
    try {
      await createInventoryItem({
        name: form.name.trim(),
        category: form.category.trim() || null,
        quantity: qty,
        min_quantity: toNumber(form.min_quantity),
        unit_price: toNumber(form.unit_price),
        unit: form.unit.trim() || "un",
        storage_location: form.storage_location.trim() || null,
        supplier_name: form.supplier_name.trim() || null,
      });
      toast.success("Item adicionado");
      nav({ to: "/estoque" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao adicionar item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/estoque"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Adicionar item</h1>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <MobileCard className="space-y-3 p-4">
          <Field label="Nome do item *">
            <input
              className={inputClass}
              value={form.name}
              onChange={set("name")}
              placeholder="Ex.: pneu 295/80 R22.5"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <input
                className={inputClass}
                value={form.category}
                onChange={set("category")}
                placeholder="Ex.: pneus"
              />
            </Field>
            <Field label="Unidade">
              <input
                className={inputClass}
                value={form.unit}
                onChange={set("unit")}
                placeholder="un, L, kg"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade atual *">
              <input
                className={inputClass}
                inputMode="decimal"
                value={form.quantity}
                onChange={set("quantity")}
                placeholder="0"
              />
            </Field>
            <Field label="Quantidade mínima">
              <input
                className={inputClass}
                inputMode="decimal"
                value={form.min_quantity}
                onChange={set("min_quantity")}
                placeholder="0"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor unitário (R$)">
              <input
                className={inputClass}
                inputMode="decimal"
                value={form.unit_price}
                onChange={set("unit_price")}
                placeholder="0,00"
              />
            </Field>
            <Field label="Local">
              <input
                className={inputClass}
                value={form.storage_location}
                onChange={set("storage_location")}
                placeholder="Prateleira A1"
              />
            </Field>
          </div>
          <Field label="Fornecedor">
            <input
              className={inputClass}
              value={form.supplier_name}
              onChange={set("supplier_name")}
              placeholder="Fornecedor"
            />
          </Field>
        </MobileCard>

        {error && (
          <div
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={saving} className={btnGold}>
          {saving ? "Salvando..." : "Adicionar item"}
        </button>
        <Link to="/estoque" className={btnGhost + " flex items-center justify-center"}>
          Cancelar
        </Link>
      </form>
    </>
  );
}
