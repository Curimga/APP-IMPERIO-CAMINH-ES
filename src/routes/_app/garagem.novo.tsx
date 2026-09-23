import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard } from "@/components/mobile/ui";
import { createTruck } from "@/lib/mobile/actions";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { isFinanceExecutive } from "@/lib/mobile/perm";

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
  renavam: string;
  mileage: string;
  fuel: string;
  transmission: string;
  origin: string;
  supplier: string;
  consigned: boolean;
  purchase_date: string;
  purchase_price: string;
  purchase_payment_method: string;
  purchase_installments_count: string;
  purchase_total_paid: string;
  purchase_total_pending: string;
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
  renavam: "",
  mileage: "",
  fuel: "",
  transmission: "",
  origin: "",
  supplier: "",
  consigned: false,
  purchase_date: "",
  purchase_price: "",
  purchase_payment_method: "",
  purchase_installments_count: "",
  purchase_total_paid: "",
  purchase_total_pending: "",
  expected_price: "",
  description: "",
};

const PAYMENT_METHODS = ["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "OUTRO"] as const;

const toNumber = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function NewTruck() {
  const nav = useNavigate();
  const { roles } = useAuth();
  const isExec = isFinanceExecutive(roles);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setSel = (k: keyof Form) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggle = (k: keyof Form) => () => setForm((f) => ({ ...f, [k]: !f[k] }));

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
        renavam: form.renavam.trim() || null,
        mileage: form.mileage ? toNumber(form.mileage) : null,
        fuel: form.fuel.trim() || null,
        transmission: form.transmission.trim() || null,
        origin: form.origin.trim() || null,
        supplier: form.supplier.trim() || null,
        consigned: form.consigned,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? toNumber(form.purchase_price) : null,
        purchase_payment_method: form.purchase_payment_method || null,
        purchase_installments_count: form.purchase_installments_count
          ? toNumber(form.purchase_installments_count)
          : null,
        purchase_total_paid: form.purchase_total_paid ? toNumber(form.purchase_total_paid) : null,
        purchase_total_pending: form.purchase_total_pending
          ? toNumber(form.purchase_total_pending)
          : null,
        expected_price: form.expected_price ? toNumber(form.expected_price) : null,
        description: form.description.trim() || null,
        status: form.consigned ? "consignado" : "disponivel",
      });
      toast.success(form.consigned ? "Caminhão consignado cadastrado" : "Caminhão cadastrado");
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chassi">
              <input
                className={inputClass}
                value={form.chassis}
                onChange={set("chassis")}
                autoComplete="off"
              />
            </Field>
            <Field label="Renavam">
              <input
                className={inputClass}
                value={form.renavam}
                onChange={set("renavam")}
                placeholder="12345678901"
              />
            </Field>
          </div>
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
          <Field label="Origem">
            <input
              className={inputClass}
              value={form.origin}
              onChange={set("origin")}
              placeholder="Ex.: leilão, concessionária, particular"
            />
          </Field>
          <Field label="Fornecedor / Vendedor">
            <input
              className={inputClass}
              value={form.supplier}
              onChange={set("supplier")}
              placeholder="Ex.: Vendtruck"
            />
          </Field>
          <button
            type="button"
            onClick={toggle("consigned")}
            className={
              "flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left " +
              (form.consigned ? "border-gold bg-gold/10" : "bg-card")
            }
          >
            <div>
              <div className="text-[15px] font-semibold">Caminhão consignado</div>
              <div className="text-xs text-muted-foreground">
                Permanecerá na garagem do proprietário e terá o status "consignado".
              </div>
            </div>
            <span
              className={
                "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
                (form.consigned ? "bg-gold" : "bg-muted")
              }
            >
              <span
                className={
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " +
                  (form.consigned ? "left-[22px]" : "left-0.5")
                }
              />
            </span>
          </button>
          <Field label="Data de compra">
            <input
              className={inputClass}
              type="date"
              value={form.purchase_date}
              onChange={set("purchase_date")}
            />
          </Field>
        </MobileCard>

        {isExec && (
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
            <Field label="Forma de pagamento da compra">
              <select
                className={inputClass}
                value={form.purchase_payment_method}
                onChange={setSel("purchase_payment_method")}
              >
                <option value="">Selecionar</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nº de parcelas">
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.purchase_installments_count}
                onChange={set("purchase_installments_count")}
                placeholder="0"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total pago (R$)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.purchase_total_paid}
                  onChange={set("purchase_total_paid")}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Total a pagar (R$)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.purchase_total_pending}
                  onChange={set("purchase_total_pending")}
                  placeholder="0,00"
                />
              </Field>
            </div>
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
        )}

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