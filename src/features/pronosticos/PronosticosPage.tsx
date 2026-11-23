import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { esAdmin } from "../../auth/roles";
import { DEPORTES } from "../../api/types";
import { nombreDeporte } from "../../lib/format";
import { ModelosTab } from "./ModelosTab";
import { PartidosPronosticos } from "./PartidosPronosticos";
import { JugadoresProyecciones } from "./JugadoresProyecciones";
import { parseDeporte, parseJornada } from "./util";

const PESTANAS = [
  { id: "partidos", texto: "Partidos" },
  { id: "jugadores", texto: "Jugadores" },
  { id: "modelos", texto: "Modelos", soloAdmin: true },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

export function PronosticosPage() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();

  const deporte = parseDeporte(params.get("deporte"));
  const jornada = parseJornada(params.get("jornada"));
  const page = Number(params.get("page") ?? "1");

  const pestanas = PESTANAS.filter((p) => !("soloAdmin" in p) || esAdmin(usuario?.rol));
  const pedida = params.get("tab");
  const pestana: Pestana = pestanas.some((p) => p.id === pedida) ? (pedida as Pestana) : "partidos";

  const actualizar = (cambios: Record<string, string | null>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(cambios)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      return next;
    });

  const verFiltros = pestana !== "modelos";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Pronósticos</h1>
        {verFiltros && (
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Deporte
              <select
                className="input mt-1 sm:w-48"
                aria-label="Deporte"
                value={deporte}
                onChange={(e) => actualizar({ deporte: e.target.value, page: null })}
              >
                {DEPORTES.map((d) => (
                  <option key={d} value={d}>
                    {nombreDeporte(d)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Jornada
              <input
                className="input mt-1 sm:w-28"
                type="number"
                min={1}
                placeholder="Todas"
                value={params.get("jornada") ?? ""}
                onChange={(e) => actualizar({ jornada: e.target.value, page: null })}
              />
            </label>
          </div>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Secciones de pronósticos"
        className="flex gap-1 border-b border-slate-200 dark:border-slate-800"
      >
        {pestanas.map((p) => (
          <button
            key={p.id}
            id={`tab-${p.id}`}
            role="tab"
            type="button"
            aria-selected={pestana === p.id}
            aria-controls={`panel-${p.id}`}
            tabIndex={pestana === p.id ? 0 : -1}
            onClick={() => actualizar({ tab: p.id === "partidos" ? null : p.id, page: null })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              pestana === p.id
                ? "border-sky-600 font-medium text-sky-700 dark:text-sky-300"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300"
            }`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      <div
        key={`${pestana}-${deporte}`}
        role="tabpanel"
        id={`panel-${pestana}`}
        aria-labelledby={`tab-${pestana}`}
      >
        {pestana === "partidos" && (
          <PartidosPronosticos
            deporte={deporte}
            jornada={jornada}
            page={page}
            onPage={(n) => actualizar({ page: String(n) })}
          />
        )}
        {pestana === "jugadores" && (
          <JugadoresProyecciones
            deporte={deporte}
            jornada={jornada}
            page={page}
            onPage={(n) => actualizar({ page: String(n) })}
          />
        )}
        {pestana === "modelos" && <ModelosTab deporte={deporte} />}
      </div>
    </div>
  );
}
