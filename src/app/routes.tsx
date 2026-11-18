import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { Cargando } from "../components/ui";
import { Layout } from "./Layout";
import { NoEncontrado } from "./NoEncontrado";

// Every screen is its own chunk.
const LoginPage = lazy(() =>
  import("../features/login/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const LigasPage = lazy(() =>
  import("../features/ligas/LigasPage").then((m) => ({ default: m.LigasPage })),
);
const PartidosPage = lazy(() =>
  import("../features/partidos/PartidosPage").then((m) => ({ default: m.PartidosPage })),
);
const JugadoresPage = lazy(() =>
  import("../features/jugadores/JugadoresPage").then((m) => ({ default: m.JugadoresPage })),
);
const BoxscorePage = lazy(() =>
  import("../features/partidos/BoxscorePage").then((m) => ({ default: m.BoxscorePage })),
);
const JugadorDetallePage = lazy(() =>
  import("../features/jugadores/JugadorDetallePage").then((m) => ({
    default: m.JugadorDetallePage,
  })),
);

const s = (node: ReactNode) => <Suspense fallback={<Cargando />}>{node}</Suspense>;

export const routes: RouteObject[] = [
  { path: "/login", element: s(<LoginPage />) },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    errorElement: <NoEncontrado />,
    children: [
      { index: true, element: <Navigate to="/ligas" replace /> },
      { path: "ligas", element: s(<LigasPage />) },
      { path: "partidos", element: s(<PartidosPage />) },
      { path: "partidos/:id", element: s(<BoxscorePage />) },
      { path: "jugadores", element: s(<JugadoresPage />) },
      { path: "jugadores/:id", element: s(<JugadorDetallePage />) },
      // TODO(SL-45..SL-47): comparar, pronosticos, listas, alertas.
      { path: "*", element: <NoEncontrado /> },
    ],
  },
];
