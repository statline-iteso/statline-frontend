import { Link } from "react-router-dom";
import {
  useGenerarProyecciones,
  usePrecisionProyecciones,
  useProyecciones,
} from "../../api/queries";
import type { Deporte, PrecisionProyeccion, ProyeccionJugador } from "../../api/types";
import { useAuth } from "../../auth/useAuth";
import { puedeGenerar } from "../../auth/roles";
import { Cargando, Paginacion, Vacio } from "../../components/ui";
import { fechaHora } from "../../lib/format";
import { METRICAS_POR_DEPORTE } from "../partidos/metricas";
import { Dato, ErrorPronostico, InsigniaSintetico } from "./Componentes";
import { GenerarBoton } from "./GenerarBoton";
import { columnasProyeccion, formatoNumero, valorProyeccion } from "./util";

export function JugadoresProyecciones({
  deporte,
  jornada,
  page,
  onPage,
}: {
  deporte: Deporte;
  jornada: number | undefined;
  page: number;
  onPage: (n: number) => void;
}) {
  const { usuario } = useAuth();
  const lista = useProyecciones({ deporte, jornada, page });
  const precision = usePrecisionProyecciones(deporte);
  const generar = useGenerarProyecciones();

  return (
    <div className="space-y-6">
      {precision.isPending ? (
        <Cargando />
      ) : precision.isError ? (
        <ErrorPronostico error={precision.error} />
      ) : (
        <PrecisionProyeccionCard precision={precision.data} />
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Proyecciones de jugadores</h2>
          {puedeGenerar(usuario?.rol) && (
            <GenerarBoton
              etiqueta="Generar proyecciones"
              pendiente={generar.isPending}
              onClick={() => generar.mutate(jornada ? { deporte, jornada } : { deporte })}
              resultado={
                generar.isSuccess ? (
                  <>Se generaron {generar.data.generados} proyecciones.</>
                ) : generar.isError ? (
                  <ErrorPronostico error={generar.error} />
                ) : null
              }
            />
          )}
        </div>

        {lista.isPending ? (
          <Cargando />
        ) : lista.isError ? (
          <ErrorPronostico error={lista.error} />
        ) : (
          <ProyeccionesTabla
            deporte={deporte}
            // The endpoint is not filtered by sport: keep the rows whose model belongs to it.
            // The API filters by sport; this guard only drops rows from a mismatched model.
            filas={lista.data.data.filter((f) => f.modelo.deporte === deporte)}
            total={lista.data.total}
            page={lista.data.page}
            pageSize={lista.data.pageSize}
            onPage={onPage}
          />
        )}
      </section>
    </div>
  );
}

function ProyeccionesTabla({
  deporte,
  filas,
  total,
  page,
  pageSize,
  onPage,
}: {
  deporte: Deporte;
  filas: ProyeccionJugador[];
  total: number;
  page: number;
  pageSize: number;
  onPage: (n: number) => void;
}) {
  if (filas.length === 0) return <Vacio texto="Aún no hay proyecciones para esta selección." />;
  const columnas = columnasProyeccion(deporte, filas);
  return (
    <>
      <div className="card overflow-x-auto p-0">
        <table aria-label="Proyecciones de jugadores" className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Jugador
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Partido
              </th>
              {columnas.map((m) => (
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
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-slate-100 dark:border-slate-800">
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  <Link
                    to={`/jugadores/${f.jugadorId}`}
                    className="text-sky-700 hover:underline dark:text-sky-400"
                  >
                    {f.jugador.nombre}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    {[f.jugador.posicion, f.modelo.version].filter(Boolean).join(" · ")}
                  </span>
                </th>
                <td className="px-3 py-2">
                  <Link
                    to={`/partidos/${f.partidoId}`}
                    className="text-sky-700 hover:underline dark:text-sky-400"
                  >
                    {f.partido.local.abreviatura ?? f.partido.local.nombre} vs{" "}
                    {f.partido.visita.abreviatura ?? f.partido.visita.nombre}
                  </Link>
                  <div className="text-xs text-slate-500">{fechaHora(f.partido.fecha)}</div>
                </td>
                {columnas.map((m) => {
                  const v = valorProyeccion(f.metricas, m.clave);
                  return (
                    <td key={m.clave} className="px-3 py-2 text-right tabular-nums">
                      {v === undefined ? "–" : formatoNumero(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion page={page} pageSize={pageSize} total={total} onChange={onPage} />
    </>
  );
}

export function PrecisionProyeccionCard({ precision: r }: { precision: PrecisionProyeccion }) {
  const titulos = new Map(METRICAS_POR_DEPORTE[r.deporte].map((m) => [m.clave, m.titulo]));
  const objetivos = Object.entries(r.precision.porObjetivo);
  return (
    <section aria-labelledby="precision-proyecciones" className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="precision-proyecciones" className="text-lg font-semibold">
          Precisión del modelo
        </h2>
        <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Modelo {r.modelo.version}
          <InsigniaSintetico version={r.modelo.version} />
        </span>
      </div>
      <Dato etiqueta="Jugadores evaluados">{r.precision.n}</Dato>
      {objetivos.length === 0 ? (
        <Vacio texto="Sin partidos evaluados todavía." />
      ) : (
        <table aria-label="Error absoluto medio por objetivo" className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th scope="col" className="py-1 font-medium">
                Objetivo
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Muestra
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                MAE
              </th>
            </tr>
          </thead>
          <tbody>
            {objetivos.map(([clave, p]) => (
              <tr key={clave} className="border-t border-slate-100 dark:border-slate-800">
                <th scope="row" className="py-1 text-left font-normal">
                  {titulos.get(clave) ?? clave}
                </th>
                <td className="py-1 text-right tabular-nums">{p.n}</td>
                <td className="py-1 text-right tabular-nums">
                  {p.mae === null ? "Sin datos" : p.mae.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
