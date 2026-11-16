import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { createApiClient, localTokenStore, type TokenStore } from "../api/client";
import type { LoginResponse, Usuario } from "../api/types";
import { AuthContext, type AuthState } from "./auth-context";

const USER_KEY = "statline.usuario";

function leerUsuario(): Usuario | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

function guardarUsuario(u: Usuario | null) {
  try {
    if (u) window.localStorage.setItem(USER_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider(props: {
  children: ReactNode;
  tokens?: TokenStore;
  fetchFn?: typeof fetch;
}) {
  const queryClient = useQueryClient();
  const [tokens] = useState(() => props.tokens ?? localTokenStore());
  const [usuario, setUsuario] = useState<Usuario | null>(() =>
    tokens.get() ? leerUsuario() : null,
  );

  const cerrar = useCallback(() => {
    tokens.set(null);
    guardarUsuario(null);
    setUsuario(null);
    queryClient.clear();
  }, [tokens, queryClient]);

  const api = useMemo(
    () => createApiClient({ tokens, onSessionExpired: cerrar, fetchFn: props.fetchFn }),
    [tokens, cerrar, props.fetchFn],
  );

  const value = useMemo<AuthState>(
    () => ({
      usuario,
      api,
      async login(email, password) {
        const r = await api.post<LoginResponse>("/api/auth/login", { email, password });
        tokens.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
        guardarUsuario(r.usuario);
        setUsuario(r.usuario);
      },
      logout: cerrar,
    }),
    [usuario, api, tokens, cerrar],
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}
