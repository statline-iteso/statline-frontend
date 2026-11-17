import type { Deporte } from "../api/types";
import { nombreDeporte } from "../lib/format";

const COLOR_DEPORTE: Record<Deporte, string> = {
  BASQUETBOL: "bg-basquetbol/10 text-basquetbol",
  AMERICANO: "bg-americano/10 text-americano",
  FUTBOL: "bg-futbol/10 text-futbol",
};

export function DeporteTag({ deporte }: { deporte: Deporte }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${COLOR_DEPORTE[deporte]}`}>
      {nombreDeporte(deporte)}
    </span>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <p role="status" className="py-8 text-center text-sm text-slate-500">
      {texto}
    </p>
  );
}

export function ErrorMensaje({ error, texto }: { error: unknown; texto?: string }) {
  const msg = texto ?? (error instanceof Error ? error.message : "Error inesperado");
  return (
    <p
      role="alert"
      className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
    >
      {msg}
    </p>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{texto}</p>;
}

export function Paginacion(props: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(props.total / props.pageSize));
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-slate-500">
        Página {props.page} de {paginas} · {props.total} resultados
      </span>
      <div className="flex gap-2">
        <button
          className="btn"
          disabled={props.page <= 1}
          onClick={() => props.onChange(props.page - 1)}
        >
          Anterior
        </button>
        <button
          className="btn"
          disabled={props.page >= paginas}
          onClick={() => props.onChange(props.page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
