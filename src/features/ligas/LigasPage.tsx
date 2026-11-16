import { useState } from "react";
import { usePosiciones, useLigas } from "../../api/queries";
import type { Deporte, Liga } from "../../api/types";
import { Cargando, DeporteTag, ErrorMensaje, Vacio } from "../../components/ui";

export function LigasPage() {
  const ligas = useLigas();
  const [seleccion, setSeleccion] = useState<string | undefined>();

  if (ligas.isPending) return <Cargando />;
  if (ligas.isError) return <ErrorMensaje error={ligas.error} />;

  const lista = ligas.data.data;
  const ligaId = seleccion ?? lista[0]?.id;
  const actual = lista.find((l) => l.id === ligaId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ligas</h1>
      {lista.length === 0 ? (
        <Vacio texto="No hay ligas registradas." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist">
            {lista.map((l) => (
              <BotonLiga
                key={l.id}
                liga={l}
                activa={l.id === ligaId}
                onClick={() => setSeleccion(l.id)}
              />
            ))}
          </div>
          {actual && <TablaPosiciones ligaId={actual.id} deporte={actual.deporte} />}
        </>
      )}
    </div>
  );
}

function BotonLiga(props: { liga: Liga; activa: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={props.activa}
      onClick={props.onClick}
      className={`card flex items-center gap-2 !py-2 text-sm ${props.activa ? "ring-2 ring-sky-500" : ""}`}
    >
      <DeporteTag deporte={props.liga.deporte} />
      {props.liga.nombre}
      <span className="text-slate-500">{props.liga.temporada}</span>
    </button>
  );
}

function TablaPosiciones({ ligaId, deporte }: { ligaId: string; deporte: Deporte }) {
  const q = usePosiciones(ligaId);
  if (q.isPending) return <Cargando texto="Calculando posiciones…" />;
  if (q.isError) return <ErrorMensaje error={q.error} />;
  if (q.data.posiciones.length === 0) {
    return <Vacio texto="Aún no hay equipos ni partidos ingeridos para esta liga." />;
  }
  const futbol = deporte === "FUTBOL";
  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left dark:bg-slate-800">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Equipo</th>
            <th className="px-3 py-2 text-right">PJ</th>
            <th className="px-3 py-2 text-right">G</th>
            {futbol && <th className="px-3 py-2 text-right">E</th>}
            <th className="px-3 py-2 text-right">P</th>
            <th className="px-3 py-2 text-right">Dif</th>
            <th className="px-3 py-2 text-right">{futbol ? "Pts" : "%"}</th>
          </tr>
        </thead>
        <tbody>
          {q.data.posiciones.map((f) => (
            <tr key={f.equipoId} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-3 py-2">{f.posicion}</td>
              <td className="px-3 py-2 font-medium">{f.equipo?.nombre ?? f.equipoId}</td>
              <td className="px-3 py-2 text-right">{f.jugados}</td>
              <td className="px-3 py-2 text-right">{f.ganados}</td>
              {futbol && <td className="px-3 py-2 text-right">{f.empatados}</td>}
              <td className="px-3 py-2 text-right">{f.perdidos}</td>
              <td className="px-3 py-2 text-right">{f.diferencia}</td>
              <td className="px-3 py-2 text-right font-semibold">
                {futbol ? f.puntos : f.porcentaje.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
