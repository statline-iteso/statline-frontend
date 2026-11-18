import { useEffect, useState } from "react";
import { useJugadores } from "../api/queries";
import type { Jugador } from "../api/types";
import { ErrorMensaje } from "./ui";

/**
 * Search box over GET /api/jugadores. Each result gets a button that calls `onSeleccionar`.
 * The search text is local to the picker, not a list filter, so it does not go in the URL.
 */
export function SelectorJugador({
  onSeleccionar,
  accion,
  id,
}: {
  onSeleccionar: (j: Jugador) => void;
  /** Button label, e.g. "Agregar" or "Elegir". */
  accion: string;
  id?: string;
}) {
  const [texto, setTexto] = useState("");
  const [buscado, setBuscado] = useState("");
  // Debounce: one request per pause in typing, not per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setBuscado(texto), 300);
    return () => clearTimeout(t);
  }, [texto]);
  const q = buscado.trim() || undefined;
  const jugadores = useJugadores({ q, page: 1 });

  return (
    <div className="space-y-2">
      <label className="block text-sm">
        Buscar jugador
        <input
          id={id}
          className="input mt-1"
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre del jugador"
        />
      </label>
      {jugadores.isPending ? (
        <p role="status" className="text-sm text-slate-500">
          Buscando…
        </p>
      ) : jugadores.isError ? (
        <ErrorMensaje error={jugadores.error} />
      ) : jugadores.data.data.length === 0 ? (
        <p className="text-sm text-slate-500">Sin jugadores que coincidan.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {jugadores.data.data.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                {j.nombre}
                <span className="ml-2 text-slate-500">{j.equipo?.nombre ?? "Agente libre"}</span>
              </span>
              <button
                type="button"
                className="btn !px-3 !py-1"
                aria-label={`${accion} ${j.nombre}`}
                onClick={() => onSeleccionar(j)}
              >
                {accion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
