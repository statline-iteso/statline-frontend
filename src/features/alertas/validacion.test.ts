import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import { erroresDeCampo, esConflicto } from "../../lib/errores";
import { construirAlerta, FORM_ALERTA_INICIAL, validarAlerta, type FormAlerta } from "./validacion";

const jugador = { id: "j1", nombre: "LeBron James", deporte: "BASQUETBOL" as const };
const base = (extra: Partial<FormAlerta>): FormAlerta => ({ ...FORM_ALERTA_INICIAL, ...extra });

describe("validarAlerta", () => {
  it("LESION needs a jugador and nothing else", () => {
    expect(validarAlerta(base({ tipo: "LESION" }))).toEqual({ jugadorId: "Elige un jugador." });
    expect(validarAlerta(base({ tipo: "LESION", jugador }))).toEqual({});
  });

  it("INICIO_PARTIDO needs a jugador when aimed at one, an equipo when aimed at one", () => {
    expect(validarAlerta(base({ tipo: "INICIO_PARTIDO" }))).toEqual({
      jugadorId: "Elige un jugador.",
    });
    expect(validarAlerta(base({ tipo: "INICIO_PARTIDO", jugador }))).toEqual({});
    expect(validarAlerta(base({ tipo: "INICIO_PARTIDO", objetivo: "EQUIPO" }))).toEqual({
      equipoId: "Elige un equipo.",
    });
    expect(
      validarAlerta(base({ tipo: "INICIO_PARTIDO", objetivo: "EQUIPO", equipoId: "e1" })),
    ).toEqual({});
  });

  it("UMBRAL needs a jugador, a metric of that jugador's sport and a number", () => {
    expect(validarAlerta(base({ tipo: "UMBRAL" }))).toEqual({ jugadorId: "Elige un jugador." });
    expect(validarAlerta(base({ tipo: "UMBRAL", jugador, valor: "10" }))).toEqual({
      metrica: "Elige una métrica.",
    });
    expect(validarAlerta(base({ tipo: "UMBRAL", jugador, metrica: "goles", valor: "10" }))).toEqual(
      { metrica: "Elige una métrica." },
    );
    expect(validarAlerta(base({ tipo: "UMBRAL", jugador, metrica: "puntos", valor: "" }))).toEqual({
      valor: "Indica un número.",
    });
    expect(
      validarAlerta(base({ tipo: "UMBRAL", jugador, metrica: "puntos", valor: "abc" })),
    ).toEqual({ valor: "Indica un número." });
    expect(
      validarAlerta(base({ tipo: "UMBRAL", jugador, metrica: "puntos", valor: "-2.5" })),
    ).toEqual({});
  });
});

describe("construirAlerta", () => {
  it("sends only the fields the tipo uses", () => {
    expect(construirAlerta(base({ tipo: "LESION", jugador }))).toEqual({
      tipo: "LESION",
      jugadorId: "j1",
    });
    expect(
      construirAlerta(base({ tipo: "INICIO_PARTIDO", objetivo: "EQUIPO", equipoId: "e1" })),
    ).toEqual({ tipo: "INICIO_PARTIDO", equipoId: "e1" });
    expect(
      construirAlerta(
        base({ tipo: "UMBRAL", jugador, metrica: "pase.yardas", operador: ">=", valor: "250" }),
      ),
    ).toEqual({
      tipo: "UMBRAL",
      jugadorId: "j1",
      condicion: { metrica: "pase.yardas", operador: ">=", valor: 250 },
    });
  });
});

describe("error helpers", () => {
  it("maps backend details to dot-path fields", () => {
    const err = new ApiError(400, "VALIDATION_ERROR", "Solicitud inválida", [
      { path: ["condicion", "valor"], message: "Esperado número" },
      { path: "jugadorId", message: "El jugador no existe" },
      { path: [], message: "ignorado" },
      "no es objeto",
    ]);
    expect(erroresDeCampo(err)).toEqual({
      "condicion.valor": "Esperado número",
      jugadorId: "El jugador no existe",
    });
    expect(erroresDeCampo(new Error("x"))).toEqual({});
    expect(erroresDeCampo(new ApiError(400, "X", "m"))).toEqual({});
  });

  it("recognises 409 conflicts only", () => {
    expect(esConflicto(new ApiError(409, "CONFLICT", "dup"))).toBe(true);
    expect(esConflicto(new ApiError(404, "NOT_FOUND", "no"))).toBe(false);
    expect(esConflicto(undefined)).toBe(false);
  });
});
