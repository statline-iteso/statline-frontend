import { usePromedios } from "../../api/queries";
import type { Jugador } from "../../api/types";
import { Cargando, ErrorMensaje, Vacio } from "../../components/ui";
import { formatearPromedio } from "../../lib/format";
import { METRICAS_POR_DEPORTE } from "../partidos/metricas";

/** Season averages of the player, one row per metric of the player's sport. */
export function PromediosPanel({ jugador }: { jugador: Jugador }) {
  const q = usePromedios(jugador.id);
  const metricas = METRICAS_POR_DEPORTE[jugador.deporte];

  if (q.isPending) return <Cargando />;
  if (q.isError) return <ErrorMensaje error={q.error} />;
  const p = q.data;

  if (p.partidos === 0) {
    return (
      <section className="card">
        <h2 className="text-lg font-semibold">Promedios</h2>
        <Vacio texto="Aún no hay partidos finalizados con estadísticas para este jugador." />
      </section>
    );
  }

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Promedios</h2>
        <p className="text-sm text-slate-500">
          {p.partidos} {p.partidos === 1 ? "partido" : "partidos"} · MIN{" "}
          {formatearPromedio(p.minutosPromedio)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table aria-label="Promedios por partido" className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th scope="col" className="py-2 font-medium">
                Métrica
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Promedio
              </th>
            </tr>
          </thead>
          <tbody>
            {metricas.map((m) => (
              <tr key={m.clave} className="border-t border-slate-100 dark:border-slate-800">
                <th scope="row" className="py-2 text-left font-medium">
                  {m.titulo}
                </th>
                <td className="py-2 text-right tabular-nums">
                  {formatearPromedio(p.promedios[m.clave])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
