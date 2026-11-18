import { Link } from "react-router-dom";
import { useGenerarPronosticos, usePrecisionPronosticos, usePronosticos } from "../../api/queries";
import type { Deporte, PrecisionResultado, PronosticoPartido } from "../../api/types";
import { Cargando, Paginacion, Vacio } from "../../components/ui";
import { useAuth } from "../../auth/useAuth";
import { puedeGenerar } from "../../auth/roles";
import { ETIQUETA_ESTATUS_PARTIDO, fechaHora } from "../../lib/format";
import { Dato, ErrorPronostico, InsigniaSintetico } from "./Componentes";
import { ProbBarra } from "./ProbBarra";
import { formatoNumero, porcentaje } from "./util";
import { GenerarBoton } from "./GenerarBoton";

export function PartidosPronosticos({
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
  const lista = usePronosticos({ deporte, jornada, page });
  const precision = usePrecisionPronosticos(deporte);
  const generar = useGenerarPronosticos();

  return (
    <div className="space-y-6">
      <PrecisionCard q={precision} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Pronósticos por partido</h2>
          {puedeGenerar(usuario?.rol) && (
            <GenerarBoton
              etiqueta="Generar pronósticos"
              pendiente={generar.isPending}
              onClick={() => generar.mutate(jornada ? { deporte, jornada } : { deporte })}
              resultado={
                generar.isSuccess ? (
                  <>Se generaron {generar.data.generados} pronósticos.</>
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
        ) : lista.data.data.length === 0 ? (
          <Vacio texto="Aún no hay pronósticos para esta selección." />
        ) : (
          <>
            <ul className="grid gap-3 md:grid-cols-2">
              {lista.data.data.map((p) => (
                <li key={p.id}>
                  <PronosticoCard pronostico={p} conEmpate={deporte === "FUTBOL"} />
                </li>
              ))}
            </ul>
            <Paginacion
              page={lista.data.page}
              pageSize={lista.data.pageSize}
              total={lista.data.total}
              onChange={onPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

function PronosticoCard({
  pronostico: p,
  conEmpate,
}: {
  pronostico: PronosticoPartido;
  conEmpate: boolean;
}) {
  const { partido: g } = p;
  const esperado =
    p.marcadorEsperadoLocal !== null && p.marcadorEsperadoVisita !== null
      ? `${formatoNumero(p.marcadorEsperadoLocal)} – ${formatoNumero(p.marcadorEsperadoVisita)}`
      : "–";
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
        <span>{fechaHora(g.fecha)}</span>
        <span>
          {g.jornada ? `Jornada ${g.jornada} · ` : ""}
          {ETIQUETA_ESTATUS_PARTIDO[g.estatus]}
        </span>
      </div>
      <h3 className="font-semibold">
        {g.local.nombre} <span className="font-normal text-slate-500">vs</span> {g.visita.nombre}
      </h3>
      <ProbBarra
        equipoLocal={g.local.abreviatura ?? g.local.nombre}
        equipoVisita={g.visita.abreviatura ?? g.visita.nombre}
        probLocal={p.probLocal}
        probEmpate={p.probEmpate}
        probVisita={p.probVisita}
        conEmpate={conEmpate}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          Marcador esperado: <span className="font-medium tabular-nums">{esperado}</span>
        </span>
        <span className="flex items-center gap-2">
          <InsigniaSintetico version={p.modelo.version} />
          <Link to={`/partidos/${g.id}`} className="text-sky-700 underline dark:text-sky-400">
            Ver partido
          </Link>
        </span>
      </div>
    </article>
  );
}

function PrecisionCard({ q }: { q: ReturnType<typeof usePrecisionPronosticos> }) {
  if (q.isPending) return <Cargando />;
  if (q.isError) return <ErrorPronostico error={q.error} />;
  return <PrecisionResultadoCard precision={q.data} />;
}

export function PrecisionResultadoCard({ precision: r }: { precision: PrecisionResultado }) {
  const { n, accuracy, logLoss } = r.precision;
  return (
    <section aria-labelledby="precision-pronosticos" className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="precision-pronosticos" className="text-lg font-semibold">
          Precisión del modelo
        </h2>
        <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Modelo {r.modelo.version}
          <InsigniaSintetico version={r.modelo.version} />
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Dato etiqueta="Acierto">{accuracy === null ? "Sin datos" : porcentaje(accuracy)}</Dato>
        <Dato etiqueta="Log-loss">{logLoss === null ? "Sin datos" : logLoss.toFixed(3)}</Dato>
        <Dato etiqueta="Partidos evaluados">{n}</Dato>
        <Dato etiqueta={`Métrica del modelo (${r.modelo.nombreMetrica})`}>
          {r.modelo.metricaError.toFixed(3)}
        </Dato>
      </dl>
    </section>
  );
}
