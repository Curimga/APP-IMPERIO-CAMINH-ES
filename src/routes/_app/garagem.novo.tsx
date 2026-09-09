import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard } from "@/components/mobile/ui";
import { createTruck } from "@/lib/mobile/actions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/garagem/novo")({
  component: NewTruck,
});

type Form = {
  brand: string;
  model: string;
  year: string;
  plate: string;
  color: string;
  chassis: string;
  mileage: string;
  fuel: string;
  transmission: string;
  purchase_price: string;
  expected_price: string;
  description: string;
};

const EMPTY: Form = {
  brand: "",
  model: "",
  year: "",
  plate: "",
  color: "",
  chassis: "",
  mileage: "",
  fuel: "",
  transmission: "",
  purchase_price: "",
  expected_price: "",
  description: "",
};

const toNumber = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function NewTruck() {
  const nav = useNavigate();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!form.brand.trim() || !form.model.trim()) {
      setError("Informe ao menos a marca e o modelo.");
      return;
    }
    setSaving(true);
    try {
      const id = await createTruck({
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year ? toNumber(form.year) : null,
        plate: form.plate.trim().toUpperCase() || null,
        color: form.color.trim() || null,
        chassis: form.chassis.trim() || null,
        mileage: form.mileage ? toNumber(form.mileage) : null,
        fuel: form.fuel.trim() || null,
        transmission: form.transmission.trim() || null,
        purchase_price: form.purchase_price ? toNumber(form.purchase_price) : null,
        expected_price: form.expected_price ? toNumber(form.expected_price) : null,
        description: form.description.trim() || null,
        status: "disponivel",
      });
      toast.success("Caminhão cadastrado");
      nav({ to: "/garagem/$truckId", params: { truckId: id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/garagem"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Cadastrar caminhão</h1>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <MobileCard className="space-y-3 p-4">
          <Field label="Marca *">
            <input
              className={inputClass}
              value={form.brand}
              onChange={set("brand")}
              placeholder="Ex.: Volvo"
              autoComplete="off"
            />
          </Field>
          <Field label="Modelo *">
            <input
              className={inputClass}
              value={form.model}
              onChange={set("model")}
              placeholder="Ex.: FH 540"
              autoComplete="off"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ano">
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.year}
                onChange={set("year")}
                placeholder="2023"
              />
            </Field>
            <Field label="Placa">
              <input
                className={inputClass}
                value={form.plate}
                onChange={set("plate")}
                placeholder="AAA-1A23"
                autoCapitalize="characters"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cor">
              <input
                className={inputClass}
                value={form.color}
                onChange={set("color")}
                placeholder="Branca"
              />
            </Field>
            <Field label="Quilometragem">
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.mileage}
                onChange={set("mileage")}
                placeholder="200000"
              />
            </Field>
          </div>
          <Field label="Chassi">
            <input
              className={inputClass}
              value={form.chassis}
              onChange={set("chassis")}
              autoComplete="off"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Combustível">
              <input
                className={inputClass}
                value={form.fuel}
                onChange={set("fuel")}
                placeholder="Diesel"
              />
            </Field>
            <Field label="Câmbio / Transmissão">
              <input
                className={inputClass}
                value={form.transmission}
                onChange={set("transmission")}
                placeholder="Automático"
              />
            </Field>
          </div>
        </MobileCard>

        <MobileCard className="space-y-3 p-4">
          <Field label="Preço de compra (R$)" hint="Adicione como número, ex.: 450000">
            <input
              className={inputClass}
              inputMode="decimal"
              value={form.purchase_price}
              onChange={set("purchase_price")}
              placeholder="450000"
            />
          </Field>
          <Field label="Preço de venda estimado (R$)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={form.expected_price}
              onChange={set("expected_price")}
              placeholder="520000"
            />
          </Field>
        </MobileCard>

        <MobileCard className="space-y-3 p-4">
          <Field
            label="Descrição Site Império"
            hint="Texto público que aparece no site (apenas marca, modelo, ano e esta descrição)."
          >
            <textarea
              className={inputClass + " min-h-28 resize-y py-2"}
              value={form.description}
              onChange={set("description")}
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
          {saving ? "Salvando..." : "Salvar caminhão"}
        </button>
        <Link to="/garagem" className={btnGhost + " flex items-center justify-center"}>
          Cancelar
        </Link>
      </form>
    </>
  );
}
