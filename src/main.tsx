import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { createQueryClient } from "./app/query-client";
import { routes } from "./app/routes";
import { AuthProvider } from "./auth/AuthProvider";
import type { ProveedorCognito } from "./auth/cognito";
import { configCognito } from "./auth/config-cognito";
import { initSentry } from "./lib/sentry";
import "./index.css";

initSentry();

const router = createBrowserRouter(routes);

// Amplify is loaded only where the environment signs in through Cognito.
async function cargarCognito(): Promise<ProveedorCognito | null> {
  const cfg = configCognito();
  if (!cfg) return null;
  const { crearProveedorCognito } = await import("./auth/cognito");
  return crearProveedorCognito(cfg);
}

void cargarCognito().then((cognito) =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={createQueryClient()}>
        <AuthProvider cognito={cognito}>
          <Sentry.ErrorBoundary
            fallback={<p className="p-6">Algo salió mal. Recarga la página para continuar.</p>}
          >
            <RouterProvider router={router} />
          </Sentry.ErrorBoundary>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  ),
);
