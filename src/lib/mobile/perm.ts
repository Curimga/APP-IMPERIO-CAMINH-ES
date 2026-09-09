import type { AppRole } from "@/hooks/use-auth";

/**
 * Permissões do aplicativo mobile.
 *
 * Reutiliza os mesmos cargos e regras do CRM (admin / financeiro / secretaria).
 * O bloqueio acontece também na camada de dados via RLS existente — aqui
 * controlamos apenas visibilidade/navegação.
 */

export function isAdmin(roles: AppRole[]) {
  return roles.includes("admin");
}

/** Executivo/Financeiro: acesso a indicadores financeiros. */
export function canSeeFinance(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("financeiro");
}

/** Ações financeiras críticas (lançamentos, pagamentos). */
export function canEditFinance(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("financeiro");
}

/** Secretaria pode editar estoque de itens (conforme regras do CRM). */
export function canEditInventory(roles: AppRole[]) {
  return isAdmin(roles) || roles.includes("financeiro") || roles.includes("secretaria");
}

/** Ações de cadastro (caminhão, cliente, serviço, compromisso). */
export function canManageTrucks(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("financeiro") || roles.includes("secretaria");
}

export function canRegisterExpense(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("financeiro");
}

export function roleLabel(roles: AppRole[]): string {
  if (roles.includes("admin")) return "Executivo";
  if (roles.includes("financeiro")) return "Financeiro";
  if (roles.includes("secretaria")) return "Secretaria";
  return "Usuário";
}

/** Rotas internas do app visíveis por cargo (usadas no menu e home). */
export const MOBILE_MENU: {
  label: string;
  to: string;
  icon: string;
  allowed: (roles: AppRole[]) => boolean;
  description: string;
}[] = [
  {
    label: "Garagem",
    to: "/garagem",
    icon: "truck",
    allowed: () => true,
    description: "Frota e caminhões",
  },
  {
    label: "Agenda",
    to: "/agenda",
    icon: "calendar",
    allowed: () => true,
    description: "Compromissos",
  },
  {
    label: "Serviços",
    to: "/servicos",
    icon: "wrench",
    allowed: () => true,
    description: "Serviços gerais",
  },
  {
    label: "Clientes",
    to: "/clientes",
    icon: "users",
    allowed: () => true,
    description: "Cadastro de clientes",
  },
  {
    label: "Financeiro",
    to: "/financeiro",
    icon: "dollar",
    allowed: canSeeFinance,
    description: "Indicadores e lançamentos",
  },
  {
    label: "Estoque",
    to: "/estoque",
    icon: "box",
    allowed: () => true,
    description: "Itens e materiais",
  },
  {
    label: "Vendidos",
    to: "/vendidos",
    icon: "shield",
    allowed: () => true,
    description: "Vendidos e garantia",
  },
];
