import { describe, expect, it } from "vitest";
import type { EstadisticaLinea } from "../../api/types";
import { leerMetrica, METRICAS_POR_DEPORTE, topLideres, type LineaDeEquipo } from "./metricas";

const equipo = { id: "e1", nombre: "Denver Nuggets", abreviatura: "DEN" };

const fila = (id: string, nombre: string, metricas: Record<string, unknown>): LineaDeEquipo => ({
  equipo,
  linea: {
    id,
    partidoId: "p1",
    jugadorId: id,
    equipoId: "e1",
    deporte: "BASQUETBOL",
    minutos: null,
    metricas,
    jugador: { id, nombre, posicion: null },
  } as EstadisticaLinea,
});

describe("leerMetrica", () => {
  it("reads flat and nested keys and ignores non-numbers", () => {
    expect(leerMetrica({ puntos: 10 }, "puntos")).toBe(10);
    expect(leerMetrica({ pase: { yardas: 250 } }, "pase.yardas")).toBe(250);
    expect(leerMetrica({ pase: { yardas: "250" } }, "pase.yardas")).toBeUndefined();
    expect(leerMetrica({ pase: null }, "pase.yardas")).toBeUndefined();
    expect(leerMetrica({ puntos: 1 }, "rebotes")).toBeUndefined();
  });
});

describe("topLideres", () => {
  it("sorts descending, skips players without the metric and keeps five", () => {
    const filas = [
      fila("a", "A", { puntos: 3 }),
      fila("b", "B", { puntos: 9 }),
      fila("c", "C", {}),
      fila("d", "D", { puntos: 7 }),
      fila("e", "E", { puntos: 1 }),
      fila("f", "F", { puntos: 5 }),
      fila("g", "G", { puntos: 8 }),
    ];
    const top = topLideres(filas, METRICAS_POR_DEPORTE.BASQUETBOL[0]!);
    expect(top.map((l) => l.nombre)).toEqual(["B", "G", "D", "F", "A"]);
    expect(top[0]).toEqual({ id: "b", nombre: "B", equipo: "DEN", valor: 9 });
  });

  it("falls back to the full name when there is no abbreviation", () => {
    const filas = [{ ...fila("a", "A", { puntos: 1 }), equipo: { ...equipo, abreviatura: null } }];
    expect(topLideres(filas, METRICAS_POR_DEPORTE.BASQUETBOL[0]!)[0]!.equipo).toBe(
      "Denver Nuggets",
    );
  });
});
