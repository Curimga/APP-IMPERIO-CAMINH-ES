import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261026182459_truck_flow_expense_schema.sql"),
  "utf8",
);

describe("migration de confirmação de despesas", () => {
  it("submete toda solicitação como pendente, sem autoaprovação", () => {
    expect(migration).toContain("v_request_id, p_target_type, p_origin, 'pending'");
    expect(migration).not.toMatch(/Aprovado automaticamente|status\s*=\s*isApprover/i);
  });

  it("impede que o solicitante aprove ou revise a própria despesa", () => {
    expect(migration).toContain("if v_request.created_by = v_user_id then");
    expect(migration).toContain("O solicitante não pode aprovar a própria despesa.");
    expect(migration).toContain("O solicitante não pode revisar a própria despesa.");
  });

  it("autoriza pelo cadastro no banco e mantém aprovação e auditoria na mesma RPC", () => {
    expect(migration).toContain("public.expense_approval_access");
    expect(migration).toContain("private.can_approve_expenses(v_user_id)");
    expect(migration).toContain("create or replace function public.approve_expense_approval");
    expect(migration).toContain("insert into public.expense_approval_events");
    expect(migration).toContain("resulting_id = v_result_id");
  });

  it("não oferece policies de mutação direta que contornem as RPCs", () => {
    expect(migration).not.toContain('create policy "expense_requests_insert_owner"');
    expect(migration).not.toContain('create policy "expense_requests_update_approver"');
    expect(migration).not.toContain('create policy "expense_events_insert_owner_or_approver"');
  });

  it("não substitui a policy existente de notificações gerais e pessoais", () => {
    expect(migration).not.toContain('drop policy if exists "read own or admin" on public.notifications');
  });
});

describe("migration do fluxo de caminhão", () => {
  it("cria exatamente as seis etapas aprovadas no servidor", () => {
    const orderedSteps = [
      "(v_flow_id, 'crm_add', 1)",
      "(v_flow_id, 'vistoria_marcelo', 2)",
      "(v_flow_id, 'necessidades', 3)",
      "(v_flow_id, 'retorno_servico', 4)",
      "(v_flow_id, 'vistoria_banco', 5)",
      "(v_flow_id, 'documentacao', 6)",
    ];
    for (const step of orderedSteps) expect(migration).toContain(step);
  });

  it("exige descrição na terceira etapa e motivo para reabrir", () => {
    expect(migration).toContain("p_step_key = 'necessidades'");
    expect(migration).toContain("A descrição do que precisa ser feito é obrigatória.");
    expect(migration).toContain("O motivo da reabertura é obrigatório.");
  });

  it("mantém transição e auditoria na mesma RPC e bloqueia mutação direta", () => {
    expect(migration).toContain("create or replace function public.complete_truck_flow_step");
    expect(migration).toContain("create or replace function public.reopen_truck_flow_step");
    expect(migration).toContain("'step_completed'");
    expect(migration).toContain("'step_reopened'");
    expect(migration).toContain('drop policy if exists "truck_flow_steps_update_editor"');
    expect(migration).toContain('drop policy if exists "truck_flow_events_insert_editor"');
  });
});
