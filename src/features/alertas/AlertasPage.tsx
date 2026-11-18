import { useSearchParams } from "react-router-dom";
import { useActualizarAlerta, useAlertas, useEliminarAlerta } from "../../api/queries";
import type { Alerta } from "../../api/types";
import { NombreEquipo, NombreJugador } from "../../components/Referencias";
import { Cargando, ErrorMensaje, Paginacion, Vacio } from "../../components/ui";
import { fechaHora } from "../../lib/format";
import { METRICAS_POR_DEPORTE } from "../partidos/metricas";
import { ETIQUETA_TIPO_ALERTA } from "./validacion";
import { FormularioAlerta } from "./FormularioAlerta";

const TITULO_METRICA = new Map(
  Object.values(METRICAS_POR_DEPORTE)
    .flat()
    .map((m) => [m.clave, m.titulo]),
);

export function AlertasPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1");
  const alertas = useAlertas({ page });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alertas</h1>
      <FormularioAlerta />

      {alertas.isPending ? (
        <Cargando />
      ) : alertas.isError ? (
        <ErrorMensaje error={alertas.error} />
      ) : alertas.data.data.length === 0 ? (
        <Vacio texto="Aún no tienes alertas." />
      ) : (
        <>
          <ul className="space-y-3">
            {alertas.data.data.map((a) => (
              <FilaAlerta key={a.id} alerta={a} />
            ))}
          </ul>
          <Paginacion
            page={alertas.data.page}
            pageSize={alertas.data.pageSize}
            total={alertas.data.total}
            onChange={(n) => setParams({ page: String(n) })}
          />
        </>
      )}
    </div>
  );
}

function FilaAlerta({ alerta: a }: { alerta: Alerta }) {
  const actualizar = useActualizarAlerta();
  const eliminar = useEliminarAlerta();
  const condicion = a.condicion
    ? `${TITULO_METRICA.get(a.condicion.metrica) ?? a.condicion.metrica} ${a.condicion.operador} ${a.condicion.valor}`
    : null;

  return (
    <li className="card space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {ETIQUETA_TIPO_ALERTA[a.tipo]}
            <span className="ml-2 font-normal text-slate-500">
              {a.jugadorId ? (
                <NombreJugador id={a.jugadorId} />
              ) : a.equipoId ? (
                <NombreEquipo id={a.equipoId} />
              ) : null}
            </span>
          </p>
          {condicion && <p className="text-sm text-slate-600 dark:text-slate-300">{condicion}</p>}
          <p className="text-xs text-slate-500">
            {a.ultimaDisparada
              ? `Última vez disparada: ${fechaHora(a.ultimaDisparada)}`
              : "Aún no se ha disparado."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={a.activa}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              a.activa
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
            disabled={actualizar.isPending}
            onClick={() => actualizar.mutate({ id: a.id, body: { activa: !a.activa } })}
          >
            {a.activa ? "Activa" : "Pausada"}
          </button>
          <button
            type="button"
            className="text-sm text-red-600 underline dark:text-red-400"
            disabled={eliminar.isPending}
            onClick={() => {
              if (window.confirm("¿Eliminar esta alerta?")) eliminar.mutate(a.id);
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
      {actualizar.isError && <ErrorMensaje error={actualizar.error} />}
      {eliminar.isError && <ErrorMensaje error={eliminar.error} />}
    </li>
  );
}
