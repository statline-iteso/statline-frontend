import { createContext } from "react";
import type { ApiClient } from "../api/client";
import type { Usuario } from "../api/types";
import type { ProveedorCognito } from "./cognito";

export interface AuthState {
  usuario: Usuario | null;
  api: ApiClient;
  login(email: string, password: string): Promise<void>;
  logout(): void;
  /** Set when the environment signs in through Cognito: sign-up and password reset pages use it. */
  cognito: ProveedorCognito | null;
}

export const AuthContext = createContext<AuthState | null>(null);
