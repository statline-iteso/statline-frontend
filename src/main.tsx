import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { createQueryClient } from "./app/query-client";
import { routes } from "./app/routes";
import { AuthProvider } from "./auth/AuthProvider";
import { initSentry } from "./lib/sentry";
import "./index.css";

initSentry();

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <Sentry.ErrorBoundary
          fallback={<p className="p-6">Algo salió mal. Recarga la página para continuar.</p>}
        >
          <RouterProvider router={router} />
        </Sentry.ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
