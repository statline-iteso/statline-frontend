import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useAgregarElemento,
  useEliminarLista,
  useEquipos,
  useLista,
  useQuitarElemento,
  useRenombrarLista,
} from "../../api/queries";
import type { ListaSeguimiento } from "../../api/types";
import { NombreEquipo, NombreJugador } from "../../components/Referencias";
import { Cargando, ErrorMensaje, Vacio } from "../../components/ui";
import { SelectorJugador } from "../../components/SelectorJugador";
import { esConflicto } from "../../lib/errores";

export function ListaDetallePage() {
  const { id = "" } = useParams();
  const q = useLista(id);

  if (q.isPending) return <Cargando />;
  if (q.isError) return <ErrorMensaje error={q.error} />;
  return <Contenido key={q.data.id} lista={q.data} />;
}

function Contenido({ lista }: { lista: ListaSeguimiento }) {
  const navigate = useNavigate();
  const renombrar = useRenombrarLista();
  const eliminar = useEliminarLista();
  const agregar = useAgregarElemento();
  const quitar = useQuitarElemento();
  const equipos = useEquipos();
  const [nombre, setNombre] = useState(lista.nombre);
  const [equipoId, setEquipoId] = useState("");
  const [nombreError, setNombreError] = useState<string>();

  const elementos = lista.elementos ?? [];
  const equiposEnLista = new Set(elementos.filter((e) => e.tipo === "EQUIPO").map((e) => e.refId));
  const equiposDisponibles = (equipos.data?.data ?? []).filter((e) => !equiposEnLista.has(e.id));

  const guardarNombre = (e: FormEvent) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return setNombreError("El nombre no puede estar vacío.");
    setNombreError(undefined);
    renombrar.mutate({ id: lista.id, nombre: limpio });
  };

  const borrarLista = () => {
    if (!window.confirm(`¿Eliminar la lista "${lista.nombre}"? Esta acción no se puede deshacer.`))
      return;
    eliminar.mutate(lista.id, { onSuccess: () => navigate("/listas") });
  };

  const agregarEquipo = () => {
    if (!equipoId) return;
    agregar.mutate(
      { listaId: lista.id, tipo: "EQUIPO", refId: equipoId },
      { onSuccess: () => setEquipoId("") },
    );
  };

  return (
    <div className="space-y-6">
      <Link to="/listas" className="text-sm text-sky-700 underline dark:text-sky-400">
        ← Listas
      </Link>

      <section className="card space-y-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={guardarNombre} noValidate>
          <label className="min-w-0 flex-1 text-sm">
            Nombre
            <input
              className="input mt-1"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={121}
              aria-invalid={nombreError ? true : undefined}
            />
          </label>
          <button className="btn" type="submit" disabled={renombrar.isPending}>
            Guardar nombre
          </button>
          <button
            className="btn bg-red-600 hover:bg-red-700"
            type="button"
            onClick={borrarLista}
            disabled={eliminar.isPending}
          >
            Eliminar lista
          </button>
        </form>
        {nombreError && <p className="text-sm text-red-600 dark:text-red-400">{nombreError}</p>}
        {renombrar.isSuccess && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            Nombre guardado.
          </p>
        )}
        {renombrar.isError && <ErrorMensaje error={renombrar.error} />}
        {eliminar.isError && <ErrorMensaje error={eliminar.error} />}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Elementos</h2>
        {elementos.length === 0 ? (
          <Vacio texto="Esta lista no tiene elementos todavía." />
        ) : (
          <ul className="card divide-y divide-slate-100 !p-0 dark:divide-slate-800">
            {elementos.map((el) => (
              <li key={el.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {el.tipo === "JUGADOR" ? "Jugador" : "Equipo"}
                  </span>
                  <span className="font-medium">
                    {el.tipo === "JUGADOR" ? (
                      <NombreJugador id={el.refId} />
                    ) : (
                      <NombreEquipo id={el.refId} />
                    )}
                  </span>
                </span>
                <button
                  className="text-sm text-red-600 underline dark:text-red-400"
                  type="button"
                  disabled={quitar.isPending}
                  onClick={() => {
                    if (window.confirm("¿Quitar este elemento de la lista?"))
                      quitar.mutate({ listaId: lista.id, refId: el.refId });
                  }}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        {quitar.isError && <ErrorMensaje error={quitar.error} />}
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Agregar jugador</h2>
        <SelectorJugador
          accion="Agregar"
          onSeleccionar={(j) => agregar.mutate({ listaId: lista.id, tipo: "JUGADOR", refId: j.id })}
        />
        <h2 className="text-lg font-semibold">Agregar equipo</h2>
        {equipos.isPending ? (
          <Cargando texto="Cargando equipos…" />
        ) : equipos.isError ? (
          <ErrorMensaje error={equipos.error} />
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 text-sm">
              Equipo
              <select
                className="input mt-1"
                value={equipoId}
                onChange={(e) => setEquipoId(e.target.value)}
              >
                <option value="">Elige un equipo</option>
                {equiposDisponibles.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn"
              type="button"
              disabled={!equipoId || agregar.isPending}
              onClick={agregarEquipo}
            >
              Agregar equipo
            </button>
          </div>
        )}
        {agregar.isError && (
          <ErrorMensaje
            error={agregar.error}
            texto={esConflicto(agregar.error) ? "Ya está en la lista." : undefined}
          />
        )}
      </section>
    </div>
  );
}
