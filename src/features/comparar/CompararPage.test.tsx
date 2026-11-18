import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Comparacion, Jugador, Paginado } from "../../api/types";
import { fakeFetch, renderApp } from "../../test/render";

const jugador = (id: string, nombre: string): Jugador => ({
  id,
  nombre,
  deporte: "BASQUETBOL",
  posicion: "C",
  numero: null,
  estatus: "DISPONIBLE",
  equipo: { id: "e1", nombre: "Denver Nuggets", abreviatura: "DEN" },
});

const j1 = jugador("j1", "N. Jokic");
const j2 = jugador("j2", "LeBron James");

const comparacion: Comparacion = {
  deporte: "BASQUETBOL",
  jugadores: [
    {
      jugador: { id: "j1", nombre: "N. Jokic", deporte: "BASQUETBOL", posicion: "C" },
      partidos: 12,
      minutosPromedio: 34.5,
      promedios: { puntos: 25.3, rebotes: 12, masMenos: null },
    },
    {
      jugador: { id: "j2", nombre: "LeBron James", deporte: "BASQUETBOL", posicion: "F" },
      partidos: 10,
      minutosPromedio: 35,
      promedios: { puntos: 20, rebotes: 7, masMenos: 4 },
    },
  ],
};

const lista: Paginado<Jugador> = { data: [j1, j2], total: 2, page: 1, pageSize: 20 };

const fakeComparar = () =>
  fakeFetch({
    "GET /api/jugadores/comparar": () => ({ body: comparacion }),
    "GET /api/jugadores": () => ({ body: lista }),
  });

describe("CompararPage", () => {
  it("renders the radar and the raw averages table for two players", async () => {
    const fetchFn = fakeComparar();
    renderApp({ path: "/comparar?ids=j1,j2", fetchFn });

    const radar = await screen.findByRole("img", { name: "Radar de promedios por métrica" });
    expect(radar.querySelector(".recharts-responsive-container")).toBeInTheDocument();

    const tabla = screen.getByRole("table", { name: "Promedios comparados" });
    expect(within(tabla).getByRole("columnheader", { name: "N. Jokic" })).toBeInTheDocument();
    expect(within(tabla).getByRole("columnheader", { name: "LeBron James" })).toBeInTheDocument();
    expect(within(tabla).getByRole("cell", { name: "25.3" })).toBeInTheDocument();
    expect(within(tabla).getByRole("row", { name: /Puntos/ })).toHaveTextContent("20");
    // Metrics the API never returned are left out of the comparison entirely.
    expect(within(tabla).queryByRole("rowheader", { name: "Asistencias" })).not.toBeInTheDocument();
    expect(screen.getByText("Comparación · NBA")).toBeInTheDocument();
  });

  it("takes the selected ids from the URL", async () => {
    const fetchFn = fakeComparar();
    renderApp({ path: "/comparar?ids=j1,j2", fetchFn });
    await screen.findByRole("table", { name: "Promedios comparados" });
    const url = new URL(
      String(fetchFn.mock.calls.find(([u]) => String(u).includes("comparar"))![0]),
      "http://localhost",
    );
    expect(url.searchParams.get("ids")).toBe("j1,j2");
    expect(screen.getByRole("button", { name: "Quitar N. Jokic" })).toBeInTheDocument();
  });

  it("asks for at least two players and does not call the API with one", async () => {
    const fetchFn = fakeComparar();
    renderApp({ path: "/comparar?ids=j1", fetchFn });
    expect(
      await screen.findByText("Elige al menos 2 jugadores para comparar."),
    ).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([u]) => String(u).includes("comparar"))).toBe(false);
  });

  it("adds a player from the search and removes one from the selection", async () => {
    const fetchFn = fakeComparar();
    renderApp({ path: "/comparar?ids=j1", fetchFn });

    await userEvent.click(await screen.findByRole("button", { name: "Agregar LeBron James" }));
    await screen.findByRole("table", { name: "Promedios comparados" });
    const pedidos = fetchFn.mock.calls
      .filter(([u]) => String(u).includes("/comparar"))
      .map(([u]) => new URL(String(u), "http://localhost").searchParams.get("ids"));
    expect(pedidos).toContain("j1,j2");

    await userEvent.click(screen.getByRole("button", { name: "Quitar LeBron James" }));
    expect(
      await screen.findByText("Elige al menos 2 jugadores para comparar."),
    ).toBeInTheDocument();
  });

  it("shows the API error for a 400 response", async () => {
    const fetchFn = fakeFetch({
      "GET /api/jugadores/comparar": () => ({
        status: 400,
        body: {
          error: { code: "VALIDATION", message: "Los jugadores deben ser del mismo deporte" },
        },
      }),
      "GET /api/jugadores": () => ({ body: lista }),
    });
    renderApp({ path: "/comparar?ids=j1,j2", fetchFn });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Los jugadores deben ser del mismo deporte",
    );
    expect(screen.queryByRole("img", { name: "Radar de promedios por métrica" })).toBeNull();
  });

  it("explains that five players are too many", async () => {
    const fetchFn = fakeComparar();
    renderApp({ path: "/comparar?ids=a,b,c,d,e", fetchFn });
    expect(await screen.findByRole("alert")).toHaveTextContent("hasta 4 jugadores");
    expect(fetchFn.mock.calls.some(([u]) => String(u).includes("comparar"))).toBe(false);
  });
});

describe("CompararPage sport and signed metrics", () => {
  it("filters the search by the sport of the first selected player", async () => {
    const fetchFn = fakeFetch({
      "GET /api/jugadores/j1": () => ({ body: j1 }),
      "GET /api/jugadores": () => ({ body: lista }),
    });
    renderApp({ path: "/comparar?ids=j1", fetchFn });
    await screen.findByRole("button", { name: "Quitar N. Jokic" });
    await vi.waitFor(() =>
      expect(fetchFn.mock.calls.some(([u]) => String(u).includes("deporte=BASQUETBOL"))).toBe(true),
    );
  });

  it("keeps negative metrics out of the radar but in the table", async () => {
    const neg: Comparacion = {
      ...comparacion,
      jugadores: comparacion.jugadores.map((j) => ({
        ...j,
        promedios: { puntos: 10, rebotes: 5, asistencias: 3, masMenos: -4 },
      })),
    };
    const fetchFn = fakeFetch({
      "GET /api/jugadores/comparar": () => ({ body: neg }),
      "GET /api/jugadores": () => ({ body: lista }),
    });
    renderApp({ path: "/comparar?ids=j1,j2", fetchFn });
    const tabla = await screen.findByRole("table", { name: "Promedios comparados" });
    expect(within(tabla).getByRole("rowheader", { name: "+/-" })).toBeInTheDocument();
    expect(screen.getByText(/solo aparecen en la tabla/)).toBeInTheDocument();
  });
});
