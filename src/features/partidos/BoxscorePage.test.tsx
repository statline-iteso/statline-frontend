import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Boxscore, EstadisticaLinea, Partido } from "../../api/types";
import { fakeFetch, renderApp } from "../../test/render";

const partido: Partido = {
  id: "p1",
  ligaId: "l1",
  fecha: "2026-11-14T02:00:00Z",
  jornada: 17,
  estatus: "FINALIZADO",
  marcadorLocal: 118,
  marcadorVisita: 111,
  local: { id: "e1", nombre: "Denver Nuggets", abreviatura: "DEN" },
  visita: { id: "e2", nombre: "Los Angeles Lakers", abreviatura: "LAL" },
};

function linea(
  id: string,
  nombre: string,
  equipoId: string,
  deporte: EstadisticaLinea["deporte"],
  metricas: EstadisticaLinea["metricas"],
): EstadisticaLinea {
  return {
    id,
    partidoId: "p1",
    jugadorId: `j-${id}`,
    equipoId,
    deporte,
    minutos: 36,
    metricas,
    jugador: { id: `j-${id}`, nombre, posicion: "C" },
  };
}

const boxscore: Boxscore = {
  partido,
  local: [
    linea("l1", "N. Jokic", "e1", "BASQUETBOL", { puntos: 31, rebotes: 14, asistencias: 11 }),
    linea("l2", "J. Murray", "e1", "BASQUETBOL", { puntos: 18, rebotes: 4, asistencias: 6 }),
  ],
  visita: [
    linea("v1", "LeBron James", "e2", "BASQUETBOL", { puntos: 25, rebotes: 7, asistencias: 9 }),
  ],
};

const boxscoreFor = (b: Boxscore) =>
  fakeFetch({ "GET /api/partidos/p1/boxscore": () => ({ body: b }) });

describe("boxscore", () => {
  it("renders the score, one stats table per team and the leaders chart", async () => {
    renderApp({ path: "/partidos/p1", fetchFn: boxscoreFor(boxscore) });

    const tabla = await screen.findByRole("table", { name: "Estadísticas de Denver Nuggets" });
    expect(within(tabla).getByRole("columnheader", { name: "PTS" })).toBeInTheDocument();
    expect(within(tabla).getByRole("rowheader", { name: "N. Jokic" })).toBeInTheDocument();
    expect(within(tabla).getByRole("cell", { name: "31" })).toBeInTheDocument();

    const visita = screen.getByRole("table", { name: "Estadísticas de Los Angeles Lakers" });
    expect(within(visita).getByRole("rowheader", { name: "LeBron James" })).toBeInTheDocument();

    expect(screen.getByText("118")).toBeInTheDocument();
    expect(screen.getByText("111")).toBeInTheDocument();
    expect(screen.getByText(/Jornada 17 · Final/)).toBeInTheDocument();

    const grafica = screen.getByRole("img", { name: "Líderes en Puntos" });
    expect(grafica.querySelector(".recharts-responsive-container")).toBeInTheDocument();
    expect(within(grafica).getByText("N. Jokic (DEN)")).toBeInTheDocument();
  });

  it("changes the leaders metric from the selector and keeps it in the URL", async () => {
    renderApp({ path: "/partidos/p1", fetchFn: boxscoreFor(boxscore) });
    await screen.findByRole("table", { name: "Estadísticas de Denver Nuggets" });

    await userEvent.selectOptions(screen.getByLabelText("Métrica"), "rebotes");
    expect(screen.getByRole("img", { name: "Líderes en Rebotes" })).toBeInTheDocument();
    expect(screen.getByLabelText("Métrica")).toHaveValue("rebotes");
  });

  it("reads nested NFL metrics", async () => {
    const nfl: Boxscore = {
      ...boxscore,
      partido: { ...partido, marcadorLocal: null, marcadorVisita: null, estatus: "PROGRAMADO" },
      local: [
        linea("a1", "P. Mahomes", "e1", "AMERICANO", {
          pase: { completos: 20, intentos: 30, yardas: 280, touchdowns: 2 },
        }),
      ],
      visita: [],
    };
    renderApp({ path: "/partidos/p1", fetchFn: boxscoreFor(nfl) });

    const tabla = await screen.findByRole("table", { name: "Estadísticas de Denver Nuggets" });
    expect(within(tabla).getByRole("columnheader", { name: "Yds pase" })).toBeInTheDocument();
    expect(within(tabla).getByRole("cell", { name: "280" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Métrica"), "pase.yardas");
    expect(screen.getByRole("img", { name: "Líderes en Yardas por pase" })).toBeInTheDocument();
    expect(screen.getByText("Sin estadísticas para este equipo.")).toBeInTheDocument();
  });

  it("shows loading, error and empty states", async () => {
    const pendiente = vi.fn(() => new Promise<Response>(() => {}));
    const { unmount } = renderApp({ path: "/partidos/p1", fetchFn: pendiente });
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    unmount();

    const conError = fakeFetch({
      "GET /api/partidos/p1/boxscore": () => ({
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "Partido no encontrado" } },
      }),
    });
    renderApp({ path: "/partidos/p1", fetchFn: conError });
    expect(await screen.findByRole("alert")).toHaveTextContent("Partido no encontrado");

    const sinLineas = boxscoreFor({ partido, local: [], visita: [] });
    renderApp({ path: "/partidos/p1", fetchFn: sinLineas });
    expect(
      await screen.findByText("Aún no hay estadísticas de jugadores para este partido."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("partidos list link", () => {
  it("opens the boxscore of a game from the day's list", async () => {
    const fetchFn = fakeFetch({
      "GET /api/partidos": () => ({
        body: { data: [partido], total: 1, page: 1, pageSize: 50 },
      }),
      "GET /api/partidos/p1/boxscore": () => ({ body: boxscore }),
    });
    const { location } = renderApp({ path: "/partidos?fecha=2026-11-14", fetchFn });

    await userEvent.click(await screen.findByRole("link", { name: "Ver boxscore" }));
    expect(await screen.findByRole("img", { name: "Líderes en Puntos" })).toBeInTheDocument();
    expect(location()).toBe("/partidos/p1");
  });
});
