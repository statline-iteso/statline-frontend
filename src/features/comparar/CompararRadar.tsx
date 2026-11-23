import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Metrica } from "../partidos/metricas";
import { normalizar } from "./normalizar";

export interface JugadorRadar {
  id: string;
  nombre: string;
  promedios: Record<string, number | null>;
}

const COLORES_COMPARACION = ["#0284c7", "#d97706", "#16a34a", "#9333ea"] as const;

/**
 * Radar of the averages, normalized per metric (see `normalizar`). A metric a player never
 * reported is drawn at 0; the table below shows the raw values.
 */
export function CompararRadar({
  metricas,
  jugadores,
}: {
  metricas: Metrica[];
  jugadores: JugadorRadar[];
}) {
  const datos = metricas.map((m) => {
    const porJugador = normalizar(jugadores.map((j) => j.promedios[m.clave] ?? null));
    const fila: Record<string, string | number> = { metrica: m.etiqueta };
    porJugador.forEach((valor, i) => {
      fila[`j${i}`] = valor ?? 0;
    });
    return fila;
  });

  return (
    <div role="img" aria-label="Radar de promedios por métrica" className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={datos} outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="metrica" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {jugadores.map((j, i) => (
            <Radar
              key={j.id}
              name={j.nombre}
              dataKey={`j${i}`}
              stroke={COLORES_COMPARACION[i]}
              fill={COLORES_COMPARACION[i]}
              fillOpacity={0.15}
            />
          ))}
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
