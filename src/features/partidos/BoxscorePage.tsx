import { Link, useParams, useSearchParams } from "react-router-dom";
import { useBoxscore } from "../../api/queries";
import type { Boxscore, EquipoRef, EstadisticaLinea } from "../../api/types";
import { Cargando, DeporteTag, ErrorMensaje, Vacio } from "../../components/ui";
import { ETIQUETA_ESTATUS_PARTIDO, fechaHora } from "../../lib/format";
import { LideresChart } from "./LideresChart";
import { leerMetrica, METRICAS_POR_DEPORTE, topLideres, type Metrica } from "./metricas";

export function BoxscorePage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const q = useBoxscore(id);

  if (q.isPending) return <Cargando />;
  if (q.isError) return <ErrorMensaje error={q.error} />;

  return (
    <Contenido
      boxscore={q.data}
      metricaClave={params.get("metrica") ?? undefined}
      onMetrica={(clave) =>
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("metrica", clave);
            return next;
          },
          { replace: true },
        )
      }
    />
  );
}

function Contenido({
  boxscore: b,
  metricaClave,
  onMetrica,
}: {
  boxscore: Boxscore;
  metricaClave: string | undefined;
  onMetrica: (clave: string) => void;
}) {
  const p = b.partido;
  // The boxscore does not carry the sport; every line does. No lines means nothing to show.
  const deporte = [...b.local, ...b.visita][0]?.deporte;
  const metricas = deporte ? METRICAS_POR_DEPORTE[deporte] : [];
  const metrica: Metrica | undefined =
    metricas.find((m) => m.clave === metricaClave) ?? metricas[0];

  const filas = [
    ...b.local.map((linea) => ({ linea, equipo: p.local })),
    ...b.visita.map((linea) => ({ linea, equipo: p.visita })),
  ];
  const lideres = metrica ? topLideres(filas, metrica) : [];

  return (
    <div className="space-y-6">
      <Link to="/partidos" className="text-sm text-sky-700 underline dark:text-sky-400">
        ← Partidos
      </Link>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{fechaHora(p.fecha)}</span>
          <span>
            {p.jornada ? `Jornada ${p.jornada} · ` : ""}
            {ETIQUETA_ESTATUS_PARTIDO[p.estatus]}
          </span>
        </div>
        <h1 className="sr-only">Boxscore</h1>
        <div className="grid grid-cols-3 items-center text-center">
          <Marcador equipo={p.local} puntos={p.marcadorLocal} />
          <span className="text-sm text-slate-500">vs</span>
          <Marcador equipo={p.visita} puntos={p.marcadorVisita} />
        </div>
        {deporte && (
          <div>
            <DeporteTag deporte={deporte} />
          </div>
        )}
      </section>

      {!deporte || !metrica ? (
        <Vacio texto="Aún no hay estadísticas de jugadores para este partido." />
      ) : (
        <>
          <section className="card space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-lg font-semibold">Líderes · Top 5</h2>
              <label className="text-sm">
                Métrica
                <select
                  className="input mt-1 sm:w-64"
                  value={metrica.clave}
                  onChange={(e) => onMetrica(e.target.value)}
                >
                  {metricas.map((m) => (
                    <option key={m.clave} value={m.clave}>
                      {m.titulo}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {lideres.length === 0 ? (
              <Vacio texto="Ningún jugador tiene registrada esta métrica." />
            ) : (
              <LideresChart lideres={lideres} titulo={metrica.titulo} />
            )}
          </section>

          <TablaEquipo equipo={p.local} lineas={b.local} metricas={metricas} />
          <TablaEquipo equipo={p.visita} lineas={b.visita} metricas={metricas} />
        </>
      )}
    </div>
  );
}

function Marcador({ equipo, puntos }: { equipo: EquipoRef; puntos: number | null }) {
  return (
    <div>
      <p className="font-semibold">{equipo.nombre}</p>
      <p className="text-3xl font-bold tabular-nums">{puntos ?? "–"}</p>
    </div>
  );
}

function TablaEquipo({
  equipo,
  lineas,
  metricas,
}: {
  equipo: EquipoRef;
  lineas: EstadisticaLinea[];
  metricas: Metrica[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{equipo.nombre}</h2>
      {lineas.length === 0 ? (
        <Vacio texto="Sin estadísticas para este equipo." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table aria-label={`Estadísticas de ${equipo.nombre}`} className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Jugador
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  MIN
                </th>
                {metricas.map((m) => (
                  <th
                    key={m.clave}
                    scope="col"
                    title={m.titulo}
                    className="px-3 py-2 text-right font-medium"
                  >
                    {m.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    <Link
                      to={`/jugadores/${l.jugadorId}`}
                      className="text-sky-700 hover:underline dark:text-sky-400"
                    >
                      {l.jugador.nombre}
                    </Link>
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums">{l.minutos ?? "–"}</td>
                  {metricas.map((m) => (
                    <td key={m.clave} className="px-3 py-2 text-right tabular-nums">
                      {leerMetrica(l.metricas, m.clave) ?? "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
