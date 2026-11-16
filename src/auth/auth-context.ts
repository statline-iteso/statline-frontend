import { createContext } from "react";
import type { ApiClient } from "../api/client";
import type { Usuario } from "../api/types";

export interface AuthState {
  usuario: Usuario | null;
  api: ApiClient;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

export const AuthContext = createContext<AuthState | null>(null);
