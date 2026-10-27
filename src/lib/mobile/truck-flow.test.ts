import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

import {
  TRUCK_FLOW_STEPS,
  completeTruckFlowStep,
  createTruckFlow,
  isTruckFlowDetailPath,
  reopenTruckFlowStep,
} from "./truck-flow";

describe("definição aprovada do fluxo de caminhão", () => {
  it("mantém exatamente as seis etapas e a ordem aprovada", () => {
    expect(TRUCK_FLOW_STEPS.map(({ key, label, order }) => ({ key, label, order }))).toEqual([
      { key: "vistoria_despachante", label: "Vistoria despachante", order: 1 },
      { key: "vistoria_josemar", label: "Vistoria Josemar", order: 2 },
      { key: "orcamento_estetica", label: "Orçamento de estética interna e externa", order: 3 },
      { key: "pecas_diana", label: "Solicitação de peças Diana", order: 4 },
      { key: "virada_documento", label: "Virada de documento", order: 5 },
      { key: "nf_entrada", label: "Emissão de nota fiscal de entrada", order: 6 },
      { key: "lavagem_anuncio", label: "Lavagem para fotos e anúncio", order: 7 },
      { key: "venda_nf_saida", label: "Venda e emissão de nota fiscal de saída", order: 8 },
    ]);
    expect(TRUCK_FLOW_STEPS[2].descriptionRequired).toBe(true);
  });

  it("distingue a lista da rota de detalhe por trucks.id", () => {
    expect(isTruckFlowDetailPath("/fluxo-caminhao/truck-1")).toBe(true);
    expect(isTruckFlowDetailPath("/fluxo-caminhao")).toBe(false);
    expect(isTruckFlowDetailPath("/fluxo-caminhao/truck-1/outro")).toBe(false);
  });
});

describe("ações do fluxo", () => {
  beforeEach(() => rpc.mockReset());

  it("cria o fluxo usando trucks.id", async () => {
    rpc.mockResolvedValue({ data: "flow-1", error: null });
    await expect(createTruckFlow("truck-1")).resolves.toBe("flow-1");
    expect(rpc).toHaveBeenCalledWith("create_truck_flow", { p_truck_id: "truck-1" });
  });

  it("envia conclusão e reabertura às RPCs atômicas", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await completeTruckFlowStep("flow-1", "orcamento_estetica", "Orçamento aprovado em 5 dias");
    expect(rpc).toHaveBeenCalledWith("complete_truck_flow_step", {
      p_flow_id: "flow-1",
      p_step_key: "orcamento_estetica",
      p_notes: "Orçamento aprovado em 5 dias",
    });

    await reopenTruckFlowStep("flow-1", "orcamento_estetica", "Prazo atualizado");
    expect(rpc).toHaveBeenCalledWith("reopen_truck_flow_step", {
      p_flow_id: "flow-1",
      p_step_key: "orcamento_estetica",
      p_reason: "Prazo atualizado",
    });
  });

  it("propaga erros do servidor sem alterar estado local", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Etapa já concluída." } });
    await expect(completeTruckFlowStep("flow-1", "vistoria_despachante")).rejects.toThrow("Etapa já concluída.");
  });
});
