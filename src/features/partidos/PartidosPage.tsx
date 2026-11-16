import { useSearchParams } from "react-router-dom";
import { usePartidos } from "../../api/queries";
import type { Partido } from "../../api/types";
import { Cargando, ErrorMensaje, Paginacion, Vacio } from "../../components/ui";
import { fechaHora, hoyIso } from "../../lib/format";

const ETIQUETA_ESTATUS: Record<Partido["estatus"], string> = {
  PROGRAMADO: "Programado",
  EN_JUEGO: "En juego",
  FINALIZADO: "Final",
  POSPUESTO: "Pospuesto",
  CANCELADO: "Cancelado",
};

export function PartidosPage() {
  const [params, setParams] = useSearchParams();
  const fecha = params.get("fecha") ?? hoyIso();
  const page = Number(params.get("page") ?? "1");
  const q = usePartidos({ fecha, page });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Partidos</h1>
        <label className="text-sm">
          Fecha
          <input
            className="input mt-1"
            type="date"
            value={fecha}
            onChange={(e) => setParams({ fecha: e.target.value, page: "1" })}
          />
        </label>
      </div>
      {q.isPending ? (
        <Cargando />
      ) : q.isError ? (
        <ErrorMensaje error={q.error} />
      ) : q.data.data.length === 0 ? (
        <Vacio texto="No hay partidos en esta fecha." />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {q.data.data.map((p) => (
              <li key={p.id} className="card">
                <div className="mb-2 flex justify-between text-xs text-slate-500">
                  <span>{fechaHora(p.fecha)}</span>
                  <span>
                    {p.jornada ? `Jornada ${p.jornada} · ` : ""}
                    {ETIQUETA_ESTATUS[p.estatus]}
                  </span>
                </div>
                <Marcador partido={p} />
              </li>
            ))}
          </ul>
          <Paginacion
            page={q.data.page}
            pageSize={q.data.pageSize}
            total={q.data.total}
            onChange={(n) => setParams({ fecha, page: String(n) })}
          />
        </>
      )}
    </div>
  );
}

function Marcador({ partido: p }: { partido: Partido }) {
  const conMarcador = p.marcadorLocal !== null && p.marcadorVisita !== null;
  return (
    <div className="space-y-1 text-sm">
      {(
        [
          [p.local, p.marcadorLocal],
          [p.visita, p.marcadorVisita],
        ] as const
      ).map(([equipo, pts]) => (
        <div key={equipo.id} className="flex justify-between">
          <span className="font-medium">{equipo.nombre}</span>
          <span className="tabular-nums">{conMarcador ? pts : "–"}</span>
        </div>
      ))}
      {/* TODO(SL-44): link to the box score view (GET /api/partidos/:id/boxscore). */}
    </div>
  );
}
