import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Jugador, Promedios, Tendencia } from "../../api/types";
import { fakeFetch, renderApp } from "../../test/render";

const jokic: Jugador = {
  id: "j1",
  nombre: "N. Jokic",
  deporte: "BASQUETBOL",
  posicion: "C",
  numero: 15,
  estatus: "DISPONIBLE",
  equipo: { id: "e1", nombre: "Denver Nuggets", abreviatura: "DEN" },
};

const promedios: Promedios = {
  jugador: { id: "j1", nombre: "N. Jokic", deporte: "BASQUETBOL", posicion: "C" },
  ultimos: null,
  partidos: 12,
  minutosPromedio: 34.5,
  promedios: { puntos: 25.3, rebotes: 12, asistencias: null },
};

const tendencia: Tendencia = {
  jugadorId: "j1",
  metrica: "puntos",
  n: 10,
  serie: [
    { partidoId: "p1", fecha: "2026-11-01T02:00:00Z", valor: 22 },
    { partidoId: "p2", fecha: "2026-11-03T02:00:00Z", valor: 30 },
    { partidoId: "p3", fecha: "2026-11-05T02:00:00Z", valor: 25 },
  ],
};

function detalle(overrides: { promedios?: Promedios; tendencia?: Tendencia } = {}) {
  const pedidosTendencia: string[] = [];
  const fetchFn = fakeFetch({
    "GET /api/jugadores/j1": () => ({ body: jokic }),
    "GET /api/jugadores/j1/promedios": () => ({ body: overrides.promedios ?? promedios }),
    "GET /api/jugadores/j1/tendencia": (url) => {
      pedidosTendencia.push(url.searchParams.get("metrica") ?? "");
      return { body: overrides.tendencia ?? tendencia };
    },
  });
  return { fetchFn, pedidosTendencia };
}

describe("JugadorDetallePage", () => {
  it("shows the season averages with the sport's metrics", async () => {
    const { fetchFn } = detalle();
    renderApp({ path: "/jugadores/j1", fetchFn });

    const tabla = await screen.findByRole("table", { name: "Promedios por partido" });
    expect(within(tabla).getByRole("cell", { name: "25.3" })).toBeInTheDocument();
    expect(within(tabla).getByRole("cell", { name: "12" })).toBeInTheDocument();
    expect(within(tabla).getByRole("row", { name: /Asistencias/ })).toHaveTextContent("–");
    expect(screen.getByText("12 partidos · MIN 34.5")).toBeInTheDocument();
  });

  it("charts the trend of the selected metric and keeps it in the URL", async () => {
    const { fetchFn, pedidosTendencia } = detalle();
    renderApp({ path: "/jugadores/j1", fetchFn });

    const grafica = await screen.findByRole("img", { name: "Tendencia de Puntos" });
    expect(grafica.querySelector(".recharts-responsive-container")).toBeInTheDocument();
    expect(pedidosTendencia).toEqual(["puntos"]);

    await userEvent.selectOptions(screen.getByLabelText("Métrica"), "rebotes");
    expect(await screen.findByRole("img", { name: "Tendencia de Rebotes" })).toBeInTheDocument();
    expect(pedidosTendencia).toEqual(["puntos", "rebotes"]);
    expect(screen.getByLabelText("Métrica")).toHaveValue("rebotes");
  });

  it("links to the comparison with this player preselected", async () => {
    const { fetchFn } = detalle();
    renderApp({ path: "/jugadores/j1", fetchFn });
    await screen.findByRole("table", { name: "Promedios por partido" });
    const enlaces = screen.getAllByRole("link", { name: "Comparar" });
    expect(enlaces.map((a) => a.getAttribute("href"))).toContain("/comparar?ids=j1");
  });

  it("shows an empty state when the player has no finished games", async () => {
    const { fetchFn } = detalle({
      promedios: { ...promedios, partidos: 0, promedios: {} },
      tendencia: { ...tendencia, serie: [] },
    });
    renderApp({ path: "/jugadores/j1", fetchFn });
    expect(
      await screen.findByText(
        "Aún no hay partidos finalizados con estadísticas para este jugador.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText("Sin partidos finalizados para graficar.")).toBeInTheDocument();
  });

  it("shows an error when the averages cannot be loaded", async () => {
    const fetchFn = fakeFetch({
      "GET /api/jugadores/j1": () => ({ body: jokic }),
      "GET /api/jugadores/j1/promedios": () => ({
        status: 500,
        body: { error: { code: "INTERNAL", message: "Fallo al calcular promedios" } },
      }),
      "GET /api/jugadores/j1/tendencia": () => ({ body: tendencia }),
    });
    renderApp({ path: "/jugadores/j1", fetchFn });
    expect(await screen.findByRole("alert")).toHaveTextContent("Fallo al calcular promedios");
  });
});
