import { ApiError } from "../api/client";

/**
 * Field messages from a 400 VALIDATION_ERROR, keyed by dot path (`jugadorId`,
 * `condicion.valor`). Backend details are `[{ path, message }]`, with `path` a string or an array.
 */
export function erroresDeCampo(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return out;
  for (const d of error.details as unknown[]) {
    if (typeof d !== "object" || d === null) continue;
    const { path, message } = d as { path?: unknown; message?: unknown };
    const campo = Array.isArray(path) ? path.join(".") : typeof path === "string" ? path : "";
    if (campo && typeof message === "string" && !(campo in out)) out[campo] = message;
  }
  return out;
}

/** True for 409 Conflict, e.g. adding an element that is already in the list. */
export function esConflicto(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
