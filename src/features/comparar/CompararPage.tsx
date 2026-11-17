import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { COMPARACION_MAX, COMPARACION_MIN, useComparacion, useJugadores } from "../../api/queries";
import type { Comparacion } from "../../api/types";
import { Cargando, ErrorMensaje, Vacio } from "../../components/ui";
import { formatearPromedio, nombreDeporte } from "../../lib/format";
import { METRICAS_POR_DEPORTE } from "../partidos/metricas";
import { CompararRadar } from "./CompararRadar";

/** `?ids=a,b,c` → unique, non-empty ids in the order given. */
function leerIds(valor: string | null): string[] {
  const ids = (valor ?? "").split(",").map((id) => id.trim());
  return [...new Set(ids.filter(Boolean))];
}

export function CompararPage() {
  const [params, setParams] = useSearchParams();
  const ids = leerIds(params.get("ids"));
  const [texto, setTexto] = useState("");
  const comparacion = useComparacion(ids);
  // Once the selection has a sport, the search only offers players of that sport.
  const deporte = comparacion.data?.deporte;
  const busqueda = useJugadores({ q: texto.trim() || undefined, deporte, page: 1 });

  const actualizarIds = (nuevos: string[]) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nuevos.length > 0) next.set("ids", nuevos.join(","));
        else next.delete("ids");
        return next;
      },
      { replace: true },
    );

  const nombreDe = (id: string) =>
    comparacion.data?.jugadores.find((j) => j.jugador.id === id)?.jugador.nombre ?? id;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Comparar jugadores</h1>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Jugadores seleccionados</h2>
          <span className="text-sm text-slate-500">
            {ids.length} de {COMPARACION_MAX}
          </span>
        </div>
        {ids.length === 0 ? (
          <p className="text-sm text-slate-500">
            Agrega de {COMPARACION_MIN} a {COMPARACION_MAX} jugadores del mismo deporte.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {ids.map((id) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800"
              >
                {nombreDe(id)}
                <button
                  type="button"
                  aria-label={`Quitar ${nombreDe(id)}`}
                  className="text-slate-500 hover:text-red-700"
                  onClick={() => actualizarIds(ids.filter((x) => x !== id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="block text-sm">
          Buscar jugador
          <input
            className="input mt-1 max-w-md"
            type="search"
            placeholder="Nombre del jugador"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </label>
        {busqueda.isPending ? (
          <Cargando />
        ) : busqueda.isError ? (
          <ErrorMensaje error={busqueda.error} />
        ) : busqueda.data.data.length === 0 ? (
          <Vacio texto="Sin resultados." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {busqueda.data.data.map((j) => {
              const yaAgregado = ids.includes(j.id);
              const lleno = ids.length >= COMPARACION_MAX;
              return (
                <li key={j.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm">
                    <span className="font-medium">{j.nombre}</span>
                    <span className="ml-2 text-slate-500">
                      {[j.posicion, j.equipo?.nombre, nombreDeporte(j.deporte)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn"
                    aria-label={`Agregar ${j.nombre}`}
                    disabled={yaAgregado || lleno}
                    title={lleno ? `Máximo ${COMPARACION_MAX} jugadores` : undefined}
                    onClick={() => actualizarIds([...ids, j.id])}
                  >
                    {yaAgregado ? "Agregado" : "Agregar"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Resultado ids={ids} comparacion={comparacion} />
    </div>
  );
}

function Resultado({
  ids,
  comparacion,
}: {
  ids: string[];
  comparacion: ReturnType<typeof useComparacion>;
}) {
  if (ids.length < COMPARACION_MIN) {
    return <Vacio texto={`Elige al menos ${COMPARACION_MIN} jugadores para comparar.`} />;
  }
  if (ids.length > COMPARACION_MAX) {
    return (
      <ErrorMensaje error={new Error(`Se pueden comparar hasta ${COMPARACION_MAX} jugadores.`)} />
    );
  }
  if (comparacion.isPending) return <Cargando />;
  if (comparacion.isError) return <ErrorMensaje error={comparacion.error} />;
  return <Comparativa data={comparacion.data} />;
}

function Comparativa({ data }: { data: Comparacion }) {
  const metricas = METRICAS_POR_DEPORTE[data.deporte].filter((m) =>
    data.jugadores.some((j) => j.promedios[m.clave] !== null && j.promedios[m.clave] !== undefined),
  );

  if (metricas.length === 0) {
    return <Vacio texto="Los jugadores seleccionados no tienen promedios para comparar." />;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Comparación · {nombreDeporte(data.deporte)}</h2>
      <div className="card">
        <CompararRadar
          metricas={metricas}
          jugadores={data.jugadores.map((j) => ({
            id: j.jugador.id,
            nombre: j.jugador.nombre,
            promedios: j.promedios,
          }))}
        />
        <p className="mt-2 text-xs text-slate-500">
          Cada métrica va de 0 a 100 según el máximo entre los jugadores comparados. Sin dato se
          dibuja en 0; los valores reales están en la tabla.
        </p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table aria-label="Promedios comparados" className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Métrica
              </th>
              {data.jugadores.map((j) => (
                <th key={j.jugador.id} scope="col" className="px-3 py-2 text-right font-medium">
                  {j.jugador.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <th scope="row" className="px-3 py-2 text-left font-medium">
                Partidos
              </th>
              {data.jugadores.map((j) => (
                <td key={j.jugador.id} className="px-3 py-2 text-right tabular-nums">
                  {j.partidos}
                </td>
              ))}
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <th scope="row" className="px-3 py-2 text-left font-medium">
                Minutos
              </th>
              {data.jugadores.map((j) => (
                <td key={j.jugador.id} className="px-3 py-2 text-right tabular-nums">
                  {formatearPromedio(j.minutosPromedio)}
                </td>
              ))}
            </tr>
            {metricas.map((m) => (
              <tr key={m.clave} className="border-t border-slate-100 dark:border-slate-800">
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  {m.titulo}
                </th>
                {data.jugadores.map((j) => (
                  <td key={j.jugador.id} className="px-3 py-2 text-right tabular-nums">
                    {formatearPromedio(j.promedios[m.clave])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
