import { useJugador, useEquipos } from "../api/queries";

const corto = (id: string) => `${id.slice(0, 8)}…`;

/** Player name for an id; falls back to a short id while loading or when the lookup fails. */
export function NombreJugador({ id }: { id: string }) {
  const q = useJugador(id);
  if (q.isError) return <>{corto(id)}</>;
  return <>{q.data?.nombre ?? "…"}</>;
}

/** Team name for an id, read from the (cached) team list. */
export function NombreEquipo({ id }: { id: string }) {
  const q = useEquipos();
  return <>{q.data?.data.find((e) => e.id === id)?.nombre ?? corto(id)}</>;
}
