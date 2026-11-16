import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation, useRoutes } from "react-router-dom";
import { vi } from "vitest";
import type { Tokens, TokenStore } from "../api/client";
import type { Usuario } from "../api/types";
import { routes } from "../app/routes";
import { AuthProvider } from "../auth/AuthProvider";

export const USUARIO: Usuario = {
  id: "u1",
  email: "ana@example.com",
  nombre: "Ana",
  rol: "USUARIO",
};

export const memoryTokens = (initial: Tokens | null = null): TokenStore => {
  let t = initial;
  return { get: () => t, set: (v) => (t = v) };
};

type Handler = (url: URL, init: RequestInit | undefined) => { status?: number; body?: unknown };

/** fetch fake: routes by pathname; unknown paths answer 404. */
export function fakeFetch(handlers: Record<string, Handler>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const h = handlers[`${init?.method ?? "GET"} ${url.pathname}`];
    const { status = 200, body = {} } = h
      ? h(url, init)
      : { status: 404, body: { error: { code: "NOT_FOUND", message: "no" } } };
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

let ultimaUbicacion = "";

/**
 * The real route tree through useRoutes + MemoryRouter. (A data router builds fetch Request
 * objects, and jsdom's AbortSignal is not the one Node's undici expects.)
 */
function App() {
  const location = useLocation();
  ultimaUbicacion = location.pathname;
  return useRoutes(routes);
}

/** Renders the real route tree at `path`, logged in unless `loggedIn` is false. */
export function renderApp(opts: { path: string; fetchFn: typeof fetch; loggedIn?: boolean }) {
  if (opts.loggedIn !== false) {
    window.localStorage.setItem("statline.usuario", JSON.stringify(USUARIO));
  }
  const tokens = memoryTokens(
    opts.loggedIn === false ? null : { accessToken: "a1", refreshToken: "r1" },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider tokens={tokens} fetchFn={opts.fetchFn}>
        <MemoryRouter initialEntries={[opts.path]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, tokens, location: () => ultimaUbicacion };
}
