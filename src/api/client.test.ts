import { describe, expect, it, vi } from "vitest";
import { fakeFetch, memoryTokens } from "../test/render";
import { ApiError, createApiClient, localTokenStore } from "./client";

describe("createApiClient", () => {
  it("adds the bearer token and drops empty query params", async () => {
    const fetchFn = fakeFetch({ "GET /api/ligas": () => ({ body: { data: [] } }) });
    const api = createApiClient({
      tokens: memoryTokens({ accessToken: "a1", refreshToken: "r1" }),
      fetchFn,
    });
    await api.get("/api/ligas", { deporte: "FUTBOL", q: "", page: undefined });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(String(url)).toBe("/api/ligas?deporte=FUTBOL");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer a1");
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    let llamadas = 0;
    const fetchFn = fakeFetch({
      "GET /api/jugadores": (_u, init) => {
        llamadas += 1;
        const auth = (init!.headers as Record<string, string>).Authorization;
        return auth === "Bearer a2" ? { body: { ok: true } } : { status: 401, body: {} };
      },
      "POST /api/auth/refresh": () => ({ body: { accessToken: "a2", refreshToken: "r2" } }),
    });
    const tokens = memoryTokens({ accessToken: "a1", refreshToken: "r1" });
    const api = createApiClient({ tokens, fetchFn });
    await expect(api.get("/api/jugadores")).resolves.toEqual({ ok: true });
    expect(llamadas).toBe(2);
    expect(tokens.get()).toEqual({ accessToken: "a2", refreshToken: "r2" });
  });

  it("clears the session when the refresh fails", async () => {
    const onSessionExpired = vi.fn();
    const fetchFn = fakeFetch({
      "GET /api/jugadores": () => ({
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "Token ausente o inválido" } },
      }),
      "POST /api/auth/refresh": () => ({ status: 401, body: {} }),
    });
    const tokens = memoryTokens({ accessToken: "a1", refreshToken: "r1" });
    const api = createApiClient({ tokens, fetchFn, onSessionExpired });
    await expect(api.get("/api/jugadores")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
    expect(tokens.get()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledOnce();
  });

  it("maps error bodies to ApiError and tolerates non-JSON errors", async () => {
    const fetchFn = vi.fn(async () => new Response("bad gateway", { status: 502 }));
    const api = createApiClient({ tokens: memoryTokens(), fetchFn });
    const err = await api.get("/api/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, code: "HTTP_ERROR" });
  });

  it("returns undefined on 204 and sends JSON bodies", async () => {
    const fetchFn = fakeFetch({ "POST /api/algo": () => ({ status: 204 }) });
    const api = createApiClient({ tokens: memoryTokens(), fetchFn });
    await expect(api.post("/api/algo", { a: 1 })).resolves.toBeUndefined();
    expect(fetchFn.mock.calls[0]![1]!.body).toBe('{"a":1}');
  });
});

describe("createApiClient write methods", () => {
  it("sends PUT and PATCH with a JSON body and the bearer token", async () => {
    const fetchFn = fakeFetch({
      "PUT /api/listas/l1": () => ({ body: { id: "l1", nombre: "Nueva" } }),
      "PATCH /api/alertas/a1": () => ({ body: { id: "a1", activa: false } }),
    });
    const api = createApiClient({
      tokens: memoryTokens({ accessToken: "a1", refreshToken: "r1" }),
      fetchFn,
    });
    await expect(api.put("/api/listas/l1", { nombre: "Nueva" })).resolves.toEqual({
      id: "l1",
      nombre: "Nueva",
    });
    await expect(api.patch("/api/alertas/a1", { activa: false })).resolves.toEqual({
      id: "a1",
      activa: false,
    });
    const [, putInit] = fetchFn.mock.calls[0]!;
    expect(putInit!.method).toBe("PUT");
    expect(putInit!.body).toBe('{"nombre":"Nueva"}');
    expect((putInit!.headers as Record<string, string>).Authorization).toBe("Bearer a1");
    expect(fetchFn.mock.calls[1]![1]!.method).toBe("PATCH");
  });

  it("sends DELETE without a body and resolves undefined on 204", async () => {
    const fetchFn = fakeFetch({ "DELETE /api/listas/l1/elementos/e1": () => ({ status: 204 }) });
    const api = createApiClient({ tokens: memoryTokens(), fetchFn });
    await expect(api.delete("/api/listas/l1/elementos/e1")).resolves.toBeUndefined();
    const [, init] = fetchFn.mock.calls[0]!;
    expect(init!.method).toBe("DELETE");
    expect(init!.body).toBeUndefined();
    expect((init!.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("refreshes and retries DELETE on 401 like any other method", async () => {
    let llamadas = 0;
    const fetchFn = fakeFetch({
      "DELETE /api/alertas/a1": (_u, init) => {
        llamadas += 1;
        const auth = (init!.headers as Record<string, string>).Authorization;
        return auth === "Bearer a2" ? { status: 204 } : { status: 401, body: {} };
      },
      "POST /api/auth/refresh": () => ({ body: { accessToken: "a2", refreshToken: "r2" } }),
    });
    const tokens = memoryTokens({ accessToken: "a1", refreshToken: "r1" });
    const api = createApiClient({ tokens, fetchFn });
    await expect(api.delete("/api/alertas/a1")).resolves.toBeUndefined();
    expect(llamadas).toBe(2);
  });
});

describe("localTokenStore", () => {
  it("round-trips tokens and clears them", () => {
    const store = localTokenStore("k");
    expect(store.get()).toBeNull();
    store.set({ accessToken: "a", refreshToken: "r" });
    expect(store.get()).toEqual({ accessToken: "a", refreshToken: "r" });
    store.set(null);
    expect(store.get()).toBeNull();
  });

  it("survives corrupt storage", () => {
    window.localStorage.setItem("k", "{no-json");
    expect(localTokenStore("k").get()).toBeNull();
  });
});
