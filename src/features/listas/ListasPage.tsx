import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCrearLista, useListas } from "../../api/queries";
import { Cargando, ErrorMensaje, Paginacion, Vacio } from "../../components/ui";
import { fechaHora } from "../../lib/format";

const MAX_NOMBRE = 120;

export function ListasPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1");
  const listas = useListas({ page });
  const crear = useCrearLista();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string>();

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return setError("Escribe un nombre para la lista.");
    if (limpio.length > MAX_NOMBRE) return setError(`Máximo ${MAX_NOMBRE} caracteres.`);
    setError(undefined);
    crear.mutate({ nombre: limpio }, { onSuccess: (lista) => navigate(`/listas/${lista.id}`) });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Listas</h1>

      <form className="card flex flex-wrap items-end gap-3" onSubmit={enviar} noValidate>
        <label className="min-w-0 flex-1 text-sm">
          Nombre de la lista
          <input
            className="input mt-1"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={MAX_NOMBRE + 1}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "error-nombre-lista" : undefined}
          />
        </label>
        <button className="btn" type="submit" disabled={crear.isPending}>
          Crear lista
        </button>
        {error && (
          <p id="error-nombre-lista" className="w-full text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {crear.isError && (
          <div className="w-full">
            <ErrorMensaje error={crear.error} />
          </div>
        )}
      </form>

      {listas.isPending ? (
        <Cargando />
      ) : listas.isError ? (
        <ErrorMensaje error={listas.error} />
      ) : listas.data.data.length === 0 ? (
        <Vacio texto="Aún no tienes listas de seguimiento." />
      ) : (
        <>
          <ul className="card divide-y divide-slate-100 !p-0 dark:divide-slate-800">
            {listas.data.data.map((l) => (
              <li key={l.id}>
                <Link
                  to={`/listas/${l.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="font-medium">{l.nombre}</span>
                  <span className="text-sm text-slate-500">{fechaHora(l.creadoEn)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Paginacion
            page={listas.data.page}
            pageSize={listas.data.pageSize}
            total={listas.data.total}
            onChange={(n) => setParams({ page: String(n) })}
          />
        </>
      )}
    </div>
  );
}
