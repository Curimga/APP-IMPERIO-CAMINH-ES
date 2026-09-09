// Status operacionais do caminhão
export type TruckStatus =
  | "disponivel" | "reservado" | "negociacao" | "vendido" | "consignado"
  | "manutencao" | "patio" | "oficina" | "despachante" | "pintura"
  | "interna" | "repasse";

export const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  negociacao: "Negociação",
  vendido: "Vendido",
  consignado: "Consignado",
  manutencao: "Manutenção",
  patio: "Pátio",
  oficina: "Oficina",
  despachante: "Despachante",
  pintura: "Pintura",
  interna: "Interna",
  repasse: "Repasse",
};

// Cores de alto contraste — texto branco sobre fundo saturado para leitura imediata
export const STATUS_TONE: Record<string, string> = {
  disponivel: "bg-emerald-600 text-white border-emerald-700",
  reservado: "bg-violet-600 text-white border-violet-700",
  negociacao: "bg-amber-500 text-black border-amber-600",
  vendido: "bg-sky-600 text-white border-sky-700",
  consignado: "bg-cyan-600 text-white border-cyan-700",
  manutencao: "bg-rose-600 text-white border-rose-700",
  patio: "bg-zinc-700 text-white border-zinc-800",
  oficina: "bg-orange-600 text-white border-orange-700",
  despachante: "bg-blue-600 text-white border-blue-700",
  pintura: "bg-fuchsia-600 text-white border-fuchsia-700",
  interna: "bg-yellow-500 text-black border-yellow-600",
  repasse: "bg-teal-600 text-white border-teal-700",
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([v, label]) => ({ v, label }));
