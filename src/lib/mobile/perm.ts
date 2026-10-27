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

export function isSecretaria(roles: AppRole[]) {
  return roles.includes("secretaria");
}

/** Perfil exclusivamente operacional; papéis mais privilegiados prevalecem. */
export function isSecretariaOnly(roles: AppRole[]) {
  return isSecretaria(roles) && !roles.includes("admin") && !roles.includes("financeiro");
}

const FINANCE_BLOCKED_EMAILS = new Set(["josemar.essing@gmail.com"]);

function isFinanceBlockedEmail(email?: string | null) {
  return FINANCE_BLOCKED_EMAILS.has(email?.toLowerCase() ?? "");
}

/**
 * Acesso financeiro exclusivo do Executivo.
 *
 * Decisão de negócio: mesmo o cargo "financeiro" NÃO possui acesso a
 * informações financeiras. Apenas o Executivo (admin).
 */
export function isFinanceExecutive(roles: AppRole[], email?: string | null) {
  return roles.includes("admin") && !isFinanceBlockedEmail(email);
}

/**
 * Permissão financeira INDIVIDUAL, identificada APENAS por `auth.users.id`
 * (nunca por nome/e-mail, que não são identificadores imutáveis).
 *
 * IMPORTANTE — isto NÃO é segurança. É um gate de interface: quem controla o
 * acesso real aos dados é a RLS do banco. A RLS atual do projeto exige
 * `is_admin()` em todas as tabelas financeiras, então um usuário não-admin
 * continua bloqueado no banco mesmo que conste aqui (ver relatório/proposta em
 * docs/proposals/finance-individual-access-proposta-sql.sql).
 *
 * Deve ser mantido idêntico ao secret `PUSH_FINANCE_INDIVIDUAL_USER_IDS` da Edge
 * Function `push-send` para que app e push usem a mesma regra.
 *
 * Preencher somente com o UUID real, após autorização do administrador.
 */
export const FINANCE_INDIVIDUAL_USER_IDS = new Set<string>([
  // "<uuid-de-auth.users.id-autorizado>",
]);

export function isIndividualFinanceUser(userId?: string | null) {
  return Boolean(userId && FINANCE_INDIVIDUAL_USER_IDS.has(userId));
}

export type TruckFlowAccessLevel = "editor" | "viewer" | null | undefined;

export function canAccessTruckFlow(accessLevel: TruckFlowAccessLevel): boolean {
  return accessLevel === "editor" || accessLevel === "viewer";
}

export function canEditTruckFlow(accessLevel: TruckFlowAccessLevel): boolean {
  return accessLevel === "editor";
}

export function canViewTruckFlow(accessLevel: TruckFlowAccessLevel): boolean {
  return accessLevel === "viewer";
}

export function canApproveExpenses(hasApprovalAccess?: boolean | null): boolean {
  return hasApprovalAccess === true;
}

/** Contas bancárias e movimentações: Executivo/Admin ou UUID individual autorizado. */
export function canAccessBanking(roles: AppRole[], email?: string | null, userId?: string | null) {
  return isFinanceExecutive(roles, email) || isIndividualFinanceUser(userId);
}

/** Notificações financeiras: Executivo/Admin ou UUID individual autorizado. */
export function canSeeFinanceNotifications(
  roles: AppRole[],
  email?: string | null,
  userId?: string | null,
) {
  return isFinanceExecutive(roles, email) || isIndividualFinanceUser(userId);
}

/** Executivo: acesso ao módulo Financeiro. */
export function canSeeFinance(roles: AppRole[], email?: string | null) {
  return isFinanceExecutive(roles, email);
}

/** Ações financeiras críticas (lançamentos, pagamentos) — Executivo. */
export function canEditFinance(roles: AppRole[], email?: string | null) {
  return isFinanceExecutive(roles, email);
}

