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
const RegistroPage = lazy(() =>
  import("../features/login/RegistroPage").then((m) => ({ default: m.RegistroPage })),
);
const RecuperarPage = lazy(() =>
  import("../features/login/RecuperarPage").then((m) => ({ default: m.RecuperarPage })),
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
const PronosticosPage = lazy(() =>
  import("../features/pronosticos/PronosticosPage").then((m) => ({
    default: m.PronosticosPage,
  })),
);
const BoxscorePage = lazy(() =>
  import("../features/partidos/BoxscorePage").then((m) => ({ default: m.BoxscorePage })),
);
const JugadorDetallePage = lazy(() =>
  import("../features/jugadores/JugadorDetallePage").then((m) => ({
    default: m.JugadorDetallePage,
  })),
);
const ListasPage = lazy(() =>
  import("../features/listas/ListasPage").then((m) => ({ default: m.ListasPage })),
);
const ListaDetallePage = lazy(() =>
  import("../features/listas/ListaDetallePage").then((m) => ({ default: m.ListaDetallePage })),
);
const AlertasPage = lazy(() =>
  import("../features/alertas/AlertasPage").then((m) => ({ default: m.AlertasPage })),
);

const UsuariosPage = lazy(() =>
  import("../features/usuarios/UsuariosPage").then((m) => ({ default: m.UsuariosPage })),
);

const CompararPage = lazy(() =>
  import("../features/comparar/CompararPage").then((m) => ({ default: m.CompararPage })),
);

const s = (node: ReactNode) => <Suspense fallback={<Cargando />}>{node}</Suspense>;

export const routes: RouteObject[] = [
  { path: "/login", element: s(<LoginPage />) },
  { path: "/registro", element: s(<RegistroPage />) },
  { path: "/recuperar", element: s(<RecuperarPage />) },
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
      { path: "comparar", element: s(<CompararPage />) },
      { path: "pronosticos", element: s(<PronosticosPage />) },
      { path: "listas", element: s(<ListasPage />) },
      { path: "listas/:id", element: s(<ListaDetallePage />) },
      { path: "alertas", element: s(<AlertasPage />) },
      { path: "usuarios", element: s(<UsuariosPage />) },
      { path: "*", element: <NoEncontrado /> },
    ],
  },
];
