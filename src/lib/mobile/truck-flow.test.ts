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
  reopenTruckFlowStep,
} from "./truck-flow";

describe("definição aprovada do fluxo de caminhão", () => {
  it("mantém exatamente as seis etapas e a ordem aprovada", () => {
    expect(TRUCK_FLOW_STEPS.map(({ key, label, order }) => ({ key, label, order }))).toEqual([
      { key: "crm_add", label: "Adição ao CRM", order: 1 },
      { key: "vistoria_marcelo", label: "Vistoria Marcelo", order: 2 },
      { key: "necessidades", label: "O que precisa ser feito no caminhão", order: 3 },
      { key: "retorno_servico", label: "Volta do caminhão do serviço", order: 4 },
      { key: "vistoria_banco", label: "Vistoria banco", order: 5 },
      { key: "documentacao", label: "Documentação", order: 6 },
    ]);
    expect(TRUCK_FLOW_STEPS[0].manualOnly).toBe(true);
    expect(TRUCK_FLOW_STEPS[2].descriptionRequired).toBe(true);
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
    await completeTruckFlowStep("flow-1", "necessidades", "Trocar pneus");
    expect(rpc).toHaveBeenCalledWith("complete_truck_flow_step", {
      p_flow_id: "flow-1",
      p_step_key: "necessidades",
      p_notes: "Trocar pneus",
    });

    await reopenTruckFlowStep("flow-1", "necessidades", "Serviço incompleto");
    expect(rpc).toHaveBeenCalledWith("reopen_truck_flow_step", {
      p_flow_id: "flow-1",
      p_step_key: "necessidades",
      p_reason: "Serviço incompleto",
    });
  });

  it("propaga erros do servidor sem alterar estado local", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Etapa já concluída." } });
    await expect(completeTruckFlowStep("flow-1", "crm_add")).rejects.toThrow("Etapa já concluída.");
  });
});
