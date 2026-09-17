import { describe, it, expect } from "vitest";
import {
  sortTruckPhotos,
  getTruckCover,
  getTruckCoverPhoto,
  truckPhotoSrc,
  isFinancialNotification,
  type TruckPhoto,
} from "./queries";
import { STATUS_LABEL } from "../truck-status";

/**
 * Testes de paridade CRM ↔ APP.
 *
 * IMPORTANTE: importam as funções REAIS de queries.ts (código de produção).
 * Nenhuma re-implementação, nenhuma cópia, nenhum mock de guarda-chuva.
 * As funções testadas são puras — dependem apenas dos dados de entrada.
 *
 * Regra de capa (idêntica ao CRM):
 *   trucks.truck_photos: p.is_cover=true → primeira; senão, primeira da lista.
 */

describe("sortTruckPhotos — ordem da capa (fonte única não muda dados)", () => {
  const photo = (over: Partial<TruckPhoto> = {}): TruckPhoto => ({
    id: "p",
    url: "https://a.jpg",
    is_cover: false,
    position: 0,
    created_at: "2026-09-08T10:00:00",
    ...over,
  });

  it("is_cover=true → vira a primeira da lista", () => {
    const sorted = sortTruckPhotos([
      photo({ id: "1", url: "https://x.jpg" }),
      photo({ id: "2", url: "https://y.jpg", is_cover: true }),
      photo({ id: "3", url: "https://z.jpg" }),
    ]);
    expect(sorted[0].id).toBe("2");
    expect(sorted[0].is_cover).toBe(true);
  });

  it("filtra fotos sem URL antes de ordenar (placeholder não quebra)", () => {
    const sorted = sortTruckPhotos([
      photo({ id: "1", url: "" }),
      photo({ id: "2", url: "https://y.jpg" }),
    ]);
    expect(sorted.length).toBe(1);
    expect(sorted[0].id).toBe("2");
  });

  it("lista vazia → array vazio", () => {
    expect(sortTruckPhotos([])).toEqual([]);
  });
});

describe("getTruckCover / getTruckCoverPhoto — URL da capa (mesma regra do CRM)", () => {
  const truck = {
    truck_photos: [
      { id: "1", url: "https://a.jpg", is_cover: false, position: 0, created_at: "x" },
      { id: "2", url: "https://b.jpg", is_cover: true, position: 1, created_at: "y" },
    ],
  };

  it("getTruckCoverPhoto → foto marcada como capa", () => {
    expect(getTruckCoverPhoto(truck)?.id).toBe("2");
  });

  it("getTruckCover → url da capa", () => {
    expect(getTruckCover(truck)).toBe("https://b.jpg");
  });

  it("sem fotos → null (placeholder, não quebra)", () => {
    expect(getTruckCover(null)).toBeNull();
    expect(getTruckCover({ truck_photos: [] })).toBeNull();
  });

  it("foto is_cover=true sem URL → cai para próxima com URL (app melhora o CRM)", () => {
    const t = {
      truck_photos: [
        { id: "1", url: "", is_cover: true, position: 0, created_at: "x" },
        { id: "2", url: "https://ok.jpg", is_cover: false, position: 1, created_at: "y" },
      ],
    };
    expect(getTruckCover(t)).toBe("https://ok.jpg");
  });
});

describe("truckPhotoSrc — cache-busting por ?v= (sem quebrar URLs assinadas)", () => {
  it("injeta ?v= em URL pública", () => {
    const src = truckPhotoSrc("https://x.supabase.co/photo.jpg", "abc");
    expect(src).toContain("v=abc");
  });

  it("preserva URLs já assinadas (não vaza segredo pela querystring)", () => {
    const signed = "https://x.supabase.co/photo.jpg?token=signed&X-Amz-Signature=zz";
    expect(truckPhotoSrc(signed, "abc")).toBe(signed);
  });

  it("null/undefined → undefined", () => {
    expect(truckPhotoSrc(null)).toBeUndefined();
    expect(truckPhotoSrc(undefined)).toBeUndefined();
  });
});

describe("isFinancialNotification — apenas Executivo vê financeiro", () => {
  it("links /financeiro → financeira", () => {
    expect(isFinancialNotification({ title: "x", link: "/financeiro/contas" })).toBe(true);
  });

  it("menção a R$/pagamento/vencimento → financeira", () => {
    expect(isFinancialNotification({ title: "Conta a pagar", message: "R$ 1.200 vence hoje" })).toBe(true);
    expect(isFinancialNotification({ title: "Resumo", message: "Boleto pago" })).toBe(true);
  });

  it("texto operacional → não financeira", () => {
    expect(isFinancialNotification({ title: "Caminhão chegou", message: "BBY5H79 no pátio" })).toBe(false);
    expect(isFinancialNotification({ title: "Serviço em andamento", link: "/servicos/1" })).toBe(false);
  });
});

describe("status display — trucks.status é a única fonte (sem transformação)", () => {
  it("db disponivel → exibe 'Disponível'", () => {
    expect(STATUS_LABEL["disponivel"]).toBe("Disponível");
  });
  it("db patio → exibe 'Pátio'", () => {
    expect(STATUS_LABEL["patio"]).toBe("Pátio");
  });
});
