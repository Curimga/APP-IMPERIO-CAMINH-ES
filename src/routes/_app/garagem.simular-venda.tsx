import { createFileRoute, Link } from "@tanstack/react-router";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Calculator, Lock, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileCard, SectionTitle, SkeletonRows, EmptyState, StatusBadge } from "@/components/mobile/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomers, useTruckDetail, useTrucks } from "@/lib/mobile/queries";
import { maySeeTruckFinance, mergeTruckExpenses } from "@/lib/mobile/truck-detail";
import { dateBR, todayISO } from "@/lib/format";
import { truckTitle } from "@/lib/truck-title";
import { STATUS_LABEL } from "@/lib/truck-status";
import { cn } from "@/lib/utils";
import {
  calculateSaleScenario,
  canPersistRealSaleSafely,
  centsFromMoney,
  evaluateFiscalValidation,
  formatCents,
  moneyFromCents,
  paymentReconciliationMessage,
  saleSimulatorFinanceAccess,
  taxDisplayState,
  type CommissionBasis,
  type CommissionMode,
  type ExpenseInput,
  type PaymentKind,
  type PaymentLineInput,
} from "@/lib/sales-simulator";

export const Route = createFileRoute("/_app/garagem/simular-venda")({
  validateSearch: (search: Record<string, unknown>): { truck_id?: string } => ({
    truck_id: typeof search.truck_id === "string" ? search.truck_id : undefined,
  }),
  component: SaleSimulatorRoute,
});

type ScenarioKey = "conservador" | "alvo" | "proposta";

