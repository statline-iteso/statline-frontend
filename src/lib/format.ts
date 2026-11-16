import type { Deporte } from "../api/types";

const NOMBRE_DEPORTE: Record<Deporte, string> = {
  BASQUETBOL: "NBA",
  AMERICANO: "NFL",
  FUTBOL: "Liga MX",
};

export const nombreDeporte = (d: Deporte) => NOMBRE_DEPORTE[d];

const FORMATO = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "sáb, 14 nov, 18:30" in the viewer's time zone. */
export const fechaHora = (iso: string) => FORMATO.format(new Date(iso));

/** Today's date as YYYY-MM-DD in local time (the API filters ?fecha= by UTC day). */
export function hoyIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
