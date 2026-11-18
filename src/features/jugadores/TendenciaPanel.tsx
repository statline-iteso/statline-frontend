import { useSearchParams } from "react-router-dom";
import { useTendencia } from "../../api/queries";
import type { Jugador } from "../../api/types";
import { Cargando, ErrorMensaje, Vacio } from "../../components/ui";
import { fechaCorta } from "../../lib/format";
import { METRICAS_POR_DEPORTE, type Metrica } from "../partidos/metricas";
import { TendenciaChart } from "./TendenciaChart";

/** Number of most recent games shown in the trend. */
const PARTIDOS_TENDENCIA = 10;

/** Line chart of one metric over the last games. The metric is kept in `?metrica=`. */
export function TendenciaPanel({ jugador }: { jugador: Jugador }) {
  const [params, setParams] = useSearchParams();
  const metricas = METRICAS_POR_DEPORTE[jugador.deporte];
  const clave = params.get("metrica");
  const metrica: Metrica | undefined = metricas.find((m) => m.clave === clave) ?? metricas[0];
  const q = useTendencia(jugador.id, metrica?.clave, PARTIDOS_TENDENCIA);

  const selector = (
    <label className="text-sm">
      Métrica
      <select
        className="input mt-1 sm:w-64"
        value={metrica?.clave ?? ""}
        onChange={(e) =>
          setParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set("metrica", e.target.value);
              return next;
            },
            { replace: true },
          )
        }
      >
        {metricas.map((m) => (
          <option key={m.clave} value={m.clave}>
            {m.titulo}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-lg font-semibold">Tendencia · últimos {PARTIDOS_TENDENCIA}</h2>
        {selector}
      </div>
      {q.isPending ? (
        <Cargando />
      ) : q.isError ? (
        <ErrorMensaje error={q.error} />
      ) : q.data.serie.length === 0 ? (
        <Vacio texto="Sin partidos finalizados para graficar." />
      ) : (
        <TendenciaChart
          titulo={metrica?.titulo ?? ""}
          datos={q.data.serie.map((p) => ({ fecha: fechaCorta(p.fecha), valor: p.valor }))}
        />
      )}
    </section>
  );
}