/** Secretaria pode editar estoque de itens (conforme regras do CRM). */
export function canEditInventory(roles: AppRole[]) {
  return isAdmin(roles) || roles.includes("financeiro") || roles.includes("secretaria");
}

/** Ações de cadastro (caminhão, cliente, serviço, compromisso). */
export function canManageTrucks(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("financeiro") || roles.includes("secretaria");
}

export function canSeeServices(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("financeiro") || roles.includes("secretaria");
}

export function canSeeTruckFinance(roles: AppRole[], email?: string | null) {
  return isFinanceExecutive(roles, email);
}

export function canManageGeneralExpenses(roles: AppRole[]) {
  // A Secretaria registra somente pelo fluxo "Lançamento do dia". A lista
  // consolidada de despesas contém valores e fica restrita ao Executivo.
  return isAdmin(roles);
}

export function canRegisterExpense(roles: AppRole[], email?: string | null) {
  return isFinanceExecutive(roles, email);
}

export function roleLabel(roles: AppRole[]): string {
  if (roles.includes("admin")) return "Executivo";
  if (roles.includes("financeiro")) return "Financeiro";
  if (roles.includes("secretaria")) return "Secretaria";
  return "Usuário";
}

const SECRETARIA_ALLOWED_PREFIXES = [
  "/",
  "/garagem",
  "/agenda",
  "/clientes",
  "/estoque",
  "/servicos",
  "/menu",
  "/notificacoes",
  "/pendencias",
  "/busca",
  "/perfil",
  "/assistente",
  "/vendidos",
  "/secretaria/lancamento-do-dia",
] as const;

const SECRETARIA_BLOCKED_PREFIXES = [
  "/financeiro",
  "/pagamentos",
  "/garagem/simular-venda",
] as const;

function matchesPathPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isPathAllowedForRoles(path: string, roles: AppRole[]) {
  if (!isSecretariaOnly(roles)) return true;

  // A Secretaria lança pagamentos/recebimentos, mas não abre a lista financeira.
  if (matchesPathPrefix(path, "/pagamentos/novo")) return true;

  if (SECRETARIA_BLOCKED_PREFIXES.some((prefix) => matchesPathPrefix(path, prefix))) {
    return false;
  }
  if (/^\/garagem\/[^/]+\/despesa(?:\/|$)/.test(path)) return false;

  return SECRETARIA_ALLOWED_PREFIXES.some((prefix) =>
    prefix === "/" ? path === "/" : matchesPathPrefix(path, prefix),
  );
}

export function defaultRouteForRoles(roles: AppRole[]) {
  if (isSecretariaOnly(roles)) return "/" as const;
  return "/" as const;
}

/** Rotas internas do app visíveis por cargo (usadas no menu e home). */
export const MOBILE_MENU: {
  label: string;
  to: string;
  icon: string;
  allowed: (roles: AppRole[], email?: string | null, userId?: string | null) => boolean;
  description: string;
}[] = [
  {
    label: "Assistente V",
    to: "/assistente",
    icon: "assistant",
    allowed: () => true,
    description: "Consulta inteligente",
  },
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
    allowed: canSeeServices,
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
    allowed: canAccessBanking,
    description: "Contas e movimentações",
  },
  {
    label: "Estoque",
    to: "/estoque",
    icon: "box",
    allowed: () => true,
    description: "Itens e materiais",
  },
  {
    label: "Despesas gerais",
    to: "/despesas",
    icon: "receipt",
    allowed: canManageGeneralExpenses,
    description: "Despesas sem vínculo com caminhão",
  },
  {
    label: "Lançamento do dia",
    to: "/secretaria/lancamento-do-dia",
    icon: "receipt",
    allowed: (roles) => isSecretaria(roles),
    description: "Registrar despesas da operação",
  },
  {
    label: "Vendidos",
    to: "/vendidos",
    icon: "shield",
    allowed: () => true,
    description: "Vendidos e garantia",
  },
];
