import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useJugadores } from "../../api/queries";
import { DEPORTES, type Deporte } from "../../api/types";
import { Cargando, DeporteTag, ErrorMensaje, Paginacion, Vacio } from "../../components/ui";
import { nombreDeporte } from "../../lib/format";

export function JugadoresPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const deporte = (params.get("deporte") as Deporte | null) ?? undefined;
  const page = Number(params.get("page") ?? "1");
  const [texto, setTexto] = useState(q);

  // Debounce typing so every keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => {
      if (texto !== q) actualizar({ q: texto, page: "1" });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [texto]);

  const actualizar = (cambios: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next);
  };

  const jugadores = useJugadores({ q: q || undefined, deporte, page });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Jugadores</h1>
      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          type="search"
          placeholder="Buscar por nombre"
          aria-label="Buscar por nombre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <select
          className="input max-w-[12rem]"
          aria-label="Deporte"
          value={deporte ?? ""}
          onChange={(e) => actualizar({ deporte: e.target.value, page: "1" })}
        >
          <option value="">Todos los deportes</option>
          {DEPORTES.map((d) => (
            <option key={d} value={d}>
              {nombreDeporte(d)}
            </option>
          ))}
        </select>
      </div>
      {jugadores.isPending ? (
        <Cargando />
      ) : jugadores.isError ? (
        <ErrorMensaje error={jugadores.error} />
      ) : jugadores.data.data.length === 0 ? (
        <Vacio texto="Sin resultados." />
      ) : (
        <>
          <ul className="card divide-y divide-slate-100 !p-0 dark:divide-slate-800">
            {jugadores.data.data.map((j) => (
              <li key={j.id}>
                <Link
                  to={`/jugadores/${j.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>
                    <span className="font-medium">{j.nombre}</span>
                    <span className="ml-2 text-sm text-slate-500">
                      {[j.posicion, j.equipo?.nombre].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <DeporteTag deporte={j.deporte} />
                </Link>
              </li>
            ))}
          </ul>
          <Paginacion
            page={jugadores.data.page}
            pageSize={jugadores.data.pageSize}
            total={jugadores.data.total}
            onChange={(n) => actualizar({ page: String(n) })}
          />
        </>
      )}
    </div>
  );
}
