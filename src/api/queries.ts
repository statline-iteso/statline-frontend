import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useApi } from "../auth/useAuth";
import type { ApiClient } from "./client";
import type {
  ActualizarAlerta,
  Alerta,
  Boxscore,
  CrearAlerta,
  Deporte,
  ElementoLista,
  EquipoRef,
  Jugador,
  Liga,
  ListaSeguimiento,
  Paginado,
  Partido,
  Posiciones,
} from "./types";

/** Query keys in one place so mutations (and the ingestion refresh) can invalidate them. */
export const keys = {
  ligas: (deporte?: Deporte) => ["ligas", { deporte }] as const,
  posiciones: (ligaId: string) => ["ligas", ligaId, "posiciones"] as const,
  jugadores: (f: { q?: string; deporte?: Deporte; page: number }) => ["jugadores", f] as const,
  jugador: (id: string) => ["jugadores", id] as const,
  partidos: (f: { fecha?: string; page: number }) => ["partidos", f] as const,
  boxscore: (partidoId: string) => ["partidos", partidoId, "boxscore"] as const,
  equipos: () => ["equipos"] as const,
  listas: (f: { page: number }) => ["listas", f] as const,
  lista: (id: string) => ["listas", id] as const,
  alertas: (f: { page: number }) => ["alertas", f] as const,
};

export function useLigas(deporte?: Deporte) {
  const api = useApi();
  return useQuery({
    queryKey: keys.ligas(deporte),
    queryFn: () => api.get<Paginado<Liga>>("/api/ligas", { deporte, pageSize: 100 }),
  });
}

export function usePosiciones(ligaId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: keys.posiciones(ligaId ?? ""),
    queryFn: () => api.get<Posiciones>(`/api/ligas/${ligaId}/posiciones`),
    enabled: Boolean(ligaId),
  });
}

export function useJugadores(f: { q?: string; deporte?: Deporte; page: number }) {
  const api = useApi();
  return useQuery({
    queryKey: keys.jugadores(f),
    queryFn: () => api.get<Paginado<Jugador>>("/api/jugadores", { ...f, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });
}

export function useJugador(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: keys.jugador(id),
    queryFn: () => api.get<Jugador>(`/api/jugadores/${id}`),
  });
}

export function usePartidos(f: { fecha?: string; page: number }) {
  const api = useApi();
  return useQuery({
    queryKey: keys.partidos(f),
    queryFn: () => api.get<Paginado<Partido>>("/api/partidos", { ...f, pageSize: 50 }),
    placeholderData: keepPreviousData,
  });
}

export function useBoxscore(partidoId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: keys.boxscore(partidoId ?? ""),
    queryFn: () => api.get<Boxscore>(`/api/partidos/${partidoId}/boxscore`),
    enabled: Boolean(partidoId),
  });
}

export function useEquipos() {
  const api = useApi();
  return useQuery({
    queryKey: keys.equipos(),
    // The backend has no name filter for equipos; a league has far fewer than 100 teams.
    queryFn: () => api.get<Paginado<EquipoRef>>("/api/equipos", { pageSize: 100 }),
  });
}

export function useListas(f: { page: number }) {
  const api = useApi();
  return useQuery({
    queryKey: keys.listas(f),
    queryFn: () => api.get<Paginado<ListaSeguimiento>>("/api/listas", { ...f, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });
}

/** GET /api/listas/:id, which includes `elementos`. */
export function useLista(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: keys.lista(id),
    queryFn: () => api.get<ListaSeguimiento>(`/api/listas/${id}`),
  });
}

export function useAlertas(f: { page: number }) {
  const api = useApi();
  return useQuery({
    queryKey: keys.alertas(f),
    queryFn: () => api.get<Paginado<Alerta>>("/api/alertas", { ...f, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });
}

/*
 * Writes. Lists invalidate the whole ["listas"] / ["alertas"] prefix; element changes only
 * refresh the list they belong to.
 */

export function useCrearLista() {
  return useApiMutation(
    (api, body: { nombre: string }) => api.post<ListaSeguimiento>("/api/listas", body),
    [["listas"]],
  );
}

export function useRenombrarLista() {
  return useApiMutation(
    (api, v: { id: string; nombre: string }) =>
      api.put<ListaSeguimiento>(`/api/listas/${v.id}`, { nombre: v.nombre }),
    [["listas"]],
  );
}

export function useEliminarLista() {
  return useApiMutation((api, id: string) => api.delete(`/api/listas/${id}`), [["listas"]]);
}

export function useAgregarElemento() {
  return useApiMutation(
    (api, v: { listaId: string; tipo: ElementoLista["tipo"]; refId: string }) =>
      api.post<ElementoLista>(`/api/listas/${v.listaId}/elementos`, {
        tipo: v.tipo,
        refId: v.refId,
      }),
    (v) => [keys.lista(v.listaId)],
  );
}

export function useQuitarElemento() {
  return useApiMutation(
    (api, v: { listaId: string; refId: string }) =>
      api.delete(`/api/listas/${v.listaId}/elementos/${v.refId}`),
    (v) => [keys.lista(v.listaId)],
  );
}

export function useCrearAlerta() {
  return useApiMutation(
    (api, body: CrearAlerta) => api.post<Alerta>("/api/alertas", body),
    [["alertas"]],
  );
}

export function useActualizarAlerta() {
  return useApiMutation(
    (api, v: { id: string; body: ActualizarAlerta }) =>
      api.put<Alerta>(`/api/alertas/${v.id}`, v.body),
    [["alertas"]],
  );
}

export function useEliminarAlerta() {
  return useApiMutation((api, id: string) => api.delete(`/api/alertas/${id}`), [["alertas"]]);
}

/**
 * Generic write hook: `fn` performs the request with the shared client, and on success the
 * given query keys (static or derived from the variables) are invalidated so screens refetch.
 *
 * @example
 * const crear = useApiMutation(
 *   (api, body: { nombre: string }) => api.post<ListaSeguimiento>("/api/listas", body),
 *   [["listas"]],
 * );
 */
export function useApiMutation<TVars, TData>(
  fn: (api: ApiClient, vars: TVars) => Promise<TData>,
  invalidate: QueryKey[] | ((vars: TVars) => QueryKey[]) = [],
) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => fn(api, vars),
    onSuccess: async (_data, vars) => {
      const claves = typeof invalidate === "function" ? invalidate(vars) : invalidate;
      await Promise.all(claves.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}
