import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useApi } from "../auth/useAuth";
import type { ApiClient } from "./client";
import type { Boxscore, Deporte, Jugador, Liga, Paginado, Partido, Posiciones } from "./types";

/** Query keys in one place so mutations (and the ingestion refresh) can invalidate them. */
export const keys = {
  ligas: (deporte?: Deporte) => ["ligas", { deporte }] as const,
  posiciones: (ligaId: string) => ["ligas", ligaId, "posiciones"] as const,
  jugadores: (f: { q?: string; deporte?: Deporte; page: number }) => ["jugadores", f] as const,
  jugador: (id: string) => ["jugadores", id] as const,
  partidos: (f: { fecha?: string; page: number }) => ["partidos", f] as const,
  boxscore: (partidoId: string) => ["partidos", partidoId, "boxscore"] as const,
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
