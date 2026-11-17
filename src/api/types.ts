/** Shapes returned by statline-backend (services/api). Keep in sync with docs/api.md in infra. */

export const DEPORTES = ["BASQUETBOL", "AMERICANO", "FUTBOL"] as const;
export type Deporte = (typeof DEPORTES)[number];

export type Rol = "ADMIN" | "ANALISTA" | "USUARIO";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EquipoRef {
  id: string;
  nombre: string;
  abreviatura: string | null;
}

export interface Liga {
  id: string;
  nombre: string;
  deporte: Deporte;
  pais: string | null;
  temporada: string;
  activa: boolean;
}

export interface Jugador {
  id: string;
  nombre: string;
  deporte: Deporte;
  posicion: string | null;
  numero: number | null;
  estatus: "DISPONIBLE" | "DUDA" | "LESIONADO" | "SUSPENDIDO";
  equipo: EquipoRef | null;
}

export type EstatusPartido = "PROGRAMADO" | "EN_JUEGO" | "FINALIZADO" | "POSPUESTO" | "CANCELADO";

export interface Partido {
  id: string;
  ligaId: string;
  fecha: string;
  jornada: number | null;
  estatus: EstatusPartido;
  marcadorLocal: number | null;
  marcadorVisita: number | null;
  local: EquipoRef;
  visita: EquipoRef;
}

export interface FilaPosicion {
  posicion: number;
  equipoId: string;
  equipo?: EquipoRef;
  jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  diferencia: number;
  puntos: number;
  porcentaje: number;
}

export interface Posiciones {
  ligaId: string;
  deporte: Deporte;
  temporada: string;
  posiciones: FilaPosicion[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

// ---------------------------------------------------------------------------
// Partidos: boxscore (implemented, SL-44)
// ---------------------------------------------------------------------------

/**
 * Metricas of one player line. The keys depend on the sport and are documented in
 * statline-backend/schemas/{basquetbol,futbol,americano}.schema.json. NFL groups are nested
 * objects (e.g. `pase.yardas`), the other sports are flat numbers.
 */
export type Metricas = Record<string, unknown>;

/** One row of EstadisticaJugadorPartido as returned inside a boxscore team array. */
export interface EstadisticaLinea {
  id: string;
  partidoId: string;
  jugadorId: string;
  equipoId: string;
  deporte: Deporte;
  /** Common column for every sport; null when the provider did not report it. */
  minutos: number | null;
  metricas: Metricas;
  jugador: { id: string; nombre: string; posicion: string | null };
}

/** GET /api/partidos/:id/boxscore. `local` and `visita` are the lines of each team. */
export interface Boxscore {
  partido: Partido;
  local: EstadisticaLinea[];
  visita: EstadisticaLinea[];
}

// ---------------------------------------------------------------------------
// Jugadores: promedios, tendencia, comparación (SL-27, implemented)
// ---------------------------------------------------------------------------

export interface JugadorResumen {
  id: string;
  nombre: string;
  deporte: Deporte;
  posicion: string | null;
}

/** Averages by metric key; NFL keys are dotted (`pase.yardas`). null when never reported. */
export type PromediosPorMetrica = Record<string, number | null>;

/** GET /api/jugadores/:id/promedios?ultimos=N. `ultimos` is null when no window was requested. */
export interface Promedios {
  jugador: JugadorResumen;
  ultimos: number | null;
  partidos: number;
  minutosPromedio: number | null;
  promedios: PromediosPorMetrica;
}

export interface PuntoTendencia {
  partidoId: string;
  fecha: string;
  valor: number;
}

/** GET /api/jugadores/:id/tendencia?metrica=&n=. `serie` is ordered oldest first. */
export interface Tendencia {
  jugadorId: string;
  metrica: string;
  n: number;
  serie: PuntoTendencia[];
}

/** One entry of GET /api/jugadores/comparar?ids=a,b. */
export interface JugadorComparado {
  jugador: JugadorResumen;
  partidos: number;
  minutosPromedio: number | null;
  promedios: PromediosPorMetrica;
}

export interface Comparacion {
  deporte: Deporte;
  jugadores: JugadorComparado[];
}

// ---------------------------------------------------------------------------
// Pronósticos y proyecciones (SL-29). Tentative until the predictions service is live.
// ---------------------------------------------------------------------------

export const TIPOS_INFERENCIA = ["RESULTADO_PARTIDO", "PROYECCION_JUGADOR"] as const;
export type TipoInferencia = (typeof TIPOS_INFERENCIA)[number];

export interface ModeloPrediccion {
  id: string;
  deporte: Deporte;
  tipo: TipoInferencia;
  version: string;
  artefactoUri: string;
  nombreMetrica: string; // p. ej. "log_loss", "mae"
  metricaError: number;
  activo: boolean;
  entrenadoEn: string;
}

export interface PronosticoPartido {
  id: string;
  partidoId: string;
  modeloId: string;
  probLocal: number;
  probEmpate: number;
  probVisita: number;
  marcadorEsperadoLocal: number | null;
  marcadorEsperadoVisita: number | null;
  generadoEn: string;
}

export interface ProyeccionJugador {
  id: string;
  jugadorId: string;
  partidoId: string;
  modeloId: string;
  metricas: Record<string, number>;
  generadoEn: string;
}

/** GET /api/pronosticos/precision and /api/proyecciones/precision. Shape not in api.md yet. */
export interface Precision {
  modeloId?: string;
  nombreMetrica: string;
  valor: number;
  muestra: number;
}

// ---------------------------------------------------------------------------
// Listas de seguimiento (SL-28), alertas (SL-30), ingestas (SL-30)
// ---------------------------------------------------------------------------

export interface ListaSeguimiento {
  id: string;
  usuarioId: string;
  nombre: string;
  creadoEn: string;
  elementos?: ElementoLista[];
}

export interface ElementoLista {
  id: string;
  listaId: string;
  tipo: "JUGADOR" | "EQUIPO";
  refId: string; // id of the Jugador or Equipo
}

export const TIPOS_ALERTA = ["LESION", "UMBRAL", "INICIO_PARTIDO"] as const;
export type TipoAlerta = (typeof TIPOS_ALERTA)[number];

// Operator set is not documented in api.md; ">=" is the only one shown in the Prisma comment.
export type Operador = ">" | ">=" | "<" | "<=" | "=";

/** Stored in Alerta.condicion (JSON); only meaningful for UMBRAL alerts. */
export interface CondicionAlerta {
  metrica: string;
  operador: Operador;
  valor: number;
}

export interface Alerta {
  id: string;
  usuarioId: string;
  tipo: TipoAlerta;
  jugadorId: string | null;
  equipoId: string | null;
  condicion: CondicionAlerta | null;
  activa: boolean;
  ultimaDisparada: string | null;
  creadoEn: string;
}

export interface EjecucionIngesta {
  id: string;
  deporte: Deporte;
  proveedor: string;
  estatus: "EN_CURSO" | "EXITOSA" | "FALLIDA";
  iniciadaEn: string;
  finalizadaEn: string | null;
  registrosProcesados: number;
  peticionesUsadas: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Equipos: forma (SL-27, implemented)
// ---------------------------------------------------------------------------

/**
 * GET /api/equipos/:id/forma. `forma` is one letter per recent finished game (G, E, P), oldest
 * first, e.g. "GPGEG". `partidos` lists the game ids in the same order as `forma`.
 */
export interface FormaEquipo {
  equipoId: string;
  forma: string;
  partidos: string[];
}
