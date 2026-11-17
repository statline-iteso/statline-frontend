import { useState } from "react";
import { useActivarModelo, useModelos, useReentrenar } from "../../api/queries";
import {
  TIPOS_INFERENCIA,
  type Deporte,
  type ModeloPrediccion,
  type ReentrenarRespuesta,
} from "../../api/types";
import { Cargando, Vacio } from "../../components/ui";
import { fechaHora } from "../../lib/format";
import { ErrorPronostico, InsigniaSintetico } from "./Componentes";
import { ETIQUETA_TIPO } from "./util";

export function ModelosTab({ deporte }: { deporte: Deporte }) {
  const modelos = useModelos({ deporte });
  const reentrenar = useReentrenar();
  const activar = useActivarModelo();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  // The activar response carries only the id: look the version up in the list.
  const versionActivada = modelos.data?.data.find((m) => m.id === activar.data?.modeloId)?.version;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reentrenar</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Entrena un modelo nuevo con los datos actuales. Solo se activa si supera al modelo de
          referencia.
        </p>
        <div className="flex flex-wrap gap-2">
          {TIPOS_INFERENCIA.map((tipo) => (
            <button
              key={tipo}
              className="btn"
              disabled={reentrenar.isPending}
              onClick={() => reentrenar.mutate({ deporte, tipo })}
            >
              Reentrenar {ETIQUETA_TIPO[tipo].toLowerCase()}
            </button>
          ))}
        </div>
        <div role="status">
          {reentrenar.isPending && "Entrenando modelo…"}
          {reentrenar.isSuccess && <ResumenReentreno r={reentrenar.data} />}
          {reentrenar.isError && <ErrorPronostico error={reentrenar.error} />}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Modelos</h2>
        <div role="status">
          {activar.isSuccess && `Modelo ${versionActivada ?? "seleccionado"} activado.`}
          {activar.isError && <ErrorPronostico error={activar.error} />}
        </div>
        {modelos.isPending ? (
          <Cargando />
        ) : modelos.isError ? (
          <ErrorPronostico error={modelos.error} />
        ) : modelos.data.data.length === 0 ? (
          <Vacio texto="No hay modelos registrados para este deporte." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table aria-label="Modelos de predicción" className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Versión
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Tipo
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Métrica
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Entrenado
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {modelos.data.data.map((m) => (
                  <FilaModelo
                    key={m.id}
                    modelo={m}
                    confirmando={confirmando === m.id}
                    pendiente={activar.isPending}
                    onPedir={() => setConfirmando(m.id)}
                    onCancelar={() => setConfirmando(null)}
                    onConfirmar={() => {
                      setConfirmando(null);
                      activar.mutate(m.id);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FilaModelo({
  modelo: m,
  confirmando,
  pendiente,
  onPedir,
  onCancelar,
  onConfirmar,
}: {
  modelo: ModeloPrediccion;
  confirmando: boolean;
  pendiente: boolean;
  onPedir: () => void;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="px-3 py-2">
        <span className="font-medium">{m.version}</span> <InsigniaSintetico version={m.version} />
      </td>
      <td className="px-3 py-2">{ETIQUETA_TIPO[m.tipo]}</td>
      <td className="px-3 py-2 tabular-nums">
        {m.nombreMetrica} {m.metricaError.toFixed(3)}
      </td>
      <td className="px-3 py-2">{fechaHora(m.entrenadoEn)}</td>
      <td className="px-3 py-2">
        {m.activo ? (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
            Activo
          </span>
        ) : (
          <span className="text-slate-500">Inactivo</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {m.activo ? null : confirmando ? (
          <span className="flex justify-end gap-2">
            <button className="btn" disabled={pendiente} onClick={onConfirmar}>
              Confirmar activación
            </button>
            <button className="btn bg-slate-500 hover:bg-slate-600" onClick={onCancelar}>
              Cancelar
            </button>
          </span>
        ) : (
          <button className="btn" onClick={onPedir} aria-label={`Activar ${m.version}`}>
            Activar
          </button>
        )}
      </td>
    </tr>
  );
}

function ResumenReentreno({ r }: { r: ReentrenarRespuesta }) {
  return (
    <section aria-label="Resultado del reentrenamiento" className="card space-y-2 text-sm">
      <p className="font-semibold">
        Modelo {r.version} · {ETIQUETA_TIPO[r.tipo]}
      </p>
      <p>
        {r.nombreMetrica}: {r.metrica.toFixed(3)} (referencia {r.baseline.toFixed(3)})
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Entrenamiento: {r.nTrain} · Prueba: {r.nTest}
      </p>
      <p>Activado: {r.activado ? "sí" : "no"}</p>
      {r.motivo && <p className="text-slate-600 dark:text-slate-300">Motivo: {r.motivo}</p>}
    </section>
  );
}
