import type { Deporte, EquipoRef, EstadisticaLinea, Metricas } from "../../api/types";

/**
 * One stat column. `clave` is a dot path into `Metricas` (NFL groups are nested: `pase.yardas`).
 * Keys follow statline-backend/schemas/*.schema.json.
 */
export interface Metrica {
  clave: string;
  /** Short column header. */
  etiqueta: string;
  /** Full name, used in the leaders selector and chart. */
  titulo: string;
}

/** Column order per sport. Minutes are a common column rendered by the table itself. */
export const METRICAS_POR_DEPORTE: Record<Deporte, Metrica[]> = {
  BASQUETBOL: [
    { clave: "puntos", etiqueta: "PTS", titulo: "Puntos" },
    { clave: "rebotes", etiqueta: "REB", titulo: "Rebotes" },
    { clave: "rebotesOfensivos", etiqueta: "REB OF", titulo: "Rebotes ofensivos" },
    { clave: "rebotesDefensivos", etiqueta: "REB DEF", titulo: "Rebotes defensivos" },
    { clave: "asistencias", etiqueta: "AST", titulo: "Asistencias" },
    { clave: "robos", etiqueta: "ROB", titulo: "Robos" },
    { clave: "bloqueos", etiqueta: "BLK", titulo: "Bloqueos" },
    { clave: "perdidas", etiqueta: "PER", titulo: "Pérdidas" },
    { clave: "faltas", etiqueta: "FAL", titulo: "Faltas" },
    { clave: "tirosCampoAnotados", etiqueta: "TC", titulo: "Tiros de campo anotados" },
    { clave: "tirosCampoIntentados", etiqueta: "TC int", titulo: "Tiros de campo intentados" },
    { clave: "triplesAnotados", etiqueta: "3P", titulo: "Triples anotados" },
    { clave: "triplesIntentados", etiqueta: "3P int", titulo: "Triples intentados" },
    { clave: "tirosLibresAnotados", etiqueta: "TL", titulo: "Tiros libres anotados" },
    { clave: "tirosLibresIntentados", etiqueta: "TL int", titulo: "Tiros libres intentados" },
    { clave: "masMenos", etiqueta: "+/-", titulo: "+/-" },
  ],
  AMERICANO: [
    { clave: "pase.completos", etiqueta: "Comp", titulo: "Pases completos" },
    { clave: "pase.intentos", etiqueta: "Int", titulo: "Pases intentados" },
    { clave: "pase.yardas", etiqueta: "Yds pase", titulo: "Yardas por pase" },
    { clave: "pase.touchdowns", etiqueta: "TD pase", titulo: "Touchdowns por pase" },
    { clave: "carrera.acarreos", etiqueta: "Acar", titulo: "Acarreos" },
    { clave: "carrera.yardas", etiqueta: "Yds carr", titulo: "Yardas por carrera" },
    { clave: "carrera.touchdowns", etiqueta: "TD carr", titulo: "Touchdowns por carrera" },
    { clave: "recepcion.recepciones", etiqueta: "Rec", titulo: "Recepciones" },
    { clave: "recepcion.yardas", etiqueta: "Yds rec", titulo: "Yardas por recepción" },
    { clave: "recepcion.touchdowns", etiqueta: "TD rec", titulo: "Touchdowns por recepción" },
    { clave: "defensa.tacleadas", etiqueta: "Tac", titulo: "Tacleadas" },
    { clave: "defensa.intercepciones", etiqueta: "Int def", titulo: "Intercepciones (defensa)" },
    { clave: "pateo.golesCampoAnotados", etiqueta: "FG", titulo: "Goles de campo anotados" },
    {
      clave: "pateo.golesCampoIntentados",
      etiqueta: "FG int",
      titulo: "Goles de campo intentados",
    },
  ],
  FUTBOL: [
    { clave: "goles", etiqueta: "G", titulo: "Goles" },
    { clave: "asistencias", etiqueta: "A", titulo: "Asistencias" },
    { clave: "tiros", etiqueta: "Tiros", titulo: "Tiros" },
    { clave: "tirosAGol", etiqueta: "A gol", titulo: "Tiros a gol" },
    { clave: "pases", etiqueta: "Pases", titulo: "Pases" },
    { clave: "pasesClave", etiqueta: "P clave", titulo: "Pases clave" },
    { clave: "regates", etiqueta: "Reg", titulo: "Regates" },
    { clave: "entradas", etiqueta: "Ent", titulo: "Entradas" },
    { clave: "intercepciones", etiqueta: "Int", titulo: "Intercepciones" },
    { clave: "faltasCometidas", etiqueta: "F com", titulo: "Faltas cometidas" },
    { clave: "faltasRecibidas", etiqueta: "F rec", titulo: "Faltas recibidas" },
    { clave: "tarjetasAmarillas", etiqueta: "TA", titulo: "Tarjetas amarillas" },
    { clave: "tarjetasRojas", etiqueta: "TR", titulo: "Tarjetas rojas" },
    { clave: "atajadas", etiqueta: "Atj", titulo: "Atajadas" },
  ],
};

/** Reads a dot path such as `pase.yardas`. Returns undefined when the group or value is absent. */
export function leerMetrica(metricas: Metricas, clave: string): number | undefined {
  let actual: unknown = metricas;
  for (const parte of clave.split(".")) {
    if (typeof actual !== "object" || actual === null) return undefined;
    actual = (actual as Record<string, unknown>)[parte];
  }
  return typeof actual === "number" ? actual : undefined;
}

export interface LineaDeEquipo {
  linea: EstadisticaLinea;
  equipo: EquipoRef;
}

export interface Lider {
  id: string;
  nombre: string;
  equipo: string;
  valor: number;
}

/** Top `n` players for a metric across both teams. Players without the metric are skipped. */
export function topLideres(filas: LineaDeEquipo[], metrica: Metrica, n = 5): Lider[] {
  return filas
    .flatMap(({ linea, equipo }) => {
      const valor = leerMetrica(linea.metricas, metrica.clave);
      return valor === undefined
        ? []
        : [
            {
              id: linea.id,
              nombre: linea.jugador.nombre,
              equipo: equipo.abreviatura ?? equipo.nombre,
              valor,
            },
          ];
    })
    .sort((a, b) => b.valor - a.valor)
    .slice(0, n);
}
