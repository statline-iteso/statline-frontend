import { porcentaje } from "./util";

interface Props {
  equipoLocal: string;
  equipoVisita: string;
  probLocal: number;
  probEmpate: number;
  probVisita: number;
  /** Only futbol has draws; basquetbol and americano get no draw segment. */
  conEmpate: boolean;
}

/**
 * Stacked horizontal bar of the match outcome. The bar itself is colour only: the legend under it
 * shows every percentage as text, and the image's accessible name repeats them.
 */
export function ProbBarra({
  equipoLocal,
  equipoVisita,
  probLocal,
  probEmpate,
  probVisita,
  conEmpate,
}: Props) {
  const segmentos = [
    { clave: "local", etiqueta: equipoLocal, p: probLocal, color: "bg-sky-600" },
    ...(conEmpate
      ? [{ clave: "empate", etiqueta: "Empate", p: probEmpate, color: "bg-slate-400" }]
      : []),
    { clave: "visita", etiqueta: equipoVisita, p: probVisita, color: "bg-amber-500" },
  ];
  const textoAlterno = `Probabilidades: ${segmentos
    .map((s) => `${s.etiqueta} ${porcentaje(s.p)}`)
    .join(", ")}`;

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={textoAlterno}
        className="flex h-6 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
      >
        {segmentos.map((s) => (
          <span
            key={s.clave}
            data-testid={`segmento-${s.clave}`}
            className={s.color}
            style={{ width: `${s.p * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        {segmentos.map((s) => (
          <li key={s.clave} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.color}`} aria-hidden="true" />
            <span>{s.etiqueta}</span>
            <span className="font-semibold tabular-nums">{porcentaje(s.p)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
