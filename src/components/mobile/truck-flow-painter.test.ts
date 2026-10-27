// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { floodFill } from "@/lib/mobile/truck-flow-painter";

class FakeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height ?? 0;
    }
  }
}

(globalThis as unknown as { ImageData: typeof FakeImageData }).ImageData = FakeImageData;

function drawing() {
  const image = new ImageData(9, 5);
  image.data.fill(255);
  for (let x = 0; x < 9; x += 1) {
    for (const y of [0, 4]) {
      const index = (y * 9 + x) * 4;
      image.data.set([0, 0, 0, 255], index);
    }
  }
  for (let y = 0; y < 5; y += 1) {
    for (const x of [0, 4, 8]) {
      const index = (y * 9 + x) * 4;
      image.data.set([0, 0, 0, 255], index);
    }
  }
  return image;
}

describe("floodFill da pintura do fluxo", () => {
  it("preenche apenas a região fechada tocada", () => {
    const result = floodFill(drawing(), 2, 2, [220, 38, 38, 255]);
    expect(result.changed).toBe(true);
    expect(Array.from(result.image.data.slice((2 * 9 + 2) * 4, (2 * 9 + 2) * 4 + 3))).toEqual([220, 38, 38]);
    expect(Array.from(result.image.data.slice((2 * 9 + 6) * 4, (2 * 9 + 6) * 4 + 3))).toEqual([255, 255, 255]);
    expect(Array.from(result.image.data.slice((2 * 9 + 4) * 4, (2 * 9 + 4) * 4 + 3))).toEqual([0, 0, 0]);
  });

  it("recusa área aberta grande para evitar vazamento", () => {
    const image = new ImageData(20, 20);
    image.data.fill(255);
    const result = floodFill(image, 10, 10, [37, 99, 235, 255]);
    expect(result.changed).toBe(false);
  });

  it("permite uma região interna grande quando ela continua fechada", () => {
    const image = new ImageData(20, 20);
    image.data.fill(255);
    for (let x = 2; x < 18; x += 1) {
      for (const y of [2, 17]) image.data.set([0, 0, 0, 255], (y * 20 + x) * 4);
    }
    for (let y = 2; y < 18; y += 1) {
      for (const x of [2, 17]) image.data.set([0, 0, 0, 255], (y * 20 + x) * 4);
    }
    expect(floodFill(image, 10, 10, [37, 99, 235, 255]).changed).toBe(true);
  });

  it("não pinta contornos pretos", () => {
    const result = floodFill(drawing(), 0, 0, [22, 163, 74, 255]);
    expect(result.changed).toBe(false);
  });
});
