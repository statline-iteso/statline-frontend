import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { createApiClient, localTokenStore, type TokenStore } from "../api/client";
import type { LoginResponse, Usuario } from "../api/types";
import { AuthContext, type AuthState } from "./auth-context";
import type { ProveedorCognito } from "./cognito";

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
  /** Cognito mode (statline-infra D-47); omitted: the api's own login. */
  cognito?: ProveedorCognito | null;
}) {
  const cognito = props.cognito ?? null;
  const queryClient = useQueryClient();
  const [tokens] = useState(() => props.tokens ?? localTokenStore());
  const [usuario, setUsuario] = useState<Usuario | null>(() =>
    tokens.get() ? leerUsuario() : null,
  );

  const cerrar = useCallback(() => {
    if (cognito) void cognito.cerrarSesion();
    tokens.set(null);
    guardarUsuario(null);
    setUsuario(null);
    queryClient.clear();
  }, [tokens, queryClient, cognito]);

  const api = useMemo(
    () =>
      createApiClient({
        tokens,
        onSessionExpired: cerrar,
        fetchFn: props.fetchFn,
        // Cognito: Amplify keeps the refresh token; the api gets the ID token as the bearer.
        refresh: cognito
          ? async () => {
              const t = await cognito.idToken(true);
              return t ? { accessToken: t, refreshToken: "" } : null;
            }
          : undefined,
      }),
    [tokens, cerrar, props.fetchFn, cognito],
  );

  const value = useMemo<AuthState>(
    () => ({
      usuario,
      api,
      cognito,
      async login(email, password) {
        if (cognito) {
          const idToken = await cognito.iniciarSesion(email, password);
          tokens.set({ accessToken: idToken, refreshToken: "" });
          // Our id and role live in the api (backend D-41); the first call also creates the row.
          const u = await api.get<Usuario>("/api/usuarios/me");
          const usuario = { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol };
          guardarUsuario(usuario);
          setUsuario(usuario);
          return;
        }
        const r = await api.post<LoginResponse>("/api/auth/login", { email, password });
        tokens.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
        guardarUsuario(r.usuario);
        setUsuario(r.usuario);
      },
      logout: cerrar,
    }),
    [usuario, api, tokens, cerrar, cognito],
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}
