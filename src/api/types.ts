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
