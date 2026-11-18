import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { useApi } from "../auth/useAuth";
import { fakeFetch, memoryTokens } from "../test/render";
import {
  useApiMutation,
  useComparacion,
  useFormaEquipo,
  usePromedios,
  useTendencia,
} from "./queries";

function setup(fetchFn: typeof fetch) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        tokens={memoryTokens({ accessToken: "a1", refreshToken: "r1" })}
        fetchFn={fetchFn}
      >
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("useApiMutation", () => {
  it("runs the request with the shared client and invalidates static keys on success", async () => {
    const fetchFn = fakeFetch({
      "POST /api/listas": () => ({ status: 201, body: { id: "l1" } }),
    });
    const { queryClient, wrapper } = setup(fetchFn);
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () =>
        useApiMutation(
          (api, body: { nombre: string }) => api.post<{ id: string }>("/api/listas", body),
          [["listas"], ["alertas"]],
        ),
      { wrapper },
    );
    let data: { id: string } | undefined;
    await act(async () => {
      data = await result.current.mutateAsync({ nombre: "X" });
    });
    expect(data).toEqual({ id: "l1" });
    expect(fetchFn.mock.calls[0]![1]!.body).toBe('{"nombre":"X"}');
    expect(spy).toHaveBeenCalledWith({ queryKey: ["listas"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["alertas"] });
  });

  it("derives keys from the variables and refetches active queries", async () => {
    let lecturas = 0;
    const fetchFn = fakeFetch({
      "GET /api/listas/l1": () => ({ body: { n: ++lecturas } }),
      "DELETE /api/listas/l1": () => ({ status: 204 }),
    });
    const { wrapper } = setup(fetchFn);
    function Probe() {
      const api = useApi();
      const q = useQuery({ queryKey: ["listas", "l1"], queryFn: () => api.get("/api/listas/l1") });
      const m = useApiMutation(
        (api, id: string) => api.delete(`/api/listas/${id}`),
        (id) => [["listas", id]],
      );
      return <button onClick={() => m.mutate("l1")}>{q.isFetching ? "cargando" : "listo"}</button>;
    }
    render(<Probe />, { wrapper });
    await waitFor(() => expect(lecturas).toBe(1));
    await act(async () => screen.getByRole("button").click());
    await waitFor(() => expect(lecturas).toBe(2));
  });

  it("does not invalidate when the request fails", async () => {
    const fetchFn = fakeFetch({
      "DELETE /api/listas/l1": () => ({
        status: 500,
        body: { error: { code: "X", message: "m" } },
      }),
    });
    const { queryClient, wrapper } = setup(fetchFn);
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useApiMutation((api, id: string) => api.delete(`/api/listas/${id}`), [["listas"]]),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync("l1").catch(() => undefined);
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("jugadores y equipos queries", () => {
  const promedios = {
    jugador: { id: "j1", nombre: "N. Jokic", deporte: "BASQUETBOL", posicion: "C" },
    ultimos: 5,
    partidos: 5,
    minutosPromedio: 34,
    promedios: { puntos: 25.3 },
  };
  const tendencia = { jugadorId: "j1", metrica: "puntos", n: 10, serie: [] };
  const comparacion = {
    deporte: "BASQUETBOL",
    jugadores: [{ jugador: { id: "j1" }, partidos: 5, minutosPromedio: 34, promedios: {} }],
  };
  const forma = { equipoId: "e1", forma: "GPGEG", partidos: ["p5", "p4", "p3", "p2", "p1"] };

  it("usePromedios stays disabled without a player and sends the window when given", async () => {
    const fetchFn = fakeFetch({
      "GET /api/jugadores/j1/promedios": () => ({ body: promedios }),
    });
    const { wrapper } = setup(fetchFn);
    const sin = renderHook(() => usePromedios(undefined), { wrapper });
    expect(sin.result.current.fetchStatus).toBe("idle");
    expect(fetchFn).not.toHaveBeenCalled();

    const { result } = renderHook(() => usePromedios("j1", 5), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(String(fetchFn.mock.calls[0]![0])).toContain("/api/jugadores/j1/promedios?ultimos=5");
    expect(result.current.data?.partidos).toBe(5);
  });

  it("useTendencia needs both a player and a metric", async () => {
    const fetchFn = fakeFetch({
      "GET /api/jugadores/j1/tendencia": () => ({ body: tendencia }),
    });
    const { wrapper } = setup(fetchFn);
    renderHook(() => useTendencia("j1", undefined, 10), { wrapper });
    renderHook(() => useTendencia(undefined, "puntos", 10), { wrapper });
    expect(fetchFn).not.toHaveBeenCalled();

    const { result } = renderHook(() => useTendencia("j1", "puntos", 10), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = new URL(String(fetchFn.mock.calls[0]![0]), "http://localhost");
    expect(url.searchParams.get("metrica")).toBe("puntos");
    expect(url.searchParams.get("n")).toBe("10");
  });

  it("useComparacion is enabled only with 2 to 4 players", async () => {
    const fetchFn = fakeFetch({
      "GET /api/jugadores/comparar": () => ({ body: comparacion }),
    });
    const { wrapper } = setup(fetchFn);
    const uno = renderHook(() => useComparacion(["j1"]), { wrapper });
    const cinco = renderHook(() => useComparacion(["a", "b", "c", "d", "e"]), { wrapper });
    expect(uno.result.current.fetchStatus).toBe("idle");
    expect(cinco.result.current.fetchStatus).toBe("idle");
    expect(fetchFn).not.toHaveBeenCalled();

    const { result } = renderHook(() => useComparacion(["j1", "j2"]), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      new URL(String(fetchFn.mock.calls[0]![0]), "http://localhost").searchParams.get("ids"),
    ).toBe("j1,j2");
  });

  it("useFormaEquipo fetches the form of a team", async () => {
    const fetchFn = fakeFetch({
      "GET /api/equipos/e1/forma": () => ({ body: forma }),
    });
    const { wrapper } = setup(fetchFn);
    const sin = renderHook(() => useFormaEquipo(undefined), { wrapper });
    expect(sin.result.current.fetchStatus).toBe("idle");

    const { result } = renderHook(() => useFormaEquipo("e1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.forma).toBe("GPGEG");
  });
});