const PAYMENT_KINDS: { value: PaymentKind; label: string }[] = [
  { value: "entrada", label: "Entrada" },
  { value: "PIX", label: "PIX" },
  { value: "TRANSFERENCIA", label: "TED/transferência" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARTAO", label: "Cartão" },
  { value: "FINANCIAMENTO", label: "Financiamento/repasse" },
  { value: "TROCA", label: "Veículo na troca" },
];

const COMMISSION_BASES: { value: CommissionBasis; label: string }[] = [
  { value: "gross", label: "Preço bruto" },
  { value: "net", label: "Preço líquido" },
  { value: "margin", label: "Margem" },
];

const OPERATION_LABELS = {
  proprio: "Próprio em estoque para revenda",
  consignacao_comissao: "Consignação - contrato de comissão",
  consignacao_estimatorio: "Consignação - contrato estimatório",
  ativo_imobilizado: "Alienação de ativo imobilizado",
  validar: "Selecionar e validar com contador",
} as const;

function brlInput(cents: number) {
  return moneyFromCents(cents).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBps(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function pctLabel(bps: number | null) {
  if (bps == null) return "—";
  return `${(bps / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function ValueCard({ label, value, tone, description }: { label: string; value: string; tone?: "good" | "bad" | "warn"; description?: string }) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-3",
      tone === "good" && "border-success/30 bg-success/5",
      tone === "bad" && "border-destructive/30 bg-destructive/5",
      tone === "warn" && "border-gold/40 bg-gold/5",
    )}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-[15px] font-black tabular-nums">{value}</div>
      {description ? <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{description}</p> : null}
    </div>
  );
}

const SCENARIO_INFO: Record<ScenarioKey, { title: string; description: string; reason: string }> = {
  conservador: {
    title: "Cenário Conservador",
    description: "Usa uma venda mais cautelosa, abaixo do preço anunciado, para medir até onde a proposta aguenta desconto sem comprometer a margem.",
    reason: "Está assim para simular uma negociação difícil, onde o comprador pressiona preço e o vendedor precisa saber o piso seguro.",
  },
  alvo: {
    title: "Cenário Alvo",
    description: "Usa o preço anunciado atual do caminhão como referência principal da negociação.",
    reason: "Está assim para mostrar o resultado esperado se a venda acontecer perto da estratégia comercial definida na Garagem.",
  },
  proposta: {
    title: "Cenário Proposta",
    description: "Usa os valores digitados no simulador: preço bruto, desconto, pagamentos, comissão e custos opcionais.",
    reason: "Está assim para representar a proposta real que está sendo montada para o cliente antes de qualquer gravação no CRM.",
  },
};

function OptionSwitch({ checked, onChange, label, hint }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
        checked ? "border-gold bg-gold/10" : "bg-card",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-black">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-gold" : "bg-muted-foreground/25",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
    </button>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (cents: number) => void }) {
  const [draft, setDraft] = useState(() => (value ? brlInput(value) : ""));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    setDraft(value ? brlInput(value) : "");
  }, [focused, value]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={draft}
        inputMode="decimal"
        placeholder="0,00"
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          onChange(centsFromMoney(next));
        }}
        onBlur={() => {
          setFocused(false);
          setDraft(value ? brlInput(value) : "");
        }}
      />
    </div>
  );
}

function MoneyCell({ value, onChange, placeholder = "0,00" }: { value: number; onChange: (cents: number) => void; placeholder?: string }) {
  const [draft, setDraft] = useState(() => (value ? brlInput(value) : ""));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    setDraft(value ? brlInput(value) : "");
  }, [focused, value]);

  return (
    <Input
      value={draft}
      inputMode="decimal"
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        onChange(centsFromMoney(next));
      }}
      onBlur={() => {
        setFocused(false);
        setDraft(value ? brlInput(value) : "");
      }}
    />
  );
}

function PercentInput({ label, valueBps, onChange }: { label: string; valueBps: number; onChange: (bps: number) => void }) {
  const [draft, setDraft] = useState(() => (valueBps ? (valueBps / 100).toLocaleString("pt-BR") : ""));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    setDraft(valueBps ? (valueBps / 100).toLocaleString("pt-BR") : "");
  }, [focused, valueBps]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        inputMode="decimal"
        value={draft}
        placeholder="0,00"
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          onChange(parseBps(next));
        }}
        onBlur={() => {
          setFocused(false);
          setDraft(valueBps ? (valueBps / 100).toLocaleString("pt-BR") : "");
        }}
      />
    </div>
  );
}

function useProfiles() {
  return useQuery({
    queryKey: ["profiles-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function SaleSimulatorRoute() {
  const search = Route.useSearch();
  const { roles, user } = useAuth();
  const access = saleSimulatorFinanceAccess(roles, user?.email);
  const [truckSearch, setTruckSearch] = useState("");
  const [selectedTruckId, setSelectedTruckId] = useState(search.truck_id ?? "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [scenario, setScenario] = useState<ScenarioKey>("proposta");
  const [grossPriceCents, setGrossPriceCents] = useState(0);
  const [discountCents, setDiscountCents] = useState(0);
  const [targetMarginBps, setTargetMarginBps] = useState(1_500);
  const [operation, setOperation] = useState<keyof typeof OPERATION_LABELS>("validar");
  const [contractType, setContractType] = useState<"garantia" | "repasse">("garantia");
  const [sellerId, setSellerId] = useState("");
  const [expectedDate, setExpectedDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [includeCommission, setIncludeCommission] = useState(false);
  const [includeTaxes, setIncludeTaxes] = useState(false);
  const [commissionMode, setCommissionMode] = useState<CommissionMode>("none");
  const [commissionBasis, setCommissionBasis] = useState<CommissionBasis>("margin");
  const [commissionPercentBps, setCommissionPercentBps] = useState(0);
  const [commissionFixedCents, setCommissionFixedCents] = useState(0);
  const [newExpenses, setNewExpenses] = useState<ExpenseInput[]>([]);
  const [sellingCosts, setSellingCosts] = useState<ExpenseInput[]>([]);
  const [payments, setPayments] = useState<PaymentLineInput[]>([]);

  const trucksQ = useTrucks();
  const truckDetailQ = useTruckDetail(selectedTruckId || undefined);
  const customersQ = useCustomers(customerSearch);
  const profilesQ = useProfiles();

  const isExec = maySeeTruckFinance(roles, user?.email);
  const trucks = trucksQ.data ?? [];
  const selectedTruck = truckDetailQ.data?.truck ?? trucks.find((t) => t.id === selectedTruckId) ?? null;
  const selectedCustomer = (customersQ.data ?? []).find((c) => c.id === selectedCustomerId) ?? null;
  const expenseLines = useMemo(
    () => mergeTruckExpenses(truckDetailQ.data?.expenses, truckDetailQ.data?.generalExpenses),
    [truckDetailQ.data?.expenses, truckDetailQ.data?.generalExpenses],
  );
  const accountedExpenseCents = selectedTruck ? centsFromMoney(selectedTruck.expenses_total ?? 0) : 0;
  const acquisitionCostCents = selectedTruck ? centsFromMoney(selectedTruck.purchase_price ?? 0) : 0;
  const advertisedCents = selectedTruck ? centsFromMoney(selectedTruck.expected_price ?? 0) : 0;

  const scenarioPreset = useMemo(() => {
    if (scenario === "conservador") return { gross: Math.max(0, advertisedCents - Math.round(advertisedCents * 0.08)), discount: 0 };
    if (scenario === "alvo") return { gross: advertisedCents, discount: 0 };
    return { gross: grossPriceCents || advertisedCents, discount: discountCents };
  }, [advertisedCents, discountCents, grossPriceCents, scenario]);

  const result = calculateSaleScenario({
    grossPriceCents: scenarioPreset.gross,
    discountCents: scenarioPreset.discount,
    acquisitionCostCents,
    accountedExpenseCents,
    estimatedExpenses: newExpenses,
    sellingCosts,
    commission: {
      mode: includeCommission ? commissionMode : "none",
      basis: commissionBasis,
      percentBps: commissionPercentBps,
      fixedCents: commissionFixedCents,
    },
    payments,
    targetMarginBps,
    fiscalProfileValidated: false,
  });
  const scenarioInfo = SCENARIO_INFO[scenario];

  const taxState = taxDisplayState(false);
  const fiscalResult = evaluateFiscalValidation({
    regime: "Lucro Real (referência Manual HF 2026, não validado para esta venda)",
    originUf: "PR",
    destinationUf: null,
    buyerIsTaxpayer: null,
    operationType: OPERATION_LABELS[operation],
    entryDocumentationValidated: false,
    exitConditionsValidated: false,
    fiscalCostValidatedCents: null,
    fiscalResponsible: null,
    fiscalApprovedAt: null,
    fiscalSource: null,
    pisCofinsRuleApproved: false,
    icmsUsedVehicleRuleApproved: false,
    irpjCsllSaleLevelRuleApproved: false,
  });
  const persistDecision = canPersistRealSaleSafely({
    hasTruckId: Boolean(selectedTruck?.id),
    hasCustomerId: Boolean(selectedCustomer?.id),
    hasAtomicSaleFlow: false,
  });

  function syncFromTruck(id: string) {
    setSelectedTruckId(id);
    const t = trucks.find((x) => x.id === id);
    if (t?.expected_price) setGrossPriceCents(centsFromMoney(t.expected_price));
    if (t?.consigned) setOperation("validar");
    else setOperation("proprio");
  }

  function addPayment(kind: PaymentKind) {
    setPayments((items) => [
      ...items,
      { id: crypto.randomUUID(), kind, amountCents: 0, dueDate: expectedDate },
    ]);
  }

  function addExpense(setter: Dispatch<SetStateAction<ExpenseInput[]>>, label: string) {
    setter((items) => [...items, { id: crypto.randomUUID(), label, amountCents: 0 }]);
  }

  const filteredTrucks = trucks.filter((t) => {
    const term = truckSearch.trim().toLowerCase();
    if (!term) return true;
    return [t.id, t.plate, t.brand, t.model, t.year].filter(Boolean).join(" ").toLowerCase().includes(term);
  }).slice(0, 20);

  if (!access.canAccess) {
    return (
      <>
        <Link to="/garagem" className="inline-flex items-center gap-2 text-sm font-bold text-gold">
          <ArrowLeft className="h-4 w-4" /> Garagem
        </Link>
        <MobileCard className="p-5 text-center">
          <Lock className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
          <h1 className="text-lg font-black">Simulador financeiro restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">{access.reason}</p>
        </MobileCard>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Link to="/garagem" aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black">Simular venda</h1>
          <p className="text-[12px] text-muted-foreground">Simulação local. Não altera caminhão, cliente, pagamentos ou contratos.</p>
        </div>
      </div>

      <MobileCard className="border-gold/30 bg-gold/5 p-3">
        <div className="flex gap-2 text-[13px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p>Tributos, comissão e confirmação real dependem de configuração validada e do fluxo oficial. Nenhum valor fiscal é tratado como zero.</p>
        </div>
      </MobileCard>

      <MobileCard className="p-3">
        <SectionTitle className="mb-3">1. Caminhão real da Garagem</SectionTitle>
        <div className="space-y-3">
          <Input value={truckSearch} onChange={(e) => setTruckSearch(e.target.value)} placeholder="Buscar por placa, modelo ou ID" />
          {trucksQ.isLoading ? <SkeletonRows rows={3} height={48} /> : null}
          {trucksQ.isError ? <EmptyState title="Erro ao carregar caminhões" hint="Tente novamente." /> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredTrucks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => syncFromTruck(t.id)}
                className={cn("rounded-xl border p-3 text-left", selectedTruckId === t.id ? "border-gold bg-gold/10" : "bg-card")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{truckTitle(t)}</div>
                    <div className="text-xs text-muted-foreground">{t.plate ?? "sem placa"} · ID {t.id.slice(0, 8)}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </MobileCard>

      {selectedTruck ? (
        <MobileCard className="p-3">
          <SectionTitle className="mb-2">Dados carregados do CRM</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <ValueCard label="Caminhão" value={truckTitle(selectedTruck)} />
            <ValueCard label="Status" value={STATUS_LABEL[selectedTruck.status] ?? selectedTruck.status} />
            <ValueCard label="Placa / ano" value={`${selectedTruck.plate ?? "—"} · ${selectedTruck.year ?? "—"}`} />
            <ValueCard label="Cor" value={selectedTruck.color ?? "—"} />
            {isExec ? <ValueCard label="Preço anunciado" value={formatCents(advertisedCents)} /> : null}
            {isExec ? <ValueCard label="Custo de compra" value={formatCents(acquisitionCostCents)} /> : null}
            {isExec ? <ValueCard label="Despesas contabilizadas" value={formatCents(accountedExpenseCents)} /> : null}
            <ValueCard label="Consignado" value={selectedTruck.consigned ? "Sim" : "Não"} />
          </div>
          {expenseLines.length > 0 ? (
            <details className="mt-3 rounded-xl bg-muted p-3 text-sm">
              <summary className="cursor-pointer font-bold">Despesas vinculadas ({expenseLines.length})</summary>
              <div className="mt-2 divide-y divide-border/60">
                {expenseLines.slice(0, 12).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <span className="truncate">{e.description || e.kind || "Despesa"}</span>
                    <span className="font-bold tabular-nums">{formatCents(centsFromMoney(e.amount))}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </MobileCard>
      ) : null}

      <MobileCard className="p-3">
        <SectionTitle className="mb-3">2. Operação, cliente e proposta</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de operação</Label>
            <select value={operation} onChange={(e) => setOperation(e.target.value as keyof typeof OPERATION_LABELS)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {Object.entries(OPERATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Contrato disponível</Label>
            <select value={contractType} onChange={(e) => setContractType(e.target.value as "garantia" | "repasse")} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="garantia">Garantia</option>
              <option value="repasse">Repasse</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Cliente existente</Label>
            <Input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Buscar cliente real" />
            <div className="grid max-h-48 gap-2 overflow-y-auto pt-1">
              {(customersQ.data ?? []).slice(0, 8).map((c) => (
                <button key={c.id} type="button" onClick={() => setSelectedCustomerId(c.id)} className={cn("rounded-xl border p-2 text-left text-sm", selectedCustomerId === c.id ? "border-gold bg-gold/10" : "bg-card")}>
                  <span className="font-bold">{c.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{c.phone ?? c.city ?? "ID " + c.id.slice(0, 8)}</span>
                </button>
              ))}
            </div>
          </div>
          <MoneyInput label="Preço anunciado/bruto" value={grossPriceCents || advertisedCents} onChange={setGrossPriceCents} />
          <MoneyInput label="Desconto" value={discountCents} onChange={setDiscountCents} />
          <div className="space-y-1.5">
            <Label>Vendedor responsável</Label>
            <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Selecionar</option>
              {(profilesQ.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Data prevista/competência</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observações da simulação</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Condições, pendências, validações contábeis..." />
          </div>
        </div>
      </MobileCard>

      <MobileCard className="p-3">
        <SectionTitle className="mb-3">3. Cenários e cálculos</SectionTitle>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(["conservador", "alvo", "proposta"] as ScenarioKey[]).map((key) => (
            <button key={key} type="button" onClick={() => setScenario(key)} className={cn("rounded-xl border px-2 py-2 text-xs font-black capitalize", scenario === key ? "border-gold bg-gold text-gold-foreground" : "bg-card")}>{key}</button>
          ))}
        </div>
        <div className="mb-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
          <div className="text-sm font-black">{scenarioInfo.title}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{scenarioInfo.description}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground"><span className="font-bold text-foreground">Por que está assim:</span> {scenarioInfo.reason}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <ValueCard label="Preço líquido" value={formatCents(result.netPriceCents)} description="Preço bruto menos desconto. É o valor que precisa fechar com as formas de pagamento." />
          <ValueCard label="Custo gerencial" value={formatCents(result.managerialCostCents)} description="Compra, despesas já vinculadas e novas despesas estimadas não duplicadas." />
          <ValueCard label="Margem bruta" value={formatCents(result.grossMarginCents)} tone={result.grossMarginCents >= 0 ? "good" : "bad"} description="Sobra comercial antes de comissão, custos de venda e tributos." />
          <ValueCard label="Margem %" value={pctLabel(result.marginBps)} description="Margem bruta dividida pelo preço líquido. Fica zerada/indefinida se não houver preço." />
          <ValueCard label="Custos de venda" value={formatCents(result.sellingCostCents)} description="Taxas, despachante, cartão, financiamento ou outros custos informados à parte." />
          <ValueCard label="Comissão estimada" value={formatCents(result.commissionCents)} description={includeCommission ? "Calculada pela regra opcional selecionada." : "Desativada. Não entra no resultado deste cenário."} />
          <ValueCard label="Contribuição antes tributos" value={formatCents(result.contributionAfterCostsCents)} tone={result.contributionAfterCostsCents >= 0 ? "good" : "bad"} description="Margem após custos de venda e comissão, ainda sem tributos validados." />
          <ValueCard label="Preço equilíbrio" value={formatCents(result.breakEvenPriceCents)} description="Preço necessário para cobrir custo gerencial, custos de venda e comissão ativa." />
          <ValueCard label="Preço mínimo alvo" value={formatCents(result.minimumPriceCents)} tone="warn" description="Preço estimado para atingir a margem alvo definida no simulador." />
        </div>
        <details className="mt-3 rounded-xl bg-muted p-3 text-sm">
          <summary className="cursor-pointer font-bold">Como foi calculado?</summary>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>Preço líquido = preço bruto - desconto.</p>
            <p>Custo gerencial = compra + despesas contabilizadas + novas despesas estimadas não contabilizadas.</p>
            <p>Margem bruta = preço líquido - custo gerencial.</p>
            <p>Contribuição antes de tributos = margem bruta - custos de venda - comissão.</p>
            <p>Preço mínimo usa a margem alvo informada e não considera tributos sem perfil fiscal validado.</p>
          </div>
        </details>
      </MobileCard>

      <MobileCard className="p-3">
        <SectionTitle className="mb-3">4. Comissão, despesas e custos</SectionTitle>
        <OptionSwitch
          checked={includeCommission}
          onChange={(checked) => {
            setIncludeCommission(checked);
            if (checked && commissionMode === "none") setCommissionMode("percent");
          }}
          label="Incluir comissão na simulação"
          hint="Opcional. Só entra no cálculo quando ativada e configurada."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={cn("space-y-1.5", !includeCommission && "opacity-50")}>
            <Label>Comissão do vendedor</Label>
            <select disabled={!includeCommission} value={commissionMode} onChange={(e) => setCommissionMode(e.target.value as CommissionMode)} className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed">
              <option value="none">Não calcular</option>
              <option value="percent">Percentual</option>
              <option value="fixed">Valor fixo</option>
            </select>
          </div>
          <div className={cn("space-y-1.5", !includeCommission && "opacity-50")}>
            <Label>Base da comissão</Label>
            <select disabled={!includeCommission} value={commissionBasis} onChange={(e) => setCommissionBasis(e.target.value as CommissionBasis)} className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed">
              {COMMISSION_BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          {includeCommission && commissionMode === "percent" ? (
            <PercentInput label="Percentual (%)" valueBps={commissionPercentBps} onChange={setCommissionPercentBps} />
          ) : null}
          {includeCommission && commissionMode === "fixed" ? <MoneyInput label="Valor fixo" value={commissionFixedCents} onChange={setCommissionFixedCents} /> : null}
          <PercentInput label="Margem alvo (%)" valueBps={targetMarginBps} onChange={setTargetMarginBps} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between"><span className="text-sm font-black">Novas despesas estimadas</span><Button type="button" size="sm" variant="outline" onClick={() => addExpense(setNewExpenses, "Despesa estimada")}><Plus className="h-4 w-4" /></Button></div>
            <EditableExpenses items={newExpenses} onChange={setNewExpenses} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><span className="text-sm font-black">Custos de venda</span><Button type="button" size="sm" variant="outline" onClick={() => addExpense(setSellingCosts, "Custo de venda")}><Plus className="h-4 w-4" /></Button></div>
            <EditableExpenses items={sellingCosts} onChange={setSellingCosts} />
          </div>
        </div>
      </MobileCard>

      <MobileCard className="p-3">
        <SectionTitle className="mb-3">5. Formas de pagamento</SectionTitle>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {PAYMENT_KINDS.map((p) => <Button key={p.value} type="button" variant="outline" size="sm" className="shrink-0" onClick={() => addPayment(p.value)}>{p.label}</Button>)}
        </div>
        <EditablePayments payments={payments} onChange={setPayments} />
        <div className={cn("mt-3 rounded-xl p-3 text-sm font-bold", result.reconciliationDiffCents === 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
          {paymentReconciliationMessage(result.reconciliationDiffCents)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <ValueCard label="Total nominal" value={formatCents(result.paymentsTotalCents)} />
          <ValueCard label="Recebido pela empresa" value={formatCents(result.companyReceivesCents)} />
          <ValueCard label="Principal financiado" value={formatCents(result.financePrincipalCents)} />
          <ValueCard label="Troca separada" value={formatCents(result.tradeInCents)} />
        </div>
      </MobileCard>

      <MobileCard className="p-3">
        <SectionTitle className="mb-2">6. Tributos e confirmação</SectionTitle>
        <OptionSwitch
          checked={includeTaxes}
          onChange={setIncludeTaxes}
          label="Considerar impostos na simulação"
          hint="Opcional. Ao ativar, o simulador mostra as pendências fiscais; não calcula valores sem validação."
        />
        <div className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm">
          <div className="font-black">{includeTaxes ? taxState.label : "Impostos desativados nesta simulação"}</div>
          {includeTaxes ? (
            <>
              <p className="mt-1 text-muted-foreground">Manual HF informado: Lucro Real/PR; ICMS pode ter base reduzida a 5% do valor da operação somente quando a entrada e a saída estiverem fiscalmente enquadradas. Isso não é alíquota de ICMS e não vira padrão automático.</p>
              <div className="mt-3 grid gap-2">
                {fiscalResult.states.map((state) => (
                  <div key={state.key} className="rounded-lg bg-background/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{state.label}</span>
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold-dark">
                        {state.status === "not_sale_level" ? "não apurado por venda" : "pendente"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{state.message}</p>
                  </div>
                ))}
              </div>
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-bold text-foreground">Dados fiscais faltantes</summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fiscalResult.missing.map((item) => (
                    <span key={item} className="rounded-full bg-muted px-2 py-1">{item}</span>
                  ))}
                </div>
              </details>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">Nenhum imposto entra no resultado. A margem exibida continua gerencial e antes de tributos.</p>
          )}
        </div>
        <div className="mt-3 rounded-xl border bg-card p-3 text-sm">
          <div className="font-black">Dossiê do caminhão no CRM</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <ValueCard label="Documentos" value={String((truckDetailQ.data?.truckDocuments.length ?? 0) + (truckDetailQ.data?.documents.length ?? 0))} />
            <ValueCard label="Despesas vinculadas" value={String(expenseLines.length)} />
            <ValueCard label="Serviços" value={String(truckDetailQ.data?.services.length ?? 0)} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">O simulador apenas consulta vínculos existentes. NF-e, transferência, contrato e encerramento continuam fora da simulação.</p>
        </div>
        <div className="mt-3 rounded-xl border bg-card p-3 text-sm">
          <div className="font-black">Revisão final</div>
          <p className="mt-1 text-muted-foreground">Caminhão: {selectedTruck ? `${truckTitle(selectedTruck)} (${selectedTruck.id})` : "não selecionado"}</p>
          <p className="text-muted-foreground">Cliente: {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.id})` : "não selecionado"}</p>
          <p className="text-muted-foreground">Vendedor: {(profilesQ.data ?? []).find((p) => p.id === sellerId)?.full_name ?? "não selecionado"}</p>
          <p className="text-muted-foreground">Preço líquido: {formatCents(result.netPriceCents)} · contrato: {contractType} · competência: {dateBR(expectedDate)}</p>
          {notes ? <p className="mt-1 whitespace-pre-line text-muted-foreground">{notes}</p> : null}
        </div>
        <Button type="button" disabled className="mt-3 w-full">
          <Calculator className="h-4 w-4" /> Confirmar venda real indisponível
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">{persistDecision.reason}</p>
      </MobileCard>
    </>
  );
}

function EditableExpenses({ items, onChange }: { items: ExpenseInput[]; onChange: (items: ExpenseInput[]) => void }) {
  if (!items.length) return <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">Nenhum item estimado.</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-[1fr_120px_34px] gap-2">
          <Input value={item.label} onChange={(e) => onChange(items.map((x) => x.id === item.id ? { ...x, label: e.target.value } : x))} />
          <MoneyCell value={item.amountCents} onChange={(amountCents) => onChange(items.map((x) => x.id === item.id ? { ...x, amountCents } : x))} />
          <button type="button" aria-label="Remover" onClick={() => onChange(items.filter((x) => x.id !== item.id))} className="flex h-10 items-center justify-center rounded-md border bg-card"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

function EditablePayments({ payments, onChange }: { payments: PaymentLineInput[]; onChange: (items: PaymentLineInput[]) => void }) {
  if (!payments.length) return <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">Adicione entrada, PIX, financiamento, parcelas ou troca. Troca não reduz automaticamente o preço de venda.</p>;
  return (
    <div className="space-y-2">
      {payments.map((p) => (
        <div key={p.id} className="rounded-xl border bg-card p-2">
          <div className="grid grid-cols-[1fr_120px_34px] gap-2">
            <select value={p.kind} onChange={(e) => onChange(payments.map((x) => x.id === p.id ? { ...x, kind: e.target.value as PaymentKind } : x))} className="h-10 rounded-md border bg-background px-2 text-sm">
              {PAYMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <MoneyCell value={p.amountCents} onChange={(amountCents) => onChange(payments.map((x) => x.id === p.id ? { ...x, amountCents } : x))} />
            <button type="button" aria-label="Remover" onClick={() => onChange(payments.filter((x) => x.id !== p.id))} className="flex h-10 items-center justify-center rounded-md border bg-card"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Input type="date" value={p.dueDate} onChange={(e) => onChange(payments.map((x) => x.id === p.id ? { ...x, dueDate: e.target.value } : x))} />
            <MoneyCell placeholder="Taxa/custo" value={p.feeCents ?? 0} onChange={(feeCents) => onChange(payments.map((x) => x.id === p.id ? { ...x, feeCents } : x))} />
            {p.kind === "FINANCIAMENTO" ? (
              <MoneyCell placeholder="Principal financiado" value={p.financePrincipalCents ?? 0} onChange={(financePrincipalCents) => onChange(payments.map((x) => x.id === p.id ? { ...x, financePrincipalCents } : x))} />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
