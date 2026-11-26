import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** Field-level details of a 400 VALIDATION_ERROR, as sent by the backend. */
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStore {
  get(): Tokens | null;
  set(tokens: Tokens | null): void;
}

export type Query = Record<string, string | number | undefined>;

export interface ApiClient {
  get<T>(path: string, query?: Query): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  /** Resolves with `undefined` on 204 No Content. */
  delete<T = void>(path: string): Promise<T>;
}

/**
 * Thin fetch wrapper. Adds the bearer token, and on a 401 tries POST /api/auth/refresh (or the
 * `refresh` option) once
 * (sharing one in-flight refresh between concurrent requests) before giving up and clearing
 * the session.
 */
export function createApiClient(opts: {
  baseUrl?: string;
  tokens: TokenStore;
  onSessionExpired?: () => void;
  fetchFn?: typeof fetch;
  /** Replaces POST /api/auth/refresh, e.g. a Cognito token refresh. Null: the session is over. */
  refresh?: () => Promise<Tokens | null>;
}): ApiClient {
  const baseUrl = opts.baseUrl ?? "";
  const doFetch = opts.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  let refreshing: Promise<boolean> | null = null;

  const url = (path: string, query?: Query) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    return `${baseUrl}${path}${s ? `?${s}` : ""}`;
  };

  const refresh = async (): Promise<boolean> => {
    const current = opts.tokens.get();
    if (!current) return false;
    if (opts.refresh) {
      const nuevos = await opts.refresh().catch(() => null);
      if (nuevos) opts.tokens.set(nuevos);
      return nuevos !== null;
    }
    const res = await doFetch(url("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) return false;
    opts.tokens.set((await res.json()) as Tokens);
    return true;
  };

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Query,
    retried = false,
  ): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const tokens = opts.tokens.get();
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await doFetch(url(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 && tokens && !retried && !path.startsWith("/api/auth/")) {
      refreshing ??= refresh().finally(() => {
        refreshing = null;
      });
      if (await refreshing) return request<T>(method, path, body, query, true);
      opts.tokens.set(null);
      opts.onSessionExpired?.();
    }

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(
        res.status,
        err?.error.code ?? "HTTP_ERROR",
        err?.error.message ?? `HTTP ${res.status}`,
        err?.error.details,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  };

  return {
    get: (path, query) => request("GET", path, undefined, query),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    patch: (path, body) => request("PATCH", path, body),
    delete: <T = void>(path: string) => request<T>("DELETE", path),
  };
}

/** localStorage-backed store. Every access is guarded: storage can be unavailable. */
export const localTokenStore = (key = "statline.tokens"): TokenStore => ({
  get() {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  },
  set(tokens) {
    try {
      if (tokens) window.localStorage.setItem(key, JSON.stringify(tokens));
      else window.localStorage.removeItem(key);
    } catch {
      /* private mode: the session lasts until reload */
    }
  },
});
