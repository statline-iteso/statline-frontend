import type { CrearAlerta, Deporte, Operador, TipoAlerta } from "../../api/types";
import { METRICAS_POR_DEPORTE } from "../partidos/metricas";

/** Jugador chosen in the form; its sport decides the metric choices. */
export interface JugadorElegido {
  id: string;
  nombre: string;
  deporte: Deporte;
}

export type Objetivo = "JUGADOR" | "EQUIPO";

export interface FormAlerta {
  tipo: TipoAlerta;
  /** Only used by INICIO_PARTIDO: the alert targets a player or a team. */
  objetivo: Objetivo;
  jugador: JugadorElegido | null;
  equipoId: string;
  metrica: string;
  operador: Operador;
  /** Kept as text so the input can be empty or half typed. */
  valor: string;
}

export type CampoAlerta = "jugadorId" | "equipoId" | "metrica" | "valor";
export type ErroresAlerta = Partial<Record<CampoAlerta, string>>;

export const FORM_ALERTA_INICIAL: FormAlerta = {
  tipo: "LESION",
  objetivo: "JUGADOR",
  jugador: null,
  equipoId: "",
  metrica: "",
  operador: ">=",
  valor: "",
};

/**
 * Client-side rules mirroring the backend (CreateAlertaSchema): LESION and UMBRAL need a player,
 * INICIO_PARTIDO a player or a team, UMBRAL a metric of the player's sport and a numeric value.
 */
export function validarAlerta(f: FormAlerta): ErroresAlerta {
  const e: ErroresAlerta = {};
  if (f.tipo === "INICIO_PARTIDO" && f.objetivo === "EQUIPO") {
    if (!f.equipoId) e.equipoId = "Elige un equipo.";
    return e;
  }
  if (!f.jugador) {
    e.jugadorId = "Elige un jugador.";
    return e;
  }
  if (f.tipo !== "UMBRAL") return e;

  const metricas = METRICAS_POR_DEPORTE[f.jugador.deporte];
  if (!metricas.some((m) => m.clave === f.metrica)) e.metrica = "Elige una métrica.";
  if (f.valor.trim() === "" || !Number.isFinite(Number(f.valor))) {
    e.valor = "Indica un número.";
  }
  return e;
}

/** Body for POST /api/alertas. Only the fields the chosen `tipo` uses are sent. Call after validarAlerta. */
export function construirAlerta(f: FormAlerta): CrearAlerta {
  if (f.tipo === "INICIO_PARTIDO" && f.objetivo === "EQUIPO") {
    return { tipo: f.tipo, equipoId: f.equipoId };
  }
  const jugadorId = f.jugador?.id ?? "";
  if (f.tipo === "UMBRAL") {
    return {
      tipo: f.tipo,
      jugadorId,
      condicion: { metrica: f.metrica, operador: f.operador, valor: Number(f.valor) },
    };
  }
  return { tipo: f.tipo, jugadorId };
}

/** Backend field paths (from 400 details) mapped to the form field they belong to. */
export const CAMPOS_SERVIDOR: Record<string, CampoAlerta> = {
  jugadorId: "jugadorId",
  equipoId: "equipoId",
  "condicion.metrica": "metrica",
  "condicion.valor": "valor",
};

export const ETIQUETA_TIPO_ALERTA: Record<TipoAlerta, string> = {
  LESION: "Lesión",
  UMBRAL: "Umbral de métrica",
  INICIO_PARTIDO: "Inicio de partido",
};
