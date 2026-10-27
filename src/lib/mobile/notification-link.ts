/**
 * Resolução segura do link de uma notificação.
 *
 * As notificações são criadas no banco por outros sistemas (CRM) e podem
 * apontar para rotas que não existem no app (ex.: `/estoque/<id>`,
 * `/financeiro/contas-pagar`). Este helper valida o destino contra as rotas
 * reais do mobile e devolve `undefined` para links desconhecidos — a UI então
 * esconde o "Ver detalhes" em vez de cair em tela quebrada.
 */

const LIST_ROUTES = new Set([
  "/garagem",
  "/servicos",
  "/agenda",
  "/clientes",
  "/financeiro",
  "/estoque",
  "/vendidos",
  "/notificacoes",
  "/menu",
  "/pendencias",
  "/busca",
  "/perfil",
  "/fluxo-caminhao",
  "/confirmacao-despesas",
  "/secretaria/lancamento-do-dia",
  "/secretaria/aprovacao-executivo",
]);

/**
 * Sub-rotas do CRM que nǜo existem como pǭgina no app, mas devem abrir a tela
 * equivalente. O CRM cria alertas financeiros apontando para
 * `/financeiro/contas-pagar?id=<id>` e `/financeiro/contas-receber?id=<id>`;
 * o app s�� tem a rota `/financeiro`, entǜo redirecionamos para ela em vez de
 * esconder o "Ver detalhes".
 */
const FINANCE_SUBROUTES = new Set([
  "/financeiro/contas-pagar",
  "/financeiro/contas-receber",
  "/financeiro/contas",
]);

/** Extrai o caminho sem query/hash e normaliza a barra final. */
function normalizePath(link: string): string {
  const path = link.split(/[?#]/)[0];
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

/** Rota real do app para o link da notificação, ou undefined se desconhecida. */
export function notificationLinkTarget(
  link: string | null | undefined,
): string | undefined {
  if (!link) return undefined;
  const path = normalizePath(link);
  if (LIST_ROUTES.has(path)) return path;
  if (FINANCE_SUBROUTES.has(path)) return "/financeiro";
  const truck = path.match(/^\/garagem\/([^/]+)$/);
  if (truck) return `/garagem/${truck[1]}`;
  const flow = path.match(/^\/fluxo-caminhao(?:\/([^/]+))?$/);
  if (flow) return flow[1] ? `/fluxo-caminhao/${flow[1]}` : "/fluxo-caminhao";
  return undefined;
}
