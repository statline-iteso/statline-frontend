import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { useApi } from "../auth/useAuth";
import { fakeFetch, memoryTokens } from "../test/render";
import { useApiMutation } from "./queries";

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
