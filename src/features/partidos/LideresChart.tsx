import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Lider } from "./metricas";

/** Horizontal bars of the top leaders for one metric. */
export function LideresChart({ lideres, titulo }: { lideres: Lider[]; titulo: string }) {
  const datos = lideres.map((l) => ({ nombre: `${l.nombre} (${l.equipo})`, valor: l.valor }));
  return (
    <div role="img" aria-label={`Líderes en ${titulo}`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="nombre" width={190} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="valor" name={titulo} fill="#0284c7" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
