import { ApiError } from "../../api/client";
import { DEPORTES, type Deporte, type TipoInferencia } from "../../api/types";
import { METRICAS_POR_DEPORTE, type Metrica } from "../partidos/metricas";

const MENSAJES_API: Record<string, string> = {
  NO_ACTIVE_MODEL:
    "No hay un modelo activo para este deporte. Un administrador debe activar uno antes de generar.",
  INSUFFICIENT_DATA: "No hay datos suficientes para generar predicciones de este deporte.",
  PREDICCIONES_UNAVAILABLE:
    "El servicio de predicciones no está disponible en este momento. Intenta más tarde.",
};

/** Friendly text for the prediction errors; any other error keeps its own message. */
export function mensajeError(error: unknown): string {
  if (error instanceof ApiError && MENSAJES_API[error.code]) return MENSAJES_API[error.code]!;
  return error instanceof Error ? error.message : "Error inesperado";
}

/** Model versions trained on generated data end in `-synthetic`. */
export const esSintetico = (version: string) => version.endsWith("-synthetic");

/** Fraction in [0, 1] as a whole percentage ("62%"). */
export const porcentaje = (p: number) => `${Math.round(p * 100)}%`;

const NUMERO = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
export const formatoNumero = (n: number) => NUMERO.format(n);

export const ETIQUETA_TIPO: Record<TipoInferencia, string> = {
  RESULTADO_PARTIDO: "Resultado de partido",
  PROYECCION_JUGADOR: "Proyección de jugador",
};

/** Sport from `?deporte=`, falling back to basquetbol for missing or unknown values. */
export function parseDeporte(valor: string | null): Deporte {
  return DEPORTES.find((d) => d === valor) ?? "BASQUETBOL";
}

/** Positive whole jornada from `?jornada=`, or undefined. */
export function parseJornada(valor: string | null): number | undefined {
  const n = Number(valor);
  return valor && Number.isInteger(n) && n > 0 ? n : undefined;
}

/**
 * Projection metrics are flat with dotted keys (`pase.yardas`), so they are read by exact key,
 * not by walking nested groups.
 */
export function valorProyeccion(metricas: Record<string, number>, clave: string) {
  const v = metricas[clave];
  return typeof v === "number" ? v : undefined;
}

/** Columns of metricas.ts for the sport that appear in at least one projection row. */
export function columnasProyeccion(
  deporte: Deporte,
  filas: { metricas: Record<string, number> }[],
): Metrica[] {
  return METRICAS_POR_DEPORTE[deporte].filter((m) =>
    filas.some((f) => valorProyeccion(f.metricas, m.clave) !== undefined),
  );
}
