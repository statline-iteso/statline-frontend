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
