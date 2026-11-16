import { Link, useParams } from "react-router-dom";
import { useJugador } from "../../api/queries";
import type { Jugador } from "../../api/types";
import { Cargando, DeporteTag, ErrorMensaje } from "../../components/ui";

const ESTATUS: Record<Jugador["estatus"], { texto: string; clase: string }> = {
  DISPONIBLE: { texto: "Disponible", clase: "text-green-700 dark:text-green-400" },
  DUDA: { texto: "En duda", clase: "text-amber-700 dark:text-amber-400" },
  LESIONADO: { texto: "Lesionado", clase: "text-red-700 dark:text-red-400" },
  SUSPENDIDO: { texto: "Suspendido", clase: "text-slate-600 dark:text-slate-400" },
};

export function JugadorDetallePage() {
  const { id = "" } = useParams();
  const q = useJugador(id);

  if (q.isPending) return <Cargando />;
  if (q.isError) return <ErrorMensaje error={q.error} />;
  const j = q.data;
  const estatus = ESTATUS[j.estatus];

  return (
    <div className="space-y-4">
      <Link to="/jugadores" className="text-sm text-sky-700 underline dark:text-sky-400">
        ← Jugadores
      </Link>
      <div className="card space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{j.nombre}</h1>
          <DeporteTag deporte={j.deporte} />
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Dato titulo="Equipo" valor={j.equipo?.nombre ?? "Agente libre"} />
          <Dato titulo="Posición" valor={j.posicion ?? "—"} />
          <Dato titulo="Número" valor={j.numero?.toString() ?? "—"} />
          <div>
            <dt className="text-slate-500">Estatus</dt>
            <dd className={`font-medium ${estatus.clase}`}>{estatus.texto}</dd>
          </div>
        </dl>
      </div>
      {/* TODO(SL-27, SL-45): promedios, tendencia (Recharts) y botón "Comparar". */}
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-slate-500">{titulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
