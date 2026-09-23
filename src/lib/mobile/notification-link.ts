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
  const truck = path.match(/^\/garagem\/([^/]+)$/);
  if (truck) return `/garagem/${truck[1]}`;
  return undefined;
}