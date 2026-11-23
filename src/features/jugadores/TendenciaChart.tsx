import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PuntoGrafica {
  fecha: string;
  valor: number;
}

/** Line of one metric per game, oldest first. */
export function TendenciaChart({ titulo, datos }: { titulo: string; datos: PuntoGrafica[] }) {
  return (
    <div role="img" aria-label={`Tendencia de ${titulo}`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ left: 8, right: 24, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="valor"
            name={titulo}
            stroke="#0284c7"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
