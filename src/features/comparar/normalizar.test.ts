import { describe, expect, it } from "vitest";
import { normalizar } from "./normalizar";

describe("normalizar", () => {
  it("scales to 0-100 relative to the maximum when no value is negative", () => {
    expect(normalizar([10, 20, 5])).toEqual([50, 100, 25]);
  });

  it("keeps nulls as null and ignores them for the scale", () => {
    expect(normalizar([null, 8, 4])).toEqual([null, 100, 50]);
  });

  it("returns all nulls when nobody reported the metric", () => {
    expect(normalizar([null, null])).toEqual([null, null]);
  });

  it("gives 0 to every player when all values are zero", () => {
    expect(normalizar([0, 0])).toEqual([0, 0]);
  });

  it("starts the scale at the minimum when values are negative", () => {
    expect(normalizar([-5, 0, 10])).toEqual([0, pctEsperado(5, 15), 100]);
  });
});

const pctEsperado = (a: number, rango: number) => (a / rango) * 100;
