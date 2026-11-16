import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

/** Sends anonymous users to /login and brings them back to where they were. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const location = useLocation();
  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
