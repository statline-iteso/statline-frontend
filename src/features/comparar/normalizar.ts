/**
 * Scales one metric to 0–100 relative to the maximum among the compared players, so metrics with
 * different units can share a radar. Null (never reported) stays null. When some value is negative
 * (e.g. +/- in basketball) the scale starts at the minimum instead of 0, so every value stays in range.
 */
export function normalizar(valores: (number | null)[]): (number | null)[] {
  const reportados = valores.filter((v): v is number => v !== null);
  if (reportados.length === 0) return valores.map(() => null);
  const min = Math.min(0, ...reportados);
  const max = Math.max(...reportados);
  const rango = max - min;
  return valores.map((v) => {
    if (v === null) return null;
    return rango === 0 ? 0 : ((v - min) / rango) * 100;
  });
}
