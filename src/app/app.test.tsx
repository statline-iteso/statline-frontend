import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { fakeFetch, renderApp, USUARIO } from "../test/render";
import { shouldRetry } from "./query-client";

const LIGAS = {
  data: [
    {
      id: "l1",
      nombre: "Liga MX",
      deporte: "FUTBOL",
      pais: "México",
      temporada: "2026",
      activa: true,
    },
    {
      id: "l2",
      nombre: "NBA",
      deporte: "BASQUETBOL",
      pais: "USA",
      temporada: "2025-2026",
      activa: true,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 100,
};

const posiciones = (deporte: string) => ({
  ligaId: "l1",
  deporte,
  temporada: "2026",
  posiciones: [
    {
      posicion: 1,
      equipoId: "e1",
      equipo: { id: "e1", nombre: "América", abreviatura: "AME" },
      jugados: 2,
      ganados: 2,
      empatados: 0,
      perdidos: 0,
      diferencia: 3,
      puntos: 6,
      porcentaje: 1,
    },
  ],
});

describe("login", () => {
  it("redirects anonymous users to /login and back after signing in", async () => {
    const fetchFn = fakeFetch({
      "POST /api/auth/login": () => ({
        body: { accessToken: "a", refreshToken: "r", usuario: USUARIO },
      }),
      "GET /api/ligas": () => ({ body: LIGAS }),
      "GET /api/ligas/l1/posiciones": () => ({ body: posiciones("FUTBOL") }),
    });
    const { location } = renderApp({ path: "/ligas", fetchFn, loggedIn: false });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Correo"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "secreto123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Ligas" })).toBeInTheDocument();
    expect(location()).toBe("/ligas");
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("shows the API error on bad credentials", async () => {
    const fetchFn = fakeFetch({
      "POST /api/auth/login": () => ({
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "Credenciales inválidas" } },
      }),
    });
    renderApp({ path: "/login", fetchFn, loggedIn: false });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Correo"), "x@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "mala");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Credenciales inválidas");
  });

  it("logout returns to /login", async () => {
    const fetchFn = fakeFetch({ "GET /api/ligas": () => ({ body: { ...LIGAS, data: [] } }) });
    renderApp({ path: "/ligas", fetchFn });
    await userEvent.click(await screen.findByRole("button", { name: "Salir" }));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });
});

describe("ligas", () => {
  it("shows the first league's table and switches league", async () => {
    const fetchFn = fakeFetch({
      "GET /api/ligas": () => ({ body: LIGAS }),
      "GET /api/ligas/l1/posiciones": () => ({ body: posiciones("FUTBOL") }),
      "GET /api/ligas/l2/posiciones": () => ({
        body: { ...posiciones("BASQUETBOL"), ligaId: "l2", posiciones: [] },
      }),
    });
    renderApp({ path: "/", fetchFn });
    const tabla = await screen.findByRole("table");
    expect(within(tabla).getByText("América")).toBeInTheDocument();
    expect(within(tabla).getByText("Pts")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /NBA/ }));
    expect(await screen.findByText(/Aún no hay equipos/)).toBeInTheDocument();
  });

  it("shows an empty state and errors", async () => {
    const fetchFn = fakeFetch({
      "GET /api/ligas": () => ({
        status: 500,
        body: { error: { code: "INTERNAL", message: "Error interno" } },
      }),
    });
    renderApp({ path: "/ligas", fetchFn });
    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
  });
});

describe("partidos", () => {
  it("lists games for the selected date", async () => {
    const fetchFn = fakeFetch({
      "GET /api/partidos": (url) => ({
        body: {
          data:
            url.searchParams.get("fecha") === "2026-11-14"
              ? [
                  {
                    id: "p1",
                    ligaId: "l1",
                    fecha: "2026-11-14T02:00:00Z",
                    jornada: 17,
                    estatus: "FINALIZADO",
                    marcadorLocal: 2,
                    marcadorVisita: 1,
                    local: { id: "e1", nombre: "América", abreviatura: "AME" },
                    visita: { id: "e2", nombre: "Chivas", abreviatura: "GDL" },
                  },
                ]
              : [],
          total: 1,
          page: 1,
          pageSize: 50,
        },
      }),
    });
    renderApp({ path: "/partidos?fecha=2026-11-14", fetchFn });
    expect(await screen.findByText("Chivas")).toBeInTheDocument();
    expect(screen.getByText(/Jornada 17 · Final/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    const fetchFn = fakeFetch({
      "GET /api/partidos": () => ({ body: { data: [], total: 0, page: 1, pageSize: 50 } }),
    });
    renderApp({ path: "/partidos?fecha=2026-01-01", fetchFn });
    expect(await screen.findByText("No hay partidos en esta fecha.")).toBeInTheDocument();
  });
});

describe("jugadores", () => {
  const jugador = {
    id: "j1",
    nombre: "Nikola Jokic",
    deporte: "BASQUETBOL",
    posicion: "C",
    numero: 15,
    estatus: "LESIONADO",
    equipo: { id: "e9", nombre: "Denver Nuggets", abreviatura: "DEN" },
  };

  it("searches, filters by sport and opens the detail", async () => {
    const vistos: string[] = [];
    const fetchFn = fakeFetch({
      "GET /api/jugadores": (url) => {
        vistos.push(url.search);
        return { body: { data: [jugador], total: 1, page: 1, pageSize: 20 } };
      },
      "GET /api/jugadores/j1": () => ({ body: jugador }),
    });
    renderApp({ path: "/jugadores", fetchFn });
    expect(await screen.findByText("Nikola Jokic")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Deporte"), "BASQUETBOL");
    await user.type(screen.getByLabelText("Buscar por nombre"), "jok");
    await waitFor(() => expect(vistos.at(-1)).toContain("q=jok"));
    expect(vistos.at(-1)).toContain("deporte=BASQUETBOL");

    await user.click(screen.getByRole("link", { name: /Nikola Jokic/ }));
    expect(await screen.findByRole("heading", { name: "Nikola Jokic" })).toBeInTheDocument();
    expect(screen.getByText("Lesionado")).toBeInTheDocument();
    expect(screen.getByText("Denver Nuggets")).toBeInTheDocument();
  });

  it("shows 'Sin resultados'", async () => {
    const fetchFn = fakeFetch({
      "GET /api/jugadores": () => ({ body: { data: [], total: 0, page: 1, pageSize: 20 } }),
    });
    renderApp({ path: "/jugadores", fetchFn });
    expect(await screen.findByText("Sin resultados.")).toBeInTheDocument();
  });

  it("unknown routes show the 404 page", async () => {
    renderApp({ path: "/no-existe", fetchFn: fakeFetch({}) });
    expect(await screen.findByText("Página no encontrada")).toBeInTheDocument();
  });
});

describe("shouldRetry", () => {
  it("never retries 4xx and retries other errors twice", () => {
    expect(shouldRetry(0, new ApiError(404, "NOT_FOUND", "x"))).toBe(false);
    expect(shouldRetry(0, new ApiError(503, "DOWN", "x"))).toBe(true);
    expect(shouldRetry(2, new TypeError("network"))).toBe(false);
  });
});
