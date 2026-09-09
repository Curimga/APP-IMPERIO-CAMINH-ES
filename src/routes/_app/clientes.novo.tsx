import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Field, inputClass, btnGold, btnGhost, MobileCard } from "@/components/mobile/ui";
import { createCustomer } from "@/lib/mobile/actions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes/novo")({
  component: NewClient,
});

type Form = {
  name: string;
  phone: string;
  email: string;
  city: string;
  document: string;
  notes: string;
};
const EMPTY: Form = { name: "", phone: "", email: "", city: "", document: "", notes: "" };

function NewClient() {
  const nav = useNavigate();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome do cliente.");
    setSaving(true);
    try {
      await createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        city: form.city.trim() || null,
        document: form.document.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast.success("Cliente cadastrado");
      nav({ to: "/clientes" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao cadastrar cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/clientes"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background active:bg-muted/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Novo cliente</h1>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <MobileCard className="space-y-3 p-4">
          <Field label="Nome *">
            <input
              className={inputClass}
              value={form.name}
              onChange={set("name")}
              placeholder="Nome completo ou razão social"
            />
          </Field>
          <Field label="CPF/CNPJ">
            <input
              className={inputClass}
              value={form.document}
              onChange={set("document")}
              placeholder="Somente números"
              autoComplete="off"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone / WhatsApp">
              <input
                className={inputClass}
                value={form.phone}
                onChange={set("phone")}
                placeholder="(99) 99999-9999"
                inputMode="tel"
              />
            </Field>
            <Field label="Cidade">
              <input
                className={inputClass}
                value={form.city}
                onChange={set("city")}
                placeholder="Cidade"
              />
            </Field>
          </div>
          <Field label="E-mail">
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="cliente@email.com"
              autoComplete="off"
            />
          </Field>
          <Field label="Observações">
            <textarea
              className={inputClass + " min-h-20 resize-y py-2"}
              value={form.notes}
              onChange={set("notes")}
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
          {saving ? "Salvando..." : "Salvar cliente"}
        </button>
        <Link to="/clientes" className={btnGhost + " flex items-center justify-center"}>
          Cancelar
        </Link>
      </form>
    </>
  );
}
